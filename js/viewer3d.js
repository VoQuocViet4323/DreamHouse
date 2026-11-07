// js/viewer3d.js
// Khởi tạo và điều khiển mô hình 3D với Three.js & GLTFLoader
// Hỗ trợ cả file .glb thật từ Supabase Storage lẫn khối 3D parametric dựng bằng code
// Tích hợp: Căn giữa tâm sàn tự động, DoubleSide vật liệu nội thất, Mở khóa Zoom cận cảnh nội thất và Di chuyển (Pan) đa chiều.

class House3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentMeshGroup = null;
        this.animFrameId = null;
        this.isSupported = this.checkWebGLSupport();
        
        // Trạng thái thao tác chuột / cảm ứng
        this.dragMode = 'none'; // 'rotate' | 'pan'
        this.prevMousePos = { x: 0, y: 0 };
        this.touchStartDist = 0;
        this.prevTouchCenter = { x: 0, y: 0 };

        this.spherical = { radius: 24, phi: Math.PI / 3, theta: Math.PI / 4 };
        this.target = new THREE.Vector3(0, 3, 0);
        this.initialTarget = new THREE.Vector3(0, 3, 0);
        this.initialRadius = 24;

        if (this.isSupported && this.container) {
            this.init();
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    init() {
        if (!this.container || typeof THREE === 'undefined') return;

        const width = this.container.clientWidth || 450;
        const height = this.container.clientHeight || 350;

        // 1. Khung cảnh & Camera (near = 0.05 để xem rõ cận cảnh chi tiết nội thất phòng)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf4f5f7);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 1000);
        this.updateCameraPosition();

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // 3. Ánh sáng tự nhiên và đổ bóng
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 1.15);
        dirLight.position.set(25, 45, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xbad2e8, 0.45);
        fillLight.position.set(-25, 20, -25);
        this.scene.add(fillLight);

        // Đèn bổ sung dịu nhẹ soi sáng nội thất bên trong khi zoom vào phòng
        const interiorLight = new THREE.PointLight(0xffeedd, 0.5, 30);
        interiorLight.position.set(0, 3.5, 0);
        this.scene.add(interiorLight);

        // 4. Lưới nền sân đất tinh tế, rộng rãi bao quát
        const groundGeo = new THREE.PlaneGeometry(80, 80);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0xe8ecf0, 
            roughness: 0.9, 
            metalness: 0.05 
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(70, 35, 0xd0d7de, 0xe1e4e8);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // 5. Điều khiển xoay chuột / Pan di chuyển / Zoom không giới hạn
        this.setupInteractions();

        // 6. Vòng lặp render
        const animate = () => {
            this.animFrameId = requestAnimationFrame(animate);
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();

        // 7. Tự động co giãn theo khung
        window.addEventListener('resize', () => this.handleResize());
    }

    updateCameraPosition() {
        const x = this.target.x + this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
        const y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
        const z = this.target.z + this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.target);
    }

    panCamera(deltaX, deltaY) {
        if (!this.camera) return;
        const vRight = new THREE.Vector3();
        const vUp = new THREE.Vector3();
        this.camera.matrixWorld.extractBasis(vRight, vUp, new THREE.Vector3());

        // Độ nhạy pan thích ứng theo cự ly zoom (ở gần di chuyển tinh tế, ở xa di chuyển nhanh)
        const factor = Math.max(0.002, this.spherical.radius * 0.0016);
        this.target.addScaledVector(vRight, -deltaX * factor);
        this.target.addScaledVector(vUp, deltaY * factor);
        this.updateCameraPosition();
    }

    rotateCamera(deltaX, deltaY) {
        this.spherical.theta -= deltaX * 0.008;
        this.spherical.phi -= deltaY * 0.008;
        // Giới hạn phi từ sát mặt đất (0.05 rad) đến góc ngước (1.52 rad) để không bị lật nhào
        this.spherical.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, this.spherical.phi));
        this.updateCameraPosition();
    }

    setupInteractions() {
        const dom = this.renderer.domElement;

        // Chặn menu chuột phải mặc định trên canvas để dùng làm phím Pan
        dom.addEventListener('contextmenu', (e) => e.preventDefault());

        // --- SỰ KIỆN CHUỘT ---
        dom.addEventListener('mousedown', (e) => {
            // Chuột phải (button 2) hoặc Giữ Shift + Chuột trái => PAN (Di chuyển tâm nhìn)
            if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
                this.dragMode = 'pan';
            } else if (e.button === 0) {
                this.dragMode = 'rotate';
            }
            this.prevMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (this.dragMode === 'none') return;
            const deltaX = e.clientX - this.prevMousePos.x;
            const deltaY = e.clientY - this.prevMousePos.y;

            if (this.dragMode === 'rotate') {
                this.rotateCamera(deltaX, deltaY);
            } else if (this.dragMode === 'pan') {
                this.panCamera(deltaX, deltaY);
            }

            this.prevMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.dragMode = 'none';
        });

        // --- SỰ KIỆN CẢM ỨNG (MOBILE & TABLET) ---
        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.dragMode = 'rotate';
                this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                this.dragMode = 'touch_multi';
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDist = Math.hypot(dx, dy);
                this.prevTouchCenter = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                };
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this.dragMode === 'rotate' && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - this.prevMousePos.x;
                const deltaY = e.touches[0].clientY - this.prevMousePos.y;
                this.rotateCamera(deltaX, deltaY);
                this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (this.dragMode === 'touch_multi' && e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const distDelta = dist - this.touchStartDist;
                
                const zoomFactor = Math.max(0.04, this.spherical.radius * 0.015);
                this.spherical.radius -= distDelta * zoomFactor;
                this.spherical.radius = Math.max(0.1, Math.min(100, this.spherical.radius));
                this.touchStartDist = dist;

                // Two-finger pan
                const curCenter = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                };
                const pDeltaX = curCenter.x - this.prevTouchCenter.x;
                const pDeltaY = curCenter.y - this.prevTouchCenter.y;
                this.panCamera(pDeltaX, pDeltaY);
                this.prevTouchCenter = curCenter;
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.dragMode = 'none';
        });

        // --- CUỘN CHUỘT THU PHÓNG (MỞ KHÓA ZOOM SÁT NỘI THẤT) ---
        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            // Hệ số cuộn thích ứng với khoảng cách hiện tại (vào trong phòng bước nhảy nhỏ, ra ngoài bước nhảy vừa)
            const zoomFactor = Math.max(0.1, this.spherical.radius * 0.08);
            const delta = Math.sign(e.deltaY) * zoomFactor;

            this.spherical.radius += delta;
            // Mở khoá bán kính tối thiểu xuống 0.1m thay vì bị chặn ở 8m -> người dùng có thể lọt vào bên trong nhà ngắm phòng
            this.spherical.radius = Math.max(0.1, Math.min(100, this.spherical.radius));
            this.updateCameraPosition();
        }, { passive: false });
    }

    setCameraPreset(viewName) {
        // Trả tâm nhìn về tâm chính của ngôi nhà
        this.target.copy(this.initialTarget);
        this.spherical.radius = this.initialRadius;

        switch (viewName) {
            case 'front': // Mặt tiền
                this.spherical.theta = 0;
                this.spherical.phi = Math.PI / 2.2;
                break;
            case 'side': // Góc bên
                this.spherical.theta = Math.PI / 3;
                this.spherical.phi = Math.PI / 2.3;
                break;
            case 'top': // Nhìn từ trên cao xuống
                this.spherical.theta = Math.PI / 4;
                this.spherical.phi = 0.25;
                break;
            case 'reset':
            default: // Góc phối cảnh tiêu chuẩn
                this.spherical.theta = Math.PI / 4;
                this.spherical.phi = Math.PI / 3;
                break;
        }
        this.updateCameraPosition();
    }

    handleResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // Nạp mẫu: Nếu có file .glb thì nạp thật, nếu không có thì sinh khối parametric
    loadModel(template) {
        if (!this.isSupported) return;

        // Xoá mô hình cũ
        if (this.currentMeshGroup) {
            this.scene.remove(this.currentMeshGroup);
            this.currentMeshGroup = null;
        }

        const statusEl = document.getElementById('viewer-status-text');

        if (template.model_path && template.model_path.trim() !== '') {
            const modelUrl = template.model_path.trim();
            const cleanUrl = modelUrl.split('?')[0].split('#')[0].toLowerCase();

            if (cleanUrl.endsWith('.glb') || cleanUrl.endsWith('.gltf')) {
                // Nạp file .glb/.gltf tương thích Three.js
                if (statusEl) statusEl.textContent = 'Đang tải mô hình 3D .glb từ máy chủ...';
                this.loadGLTF(modelUrl, statusEl, template);
            } else if (cleanUrl.endsWith('.obj')) {
                // Nạp file .obj trực tiếp từ SketchUp Export
                if (statusEl) statusEl.textContent = 'Đang tải mô hình 3D .obj từ máy chủ...';
                this.loadOBJ(modelUrl, statusEl, template);
            } else {
                // File SketchUp (.skp) hoặc CAD khác: Hiển thị mô phỏng 3D tham số thực tế và cung cấp link tải
                if (statusEl) {
                    statusEl.innerHTML = `📦 <em>Mô phỏng 3D kích thước thực (File SketchUp .skp đã lưu trữ).</em> <a href="${modelUrl}" target="_blank" download style="color:#d97706; text-decoration:underline; margin-left:6px; font-weight:600;">Tải file .skp gốc</a>`;
                }
                this.buildProceduralHouse(template);
            }
        } else {
            // Dựng khối 3D tạm bằng thông số
            if (statusEl) {
                statusEl.textContent = window.i18n ? window.i18n.t('status_fallback_3d') : 'Mô phỏng 3D kích thước thực tế';
            }
            this.buildProceduralHouse(template);
        }
    }

    loadGLTF(url, statusEl, fallbackTemplate) {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader chưa được nạp, chuyển sang khối dựng mô phỏng');
            if (fallbackTemplate) this.buildProceduralHouse(fallbackTemplate);
            return;
        }
        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                this.currentMeshGroup = gltf.scene;
                this.currentMeshGroup.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Bật DoubleSide cho vật liệu để khi zoom vào trong phòng, tường và trần không bị tàng hình
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => {
                                    mat.side = THREE.DoubleSide;
                                });
                            } else {
                                child.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });

                // 1. Tính toán bounding box nguyên bản của mô hình
                const initialBox = new THREE.Box3().setFromObject(this.currentMeshGroup);
                const initialCenter = initialBox.getCenter(new THREE.Vector3());

                // 2. CĂN CHÍNH GIỮA: Dời toạ độ model sao cho tâm X-Z về chính xác (0,0), đáy tiếp đất y = 0
                this.currentMeshGroup.position.x -= initialCenter.x;
                this.currentMeshGroup.position.z -= initialCenter.z;
                this.currentMeshGroup.position.y -= initialBox.min.y;

                this.scene.add(this.currentMeshGroup);
                if (statusEl) statusEl.textContent = '';
                
                // 3. Tính lại bounding box sau khi đã căn giữa
                const adjustedBox = new THREE.Box3().setFromObject(this.currentMeshGroup);
                const adjustedSize = adjustedBox.getSize(new THREE.Vector3());
                const adjustedCenter = adjustedBox.getCenter(new THREE.Vector3());

                this.initialTarget.copy(adjustedCenter);
                this.target.copy(adjustedCenter);

                const maxDim = Math.max(adjustedSize.x, adjustedSize.y, adjustedSize.z);
                this.initialRadius = Math.max(10, maxDim * 1.8);
                this.spherical.radius = this.initialRadius;
                this.updateCameraPosition();
            },
            undefined,
            (err) => {
                console.error('Lỗi khi nạp file GLB:', err);
                if (statusEl) statusEl.textContent = 'Không đọc được file 3D. Chuyển sang mô hình khối.';
                if (fallbackTemplate) this.buildProceduralHouse(fallbackTemplate);
            }
        );
    }

    loadOBJ(url, statusEl, fallbackTemplate) {
        if (typeof THREE.OBJLoader === 'undefined') {
            console.warn('OBJLoader chưa được nạp, chuyển sang khối dựng mô phỏng');
            if (fallbackTemplate) this.buildProceduralHouse(fallbackTemplate);
            return;
        }
        const loader = new THREE.OBJLoader();
        loader.load(
            url,
            (obj) => {
                this.currentMeshGroup = obj;
                this.currentMeshGroup.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Phủ vật liệu bóng đẹp nếu vật liệu mặc định trống
                        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xe0e6ed,
                                roughness: 0.5,
                                metalness: 0.1,
                                side: THREE.DoubleSide
                            });
                        } else {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => { mat.side = THREE.DoubleSide; });
                            } else {
                                child.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });

                // Căn chính giữa sàn
                const initialBox = new THREE.Box3().setFromObject(this.currentMeshGroup);
                const initialCenter = initialBox.getCenter(new THREE.Vector3());

                this.currentMeshGroup.position.x -= initialCenter.x;
                this.currentMeshGroup.position.z -= initialCenter.z;
                this.currentMeshGroup.position.y -= initialBox.min.y;

                this.scene.add(this.currentMeshGroup);
                if (statusEl) statusEl.textContent = '';

                const adjustedBox = new THREE.Box3().setFromObject(this.currentMeshGroup);
                const adjustedSize = adjustedBox.getSize(new THREE.Vector3());
                const adjustedCenter = adjustedBox.getCenter(new THREE.Vector3());

                this.initialTarget.copy(adjustedCenter);
                this.target.copy(adjustedCenter);

                const maxDim = Math.max(adjustedSize.x, adjustedSize.y, adjustedSize.z);
                this.initialRadius = Math.max(10, maxDim * 1.8);
                this.spherical.radius = this.initialRadius;
                this.updateCameraPosition();
            },
            undefined,
            (err) => {
                console.error('Lỗi khi nạp file OBJ:', err);
                if (statusEl) statusEl.textContent = 'Không đọc được file OBJ. Chuyển sang mô hình khối.';
                if (fallbackTemplate) this.buildProceduralHouse(fallbackTemplate);
            }
        );
    }

    // DỰNG KHỐI 3D THẬT THEO THÔNG SỐ (Rộng, Sâu, Số tầng, Kiểu mái, Ban công)
    buildProceduralHouse(template) {
        const group = new THREE.Group();
        const width = parseFloat(template.width_m) || 5.0;
        const depth = parseFloat(template.depth_m) || 14.0;
        const floors = parseInt(template.floors, 10) || 1;
        const floorHeight = 3.3; // Mỗi tầng cao 3.3m tiêu chuẩn
        const totalHeight = floors * floorHeight;
        const roofType = template.roof || 'flat';
        const hasBalcony = !!template.has_balcony;

        // Vật liệu xây dựng kiến trúc biên tập (Trắng hiện đại, Gỗ ấm, Kính phản chiếu)
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xfdfdfd,
            roughness: 0.6,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x24292e,
            roughness: 0.4,
            side: THREE.DoubleSide
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x4f7c9e,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x2b3137, // Xám than ngói
            roughness: 0.8,
            side: THREE.DoubleSide
        });

        // 1. Thân các tầng
        for (let f = 0; f < floors; f++) {
            const floorY = f * floorHeight + floorHeight / 2;
            
            // Khối tầng chính
            const floorGeo = new THREE.BoxGeometry(width, floorHeight - 0.1, depth);
            const floorMesh = new THREE.Mesh(floorGeo, wallMat);
            floorMesh.position.set(0, floorY, 0);
            floorMesh.castShadow = true;
            floorMesh.receiveShadow = true;
            group.add(floorMesh);

            // Cửa kính lớn mặt tiền (tầng nào cũng có)
            const windowW = width * 0.65;
            const windowH = floorHeight * 0.6;
            const winGeo = new THREE.BoxGeometry(windowW, windowH, 0.2);
            const winMesh = new THREE.Mesh(winGeo, glassMat);
            winMesh.position.set(0, floorY, depth / 2 + 0.05);
            group.add(winMesh);

            // Viền khung cửa nhôm xingfa đen
            const frameGeo = new THREE.BoxGeometry(windowW + 0.1, windowH + 0.1, 0.1);
            const frameMesh = new THREE.Mesh(frameGeo, darkTrimMat);
            frameMesh.position.set(0, floorY, depth / 2 + 0.02);
            group.add(frameMesh);

            // Ban công ở các tầng trên (từ tầng 2 trở lên nếu has_balcony = true)
            if (f > 0 && hasBalcony) {
                const balcDepth = 1.4;
                const balcBaseGeo = new THREE.BoxGeometry(width * 0.9, 0.2, balcDepth);
                const balcBase = new THREE.Mesh(balcBaseGeo, darkTrimMat);
                balcBase.position.set(0, f * floorHeight + 0.1, depth / 2 + balcDepth / 2);
                balcBase.castShadow = true;
                group.add(balcBase);

                // Lan can kính cường lực
                const balcGlassGeo = new THREE.BoxGeometry(width * 0.9, 1.0, 0.05);
                const balcGlass = new THREE.Mesh(balcGlassGeo, glassMat);
                balcGlass.position.set(0, f * floorHeight + 0.6, depth / 2 + balcDepth);
                group.add(balcGlass);
            }

            // Thanh trang trí phân tầng
            const lineGeo = new THREE.BoxGeometry(width + 0.4, 0.18, depth + 0.4);
            const lineMesh = new THREE.Mesh(lineGeo, darkTrimMat);
            lineMesh.position.set(0, (f + 1) * floorHeight, 0);
            lineMesh.castShadow = true;
            group.add(lineMesh);
        }

        // 2. Kiểu Mái (Flat / Hip / Gable)
        const roofBaseY = totalHeight;

        if (roofType === 'hip') {
            // Mái Nhật (Kim tự tháp vát 4 chiều)
            const roofH = Math.min(width, depth) * 0.35;
            const hipGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.72, roofH, 4);
            hipGeo.rotateY(Math.PI / 4);
            const hipMesh = new THREE.Mesh(hipGeo, roofMat);
            hipMesh.position.set(0, roofBaseY + roofH / 2, 0);
            hipMesh.scale.set(width / Math.max(width, depth) * 1.15, 1, depth / Math.max(width, depth) * 1.15);
            hipMesh.castShadow = true;
            group.add(hipMesh);
        } else if (roofType === 'gable') {
            // Mái Thái / Mái Dốc chữ A
            const roofH = width * 0.45;
            const prismGeo = new THREE.CylinderGeometry(0.1, width * 0.55, roofH, 3);
            prismGeo.rotateZ(Math.PI / 2);
            prismGeo.rotateX(Math.PI / 2);
            const gableMesh = new THREE.Mesh(prismGeo, roofMat);
            gableMesh.position.set(0, roofBaseY + roofH / 2, 0);
            gableMesh.scale.set(1, 1, (depth + 1.2) / (width * 0.55));
            gableMesh.castShadow = true;
            group.add(gableMesh);
        } else {
            // Mái bằng phẳng (Flat roof) + Lan can sân thượng tum thang
            const roofBorderGeo = new THREE.BoxGeometry(width + 0.2, 0.9, depth + 0.2);
            const roofBorder = new THREE.Mesh(roofBorderGeo, wallMat);
            roofBorder.position.set(0, roofBaseY + 0.45, 0);
            roofBorder.castShadow = true;
            group.add(roofBorder);

            // Tum thang sân thượng
            const tumGeo = new THREE.BoxGeometry(width * 0.45, 2.4, depth * 0.35);
            const tum = new THREE.Mesh(tumGeo, wallMat);
            tum.position.set(0, roofBaseY + 1.2, -depth * 0.15);
            tum.castShadow = true;
            group.add(tum);
        }

        // Căn chỉnh tâm toạ độ về giữa đáy nhà
        this.currentMeshGroup = group;
        this.scene.add(this.currentMeshGroup);

        this.initialTarget.set(0, totalHeight / 2, 0);
        this.target.set(0, totalHeight / 2, 0);
        this.initialRadius = Math.max(width, depth, totalHeight) * 2.1;
        this.spherical.radius = this.initialRadius;
        this.updateCameraPosition();
    }
}

window.House3DViewer = House3DViewer;
