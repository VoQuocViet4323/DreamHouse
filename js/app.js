// js/app.js
// Quản lý trạng thái ứng dụng, xác thực Supabase, lưu trữ yêu thích, render giao diện và liên hệ

class DreamHouseApp {
    constructor() {
        this.templates = [];
        this.currentTemplate = null;
        this.favorites = new Set();
        this.currentUser = null;
        this.currentProfile = null;
        this.viewer3D = null;
        this.activeFilter = {
            type: 'all',
            search: '',
            sort: 'default',
            onlyFavorites: false
        };

        this.init();
    }

    async init() {
        this.loadLocalFavorites();
        this.setupAuth();
        this.setupUIEvents();
        await this.loadTemplates();
        this.renderGallery();

        // Khởi tạo 3D viewer khi DOM sẵn sàng
        setTimeout(() => {
            if (document.getElementById('threejs-canvas-wrapper')) {
                this.viewer3D = new House3DViewer('threejs-canvas-wrapper');
            }
        }, 100);

        // Lắng nghe sự kiện đổi ngôn ngữ để render lại chữ động
        window.addEventListener('languageChanged', () => {
            this.renderGallery();
            if (this.currentTemplate) {
                this.updateDetailPanelContent(this.currentTemplate);
            }
            this.updateAuthUI();
        });
    }

    // 1. SUPABASE CLIENT
    getSupabase() {
        return window.APP_CONFIG ? window.APP_CONFIG.getClient() : null;
    }

    // 2. YÊU THÍCH (Lưu tạm localStorage & Đồng bộ khi đăng nhập)
    loadLocalFavorites() {
        try {
            const raw = localStorage.getItem('dream_house_favs');
            if (raw) {
                const arr = JSON.parse(raw);
                this.favorites = new Set(arr);
            }
        } catch (e) {
            console.error('Lỗi khi đọc favorites từ localStorage:', e);
        }
    }

    saveLocalFavorites() {
        localStorage.setItem('dream_house_favs', JSON.stringify(Array.from(this.favorites)));
    }

    async toggleFavorite(templateId) {
        const isFav = this.favorites.has(templateId);
        if (isFav) {
            this.favorites.delete(templateId);
        } else {
            this.favorites.add(templateId);
        }
        this.saveLocalFavorites();

        // Nếu đã đăng nhập, đồng bộ ngay với Supabase
        const client = this.getSupabase();
        if (client && this.currentUser) {
            if (isFav) {
                await client.from('favorites').delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('template_id', templateId);
            } else {
                await client.from('favorites').insert({
                    user_id: this.currentUser.id,
                    template_id: templateId
                });
            }
        }

        this.renderGallery();
        this.updateDetailFavButton();
    }

    async syncFavoritesWithSupabase() {
        const client = this.getSupabase();
        if (!client || !this.currentUser) return;

        try {
            // Lấy danh sách favorites từ DB
            const { data, error } = await client
                .from('favorites')
                .select('template_id')
                .eq('user_id', this.currentUser.id);

            if (!error && data) {
                // Thêm các mẫu từ DB vào local
                data.forEach(row => this.favorites.add(row.template_id));

                // Đẩy các mẫu lưu tạm trên máy lên DB
                const inserts = Array.from(this.favorites).map(tId => ({
                    user_id: this.currentUser.id,
                    template_id: tId
                }));

                if (inserts.length > 0) {
                    await client.from('favorites').upsert(inserts, { onConflict: 'user_id,template_id' });
                }
                this.saveLocalFavorites();
                this.renderGallery();
            }
        } catch (e) {
            console.error('Lỗi khi đồng bộ favorites:', e);
        }
    }

    // 3. AUTH VỚI SUPABASE (Email, Mật khẩu, Google OAuth)
    async setupAuth() {
        const client = this.getSupabase();
        if (!client) {
            this.updateAuthUI();
            return;
        }

        // Lấy session hiện tại
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
            this.currentUser = session.user;
            await this.loadUserProfile();
            await this.syncFavoritesWithSupabase();
        }

        // Lắng nghe trạng thái Auth thay đổi (Đăng nhập, đăng xuất, OAuth callback)
        client.auth.onAuthStateChange(async (event, session) => {
            if (session && session.user) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                await this.syncFavoritesWithSupabase();
            } else {
                this.currentUser = null;
                this.currentProfile = null;
            }
            this.updateAuthUI();
        });
    }

    async loadUserProfile() {
        const client = this.getSupabase();
        if (!client || !this.currentUser) return;

        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        if (!error && data) {
            this.currentProfile = data;
        }
    }

    async loginWithGoogle() {
        const client = this.getSupabase();
        if (!client) {
            alert('Supabase chưa được cấu hình. Vui lòng cập nhật js/config.js');
            return;
        }
        const { error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) alert(error.message);
    }

    async loginWithEmail(email, password) {
        const client = this.getSupabase();
        if (!client) {
            alert('Supabase chưa được cấu hình trong js/config.js');
            return;
        }
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Đăng nhập thất bại: ' + error.message);
        } else {
            this.closeAuthModal();
        }
    }

    async registerWithEmail(email, password, fullName) {
        const client = this.getSupabase();
        if (!client) return;
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        if (error) {
            alert('Đăng ký thất bại: ' + error.message);
        } else {
            alert('Đăng ký thành công! Hãy kiểm tra hòm thư email để xác nhận tài khoản.');
            this.closeAuthModal();
        }
    }

    async resetPassword(email) {
        const client = this.getSupabase();
        if (!client) return;
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });
        if (error) {
            alert('Lỗi: ' + error.message);
        } else {
            alert('Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!');
        }
    }

    async logout() {
        const client = this.getSupabase();
        if (client) {
            await client.auth.signOut();
        }
        this.currentUser = null;
        this.currentProfile = null;
        this.updateAuthUI();
    }

    // 4. NẠP DỮ LIỆU TEMPLATES (TỪ SUPABASE HOẶC FALLBACK DỮ LIỆU BAN ĐẦU)
    async loadTemplates() {
        const client = this.getSupabase();
        if (client) {
            try {
                const { data, error } = await client
                    .from('templates')
                    .select('*')
                    .eq('published', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    this.templates = data;
                    return;
                }
            } catch (e) {
                console.warn('Không thể kết nối Supabase, chuyển sang dữ liệu mẫu offline:', e);
            }
        }

        // Dữ liệu mẫu dự phòng ban đầu nếu chưa kết nối cơ sở dữ liệu
        this.templates = [
            {
                id: 'np-01',
                slug: 'nha-pho-hien-dai-np01',
                type: 'nha-pho',
                name_vi: 'Nhà Phố Hiện Đại 3 Tầng Mặt Tiền 5m',
                name_en: '3-Story Modern Townhouse (5m Frontage)',
                description_vi: 'Thiết kế tối ưu ánh sáng tự nhiên với giếng trời trung tâm, ban công kính và lam chắn nắng thông minh.',
                description_en: 'Optimized for natural daylight with a central skylight, glass railings, and elegant sun louvers.',
                style_vi: 'Hiện đại tối giản',
                style_en: 'Modern Minimalist',
                width_m: 5.0,
                depth_m: 16.0,
                floors: 3,
                roof: 'flat',
                has_balcony: true,
                rooms_vi: '1 PK, 1 Bếp, 3 PN, 3 WC, 1 Phòng thờ, Sân thượng',
                rooms_en: '1 Living, 1 Kitchen, 3 Beds, 3 Baths, 1 Altar room, Terrace',
                gfa_m2: 220,
                cost_estimate_vnd: 1850000000,
                photo_path: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 1
            },
            {
                id: 'np-02',
                slug: 'nha-pho-mai-thai-np02',
                type: 'nha-pho',
                name_vi: 'Nhà Phố Mái Thái Sang Trọng 2 Tầng',
                name_en: '2-Story Gable Roof Townhouse',
                description_vi: 'Kiến trúc mái dốc thanh lịch, đối lưu không khí cực tốt, phù hợp khí hậu nhiệt đới nắng mưa nhiều.',
                description_en: 'Graceful gable roofline providing excellent airflow and thermal comfort in tropical climates.',
                style_vi: 'Mái Thái Á Đông',
                style_en: 'Asian Gable',
                width_m: 6.0,
                depth_m: 15.0,
                floors: 2,
                roof: 'gable',
                has_balcony: true,
                rooms_vi: '1 PK, 1 Bếp, 3 PN, 2 WC, Gara xe',
                rooms_en: '1 Living, 1 Kitchen, 3 Beds, 2 Baths, Car garage',
                gfa_m2: 170,
                cost_estimate_vnd: 1450000000,
                photo_path: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 2
            },
            {
                id: 'bt-01',
                slug: 'biet-thu-vuon-bt01',
                type: 'biet-thu',
                name_vi: 'Biệt Thự Vườn Nghỉ Dưỡng Mái Nhật',
                name_en: 'Japanese Hip Roof Garden Villa',
                description_vi: 'Không gian mở chan hoà cùng sân vườn rộng rãi, hồ cá Koi và hiên uống trà thư giãn cuối tuần.',
                description_en: 'Open-concept layout integrating landscaped gardens, a Koi pond, and serene outdoor veranda.',
                style_vi: 'Biệt thự vườn sinh thái',
                style_en: 'Eco Garden Villa',
                width_m: 12.0,
                depth_m: 18.0,
                floors: 2,
                roof: 'hip',
                has_balcony: true,
                rooms_vi: '1 Đại sảnh, 1 Bếp & Ăn, 4 PN Master, 4 WC, Phòng sinh hoạt chung',
                rooms_en: '1 Great Hall, 1 Kitchen & Dining, 4 Master Suites, 4 Baths, Family Lounge',
                gfa_m2: 380,
                cost_estimate_vnd: 3400000000,
                photo_path: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 3
            },
            {
                id: 'bt-02',
                slug: 'biet-thu-tan-co-dien-bt02',
                type: 'biet-thu',
                name_vi: 'Biệt Thự Tân Cổ Điển Châu Âu 3 Tầng',
                name_en: '3-Story Neo-Classical European Villa',
                description_vi: 'Đường phào chỉ sắc sảo, vòm cột Corinthian bề thế khẳng định đẳng cấp gia chủ.',
                description_en: 'Refined moldings and stately classical columns reflecting timeless grandeur and architectural prestige.',
                style_vi: 'Tân cổ điển',
                style_en: 'Neo-Classical',
                width_m: 10.0,
                depth_m: 16.0,
                floors: 3,
                roof: 'hip',
                has_balcony: true,
                rooms_vi: '1 Phòng khách lớn, Bếp đảo, 5 PN, 5 WC, Hầm rượu & Cigar',
                rooms_en: '1 Grand Parlor, Island Kitchen, 5 Beds, 5 Baths, Wine & Cigar Lounge',
                gfa_m2: 420,
                cost_estimate_vnd: 4800000000,
                photo_path: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 4
            },
            {
                id: 'nc-01',
                slug: 'nha-cap-4-mai-nhat-nc01',
                type: 'nha-cap-4',
                name_vi: 'Nhà Cấp 4 Mái Nhật Tiện Nghi Tiết Kiệm',
                name_en: 'Modern 1-Story Hip Roof Country House',
                description_vi: 'Mẫu nhà 1 tầng kinh tế, bố trí công năng liên hoàn ấm cúng cho gia đình trẻ hoặc bố mẹ an dưỡng.',
                description_en: 'Cost-effective single-level home with a continuous warm flow, ideal for countryside retreat.',
                style_vi: 'Ngoại ô hiện đại',
                style_en: 'Modern Countryside',
                width_m: 8.5,
                depth_m: 14.0,
                floors: 1,
                roof: 'hip',
                has_balcony: false,
                rooms_vi: '1 PK kết hợp P.Thờ, 1 Bếp, 3 PN, 2 WC',
                rooms_en: '1 Living + Altar, 1 Kitchen, 3 Beds, 2 Baths',
                gfa_m2: 115,
                cost_estimate_vnd: 850000000,
                photo_path: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 5
            },
            {
                id: 'nc-02',
                slug: 'nha-cap-4-chu-l-nc02',
                type: 'nha-cap-4',
                name_vi: 'Nhà Cấp 4 Chữ L Mái Thái Truyền Thống',
                name_en: 'Traditional L-Shaped Country Bungalow',
                description_vi: 'Dáng nhà chữ L quen thuộc tạo khoảng sân trước thoáng đãng đậu xe và tổ chức tiệc BBQ gia đình.',
                description_en: 'Classic L-shaped layout creating an expansive courtyard for parking and outdoor gatherings.',
                style_vi: 'Mái dốc truyền thống',
                style_en: 'Traditional Gable',
                width_m: 9.0,
                depth_m: 15.0,
                floors: 1,
                roof: 'gable',
                has_balcony: false,
                rooms_vi: '1 PK, 1 Bếp & Ăn, 3 PN, 2 WC, Sân phơi',
                rooms_en: '1 Living, 1 Kitchen & Dining, 3 Beds, 2 Baths, Laundry Yard',
                gfa_m2: 125,
                cost_estimate_vnd: 920000000,
                photo_path: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
                model_path: '',
                published: true,
                sort_order: 6
            }
        ];
    }

    // 5. GỬI YÊU CẦU TƯ VẤN (INQUIRIES)
    async submitInquiry(formData) {
        const client = this.getSupabase();
        const payload = {
            name: formData.name,
            contact: formData.contact,
            message: formData.message,
            template_id: formData.template_id || null,
            lang: window.i18n.getLang(),
            user_id: this.currentUser ? this.currentUser.id : null,
            status: 'new'
        };

        if (client) {
            const { error } = await client.from('inquiries').insert([payload]);
            if (error) throw error;
        } else {
            console.log('Chưa kết nối Supabase, mô phỏng lưu inquiry:', payload);
        }
        return true;
    }

    // 6. RENDER GIAO DIỆN THƯ VIỆN (GALLERY)
    renderGallery() {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        const lang = window.i18n.getLang();
        let list = [...this.templates];

        // Lọc theo loại nhà
        if (this.activeFilter.type !== 'all') {
            list = list.filter(t => t.type === this.activeFilter.type);
        }

        // Lọc theo từ khoá tìm kiếm
        if (this.activeFilter.search) {
            const q = this.activeFilter.search.toLowerCase();
            list = list.filter(t => {
                const name = (lang === 'vi' ? t.name_vi : t.name_en).toLowerCase();
                const style = (lang === 'vi' ? t.style_vi : t.style_en).toLowerCase();
                return name.includes(q) || style.includes(q);
            });
        }

        // Lọc chỉ mục yêu thích
        if (this.activeFilter.onlyFavorites) {
            list = list.filter(t => this.favorites.has(t.id));
        }

        // Sắp xếp
        if (this.activeFilter.sort === 'price_asc') {
            list.sort((a, b) => a.cost_estimate_vnd - b.cost_estimate_vnd);
        } else if (this.activeFilter.sort === 'price_desc') {
            list.sort((a, b) => b.cost_estimate_vnd - a.cost_estimate_vnd);
        } else if (this.activeFilter.sort === 'area_desc') {
            list.sort((a, b) => b.gfa_m2 - a.gfa_m2);
        }

        if (list.length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <p>${window.i18n.t('empty_gallery')}</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = list.map(item => {
            const name = lang === 'vi' ? item.name_vi : item.name_en;
            const style = lang === 'vi' ? item.style_vi : item.style_en;
            const costStr = window.i18n.formatCost(item.cost_estimate_vnd);
            const isFav = this.favorites.has(item.id);

            return `
                <article class="house-card" data-id="${item.id}">
                    <div class="card-thumb">
                        <img src="${item.photo_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'}" 
                             alt="${name}" loading="lazy" />
                        <span class="card-badge">${style || item.type}</span>
                        <button class="card-fav-btn ${isFav ? 'active' : ''}" 
                                data-fav-id="${item.id}" 
                                aria-label="Favorite" 
                                title="${window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add')}">
                            ${isFav ? '★' : '☆'}
                        </button>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${name}</h3>
                        <div class="card-specs">
                            <span><strong>${window.i18n.t('spec_size')}:</strong> ${item.width_m}m × ${item.depth_m}m</span>
                            <span><strong>${window.i18n.t('spec_floors')}:</strong> ${item.floors}</span>
                            <span><strong>${window.i18n.t('spec_gfa')}:</strong> ${item.gfa_m2} m²</span>
                        </div>
                        <div class="card-footer">
                            <div class="card-price">
                                <span class="price-label">${window.i18n.t('spec_estimate')}:</span>
                                <span class="price-val">${costStr}</span>
                            </div>
                            <button class="btn-detail" data-open-detail="${item.id}">
                                ${window.i18n.t('btn_view_detail')} →
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Gắn sự kiện click mở detail và nút yêu thích
        gallery.querySelectorAll('[data-open-detail]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-open-detail');
                this.openDetailPanel(id);
            });
        });

        gallery.querySelectorAll('.house-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-fav-btn')) return;
                const id = card.getAttribute('data-id');
                this.openDetailPanel(id);
            });
        });

        gallery.querySelectorAll('.card-fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-fav-id');
                this.toggleFavorite(id);
            });
        });
    }

    // 7. PANEL CHI TIẾT MẪU NHÀ (PHOTO + 3D VIEWER + THÔNG SỐ)
    openDetailPanel(templateId) {
        const item = this.templates.find(t => t.id === templateId);
        if (!item) return;

        this.currentTemplate = item;
        const panel = document.getElementById('detail-modal');
        if (!panel) return;

        this.updateDetailPanelContent(item);
        panel.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Nạp mô hình 3D
        if (this.viewer3D) {
            setTimeout(() => {
                this.viewer3D.handleResize();
                this.viewer3D.loadModel(item);
            }, 150);
        }
    }

    closeDetailPanel() {
        const panel = document.getElementById('detail-modal');
        if (panel) panel.classList.add('hidden');
        document.body.style.overflow = '';
    }

    navigateTemplate(direction) {
        if (!this.currentTemplate) return;
        const index = this.templates.findIndex(t => t.id === this.currentTemplate.id);
        if (index === -1) return;

        let nextIndex = index + direction;
        if (nextIndex < 0) nextIndex = this.templates.length - 1;
        if (nextIndex >= this.templates.length) nextIndex = 0;

        this.openDetailPanel(this.templates[nextIndex].id);
    }

    updateDetailPanelContent(item) {
        const lang = window.i18n.getLang();
        const name = lang === 'vi' ? item.name_vi : item.name_en;
        const desc = lang === 'vi' ? item.description_vi : item.description_en;
        const rooms = lang === 'vi' ? item.rooms_vi : item.rooms_en;
        const style = lang === 'vi' ? item.style_vi : item.style_en;
        const roofText = window.i18n.t(`roof_${item.roof}`) || item.roof;

        document.getElementById('detail-title').textContent = name;
        document.getElementById('detail-desc').textContent = desc || '';
        document.getElementById('detail-photo').src = item.photo_path || '';
        document.getElementById('detail-photo').alt = name;

        // Bảng thông số kỹ thuật
        document.getElementById('detail-spec-size').textContent = `${item.width_m}m × ${item.depth_m}m`;
        document.getElementById('detail-spec-floors').textContent = `${item.floors}`;
        document.getElementById('detail-spec-gfa').textContent = `${item.gfa_m2} m²`;
        document.getElementById('detail-spec-roof').textContent = roofText;
        document.getElementById('detail-spec-balcony').textContent = item.has_balcony 
            ? window.i18n.t('balcony_yes') 
            : window.i18n.t('balcony_no');
        document.getElementById('detail-spec-rooms').textContent = rooms || '-';
        document.getElementById('detail-spec-price').textContent = window.i18n.formatCost(item.cost_estimate_vnd);

        this.updateDetailFavButton();
    }

    updateDetailFavButton() {
        const btn = document.getElementById('detail-fav-btn');
        if (!btn || !this.currentTemplate) return;
        const isFav = this.favorites.has(this.currentTemplate.id);
        btn.textContent = window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add');
        btn.classList.toggle('active', isFav);
    }

    // 8. ĐIỀU KHIỂN SỰ KIỆN GIAO DIỆN CHUNG
    setupUIEvents() {
        // Nút chuyển đổi ngày - đêm (Day–night sky switch 021)
        this.setupThemeToggle();

        // Nút đổi ngôn ngữ
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                window.i18n.toggle();
            });
        }

        // Bộ lọc Loại nhà
        const typeSelect = document.getElementById('filter-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.activeFilter.type = e.target.value;
                this.renderGallery();
            });
        }

        // Bộ lọc sắp xếp
        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.activeFilter.sort = e.target.value;
                this.renderGallery();
            });
        }

        // Tìm kiếm từ khoá
        const searchInput = document.getElementById('filter-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.activeFilter.search = e.target.value;
                this.renderGallery();
            });
        }

        // Checkbox chỉ xem yêu thích
        const favCheckbox = document.getElementById('filter-fav-only');
        if (favCheckbox) {
            favCheckbox.addEventListener('change', (e) => {
                this.activeFilter.onlyFavorites = e.target.checked;
                this.renderGallery();
            });
        }

        // Đóng panel chi tiết
        const closeDetail = document.getElementById('close-detail-modal');
        if (closeDetail) {
            closeDetail.addEventListener('click', () => this.closeDetailPanel());
        }

        // Phím Esc đóng modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDetailPanel();
                this.closeAuthModal();
            }
        });

        // Nút Next / Prev mẫu nhà trong panel
        document.getElementById('detail-prev-btn')?.addEventListener('click', () => this.navigateTemplate(-1));
        document.getElementById('detail-next-btn')?.addEventListener('click', () => this.navigateTemplate(1));

        // Nút yêu thích trong panel chi tiết
        document.getElementById('detail-fav-btn')?.addEventListener('click', () => {
            if (this.currentTemplate) {
                this.toggleFavorite(this.currentTemplate.id);
            }
        });

        // Nút "Nhận báo giá mẫu này" trong panel -> cuộn xuống form liên hệ và tự điền tên mẫu
        document.getElementById('detail-inquire-btn')?.addEventListener('click', () => {
            const template = this.currentTemplate;
            this.closeDetailPanel();
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
            if (template) {
                const lang = window.i18n.getLang();
                const templateName = lang === 'vi' ? template.name_vi : template.name_en;
                const msgInput = document.getElementById('inquiry-message');
                if (msgInput) {
                    msgInput.value = lang === 'vi'
                        ? `Tôi muốn nhận tư vấn và bảng dự toán chi tiết cho mẫu "${templateName}".`
                        : `I would like to receive detailed consulting and cost estimates for the "${templateName}" model.`;
                }
                const refLabel = document.getElementById('inquiry-selected-model');
                if (refLabel) {
                    refLabel.textContent = templateName;
                    refLabel.dataset.templateId = template.id;
                }
            }
        });

        // Góc nhìn Camera 3D
        document.querySelectorAll('[data-cam-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-cam-preset');
                if (this.viewer3D) this.viewer3D.setCameraPreset(preset);
            });
        });

        // Form Gửi Liên Hệ & Báo Giá
        const form = document.getElementById('inquiry-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('inquiry-name').value.trim();
                const contact = document.getElementById('inquiry-contact').value.trim();
                const message = document.getElementById('inquiry-message').value.trim();
                const refLabel = document.getElementById('inquiry-selected-model');
                const template_id = refLabel?.dataset?.templateId || null;

                const submitBtn = document.getElementById('inquiry-submit-btn');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = window.i18n.t('form_sending');

                try {
                    await this.submitInquiry({ name, contact, message, template_id });
                    alert(window.i18n.t('form_success'));
                    form.reset();
                    if (refLabel) {
                        refLabel.textContent = '-';
                        delete refLabel.dataset.templateId;
                    }
                } catch (err) {
                    console.error(err);
                    alert(window.i18n.t('form_error'));
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // Hộp thoại Auth Modal
        this.setupAuthModalEvents();
    }

    setupAuthModalEvents() {
        const modal = document.getElementById('auth-modal');
        const loginBtn = document.getElementById('btn-open-login');
        const closeBtn = document.getElementById('close-auth-modal');
        const googleBtn = document.getElementById('auth-google-btn');
        const form = document.getElementById('auth-form');
        const switchModeLink = document.getElementById('auth-switch-mode');
        const forgotLink = document.getElementById('auth-forgot-password');

        let isRegisterMode = false;

        loginBtn?.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });

        closeBtn?.addEventListener('click', () => {
            this.closeAuthModal();
        });

        googleBtn?.addEventListener('click', () => {
            this.loginWithGoogle();
        });

        switchModeLink?.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            document.getElementById('auth-name-group').style.display = isRegisterMode ? 'block' : 'none';
            document.getElementById('auth-modal-title').textContent = window.i18n.t(
                isRegisterMode ? 'auth_title_register' : 'auth_title_login'
            );
            document.getElementById('auth-submit-btn').textContent = window.i18n.t(
                isRegisterMode ? 'auth_register_action' : 'auth_login_action'
            );
            switchModeLink.textContent = window.i18n.t(
                isRegisterMode ? 'auth_has_acc' : 'auth_no_acc'
            );
        });

        forgotLink?.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            if (!email) {
                alert('Vui lòng nhập địa chỉ email vào ô trên trước khi yêu cầu khôi phục.');
                return;
            }
            this.resetPassword(email);
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            const pass = document.getElementById('auth-password').value;
            const name = document.getElementById('auth-name')?.value.trim();

            if (isRegisterMode) {
                this.registerWithEmail(email, pass, name);
            } else {
                this.loginWithEmail(email, pass);
            }
        });

        document.getElementById('btn-logout')?.addEventListener('click', () => {
            this.logout();
        });
    }

    setupThemeToggle() {
        // Theme toggle được quản lý với hiệu ứng Circular Reveal (219) ngay trong index.html
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('btn-open-login');
        const userDropdown = document.getElementById('user-menu');
        const userNameSpan = document.getElementById('user-display-name');
        const adminLink = document.getElementById('nav-admin-link');

        if (this.currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userDropdown) userDropdown.classList.remove('hidden');

            const displayName = this.currentProfile?.full_name || 
                                this.currentUser.user_metadata?.full_name || 
                                this.currentUser.email.split('@')[0];
            if (userNameSpan) userNameSpan.textContent = displayName;

            // Hiển thị link Admin nếu role = 'admin'
            if (adminLink) {
                const isAdmin = this.currentProfile?.role === 'admin';
                adminLink.classList.toggle('hidden', !isAdmin);
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userDropdown) userDropdown.classList.add('hidden');
            if (adminLink) adminLink.classList.add('hidden');
        }
    }
}

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DreamHouseApp();
    // Đồng bộ ngôn ngữ lần đầu
    window.i18n.updateDOM();
});

