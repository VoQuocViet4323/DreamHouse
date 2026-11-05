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

        // Thông báo Toast phong cách Animate-UI đồng bộ
        if (window.toast) {
            const isVi = (window.i18n && typeof window.i18n.getLang === 'function') 
                ? window.i18n.getLang() === 'vi' 
                : true;
            if (!isFav) {
                window.toast.success(isVi ? 'Đã lưu mẫu nhà vào danh sách yêu thích!' : 'Added to your favorites!', 3000);
            } else {
                window.toast.info(isVi ? 'Đã gỡ mẫu nhà khỏi danh sách yêu thích.' : 'Removed from your favorites.', 3000);
            }
        }
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
            if (window.toast) window.toast.warning('Supabase chưa được cấu hình. Vui lòng kiểm tra file .env');
            return;
        }
        const { error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) {
            const msg = window.translateAuthError ? window.translateAuthError(error.message) : error.message;
            if (window.toast) window.toast.error(msg);
        }
    }

    async loginWithEmail(email, password) {
        const client = this.getSupabase();
        if (!client) {
            if (window.toast) window.toast.warning('Supabase chưa được cấu hình trong js/config.js');
            return;
        }

        const alertBox = document.getElementById('auth-alert');
        const cleanIdentifier = (email || '').trim();

        if (!cleanIdentifier) {
            const msg = 'Vui lòng nhập tên tài khoản hoặc địa chỉ email.';
            if (alertBox) {
                alertBox.className = 'auth-alert error';
                alertBox.innerHTML = `<span>⚠️</span> <span>${msg}</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) window.toast.warning(msg);
            document.getElementById('auth-email')?.focus();
            return;
        }

        // Tự động nhận diện username hay email:
        // Nếu không chứa ký tự '@', đây là tên tài khoản nội bộ
        const authEmail = cleanIdentifier.includes('@') 
            ? cleanIdentifier 
            : `${cleanIdentifier.toLowerCase()}@dreamhouse.internal`;

        const { data, error } = await client.auth.signInWithPassword({ email: authEmail, password });
        if (error) {
            const friendlyMsg = window.translateAuthError ? window.translateAuthError(error.message) : error.message;
            if (alertBox) {
                alertBox.className = 'auth-alert error';
                alertBox.innerHTML = `<span>⚠️</span> <span>${friendlyMsg}</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) {
                window.toast.error(friendlyMsg, 4500, 'Đăng nhập không thành công');
            }
        } else {
            // Xử lý cơ chế Ghi nhớ tài khoản (Remember Me)
            const rememberCheckbox = document.getElementById('auth-remember-me');
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('dream_house_remember_email', cleanIdentifier);
            } else {
                localStorage.removeItem('dream_house_remember_email');
            }

            if (window.toast) {
                window.toast.success('Đăng nhập thành công! Chào mừng bạn quay trở lại.', 3500);
            }
            this.closeAuthModal();
        }
    }

    async registerWithUsername(username, password, confirmPassword, fullName) {
        const client = this.getSupabase();
        if (!client) {
            if (window.toast) window.toast.warning('Supabase chưa được cấu hình trong js/config.js');
            return;
        }

        const alertBox = document.getElementById('auth-alert');
        const showAlert = (msg, isSuccess = false) => {
            if (alertBox) {
                alertBox.className = `auth-alert ${isSuccess ? 'success' : 'error'}`;
                alertBox.innerHTML = `<span>${isSuccess ? '✅' : '⚠️'}</span> <span>${msg}</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) {
                if (isSuccess) window.toast.success(msg, 4000);
                else window.toast.error(msg, 4500, 'Đăng ký không thành công');
            }
        };

        const cleanUsername = (username || '').trim();
        const cleanName = (fullName || '').trim() || cleanUsername;

        // 1. Kiểm tra tính hợp lệ của Tên tài khoản (Username)
        if (!cleanUsername) {
            showAlert('Vui lòng nhập tên tài khoản.');
            document.getElementById('auth-email')?.focus();
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
        if (!usernameRegex.test(cleanUsername)) {
            showAlert('Tên tài khoản phải từ 3 đến 30 ký tự (chữ cái, số, gạch dưới hoặc chấm), không chứa khoảng trắng.');
            document.getElementById('auth-email')?.focus();
            return;
        }

        // 2. Kiểm tra tính hợp lệ của Mật khẩu & Xác nhận mật khẩu
        if (!password || password.length < 6) {
            showAlert('Mật khẩu phải có tối thiểu 6 ký tự.');
            document.getElementById('auth-password')?.focus();
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại!');
            document.getElementById('auth-confirm-password')?.focus();
            return;
        }

        const internalEmail = `${cleanUsername.toLowerCase()}@dreamhouse.internal`;

        // 3. Tiến hành đăng ký thật vào Supabase
        let registeredUser = null;
        let rpcExecuted = false;

        // Cách A: Thử gọi hàm RPC register_user_by_username (tạo trực tiếp vào auth.users, không gửi email, không rate limit)
        try {
            const { data: rpcData, error: rpcError } = await client.rpc('register_user_by_username', {
                p_username: cleanUsername,
                p_password: password,
                p_full_name: cleanName
            });

            if (!rpcError && rpcData) {
                rpcExecuted = true;
                if (rpcData.success) {
                    // Tự động đăng nhập luôn sau khi RPC tạo user thành công
                    const { data: signData, error: signError } = await client.auth.signInWithPassword({
                        email: internalEmail,
                        password: password
                    });
                    if (!signError && signData?.user) {
                        registeredUser = signData.user;
                        this.currentUser = signData.user;
                    }
                } else {
                    showAlert(rpcData.message || 'Đăng ký không thành công.');
                    return;
                }
            }
        } catch (_) {
            rpcExecuted = false;
        }

        // Cách B: Fallback sử dụng client.auth.signUp tiêu chuẩn nếu RPC chưa có trong DB
        if (!rpcExecuted) {
            const { data, error } = await client.auth.signUp({
                email: internalEmail,
                password: password,
                options: {
                    data: {
                        username: cleanUsername,
                        full_name: cleanName
                    }
                }
            });

            if (error) {
                let friendlyMsg = window.translateAuthError ? window.translateAuthError(error.message) : error.message;
                if (error.message.includes('User already registered') || error.status === 422) {
                    friendlyMsg = 'Tên tài khoản này đã được sử dụng. Vui lòng chọn một tên khác!';
                } else if (error.message.includes('rate limit')) {
                    friendlyMsg = 'Đã đạt giới hạn gửi email của Supabase. Vui lòng chạy file 05_username_auth.sql trong Supabase để kích hoạt đăng ký không giới hạn.';
                }
                showAlert(friendlyMsg);
                return;
            }

            if (data?.session) {
                registeredUser = data.user;
                this.currentUser = data.user;
            } else if (data?.user) {
                const { data: signData } = await client.auth.signInWithPassword({
                    email: internalEmail,
                    password: password
                });
                if (signData?.session) {
                    registeredUser = signData.user;
                    this.currentUser = signData.user;
                }
            }
        }

        // 4. Tự động cập nhật hồ sơ (public.profiles) vào Database
        if (registeredUser) {
            try {
                await client.from('profiles').upsert({
                    id: registeredUser.id,
                    full_name: cleanName,
                    role: 'user',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
                try {
                    await client.from('profiles').update({ username: cleanUsername }).eq('id', registeredUser.id);
                } catch (_) {}
            } catch (err) {
                console.warn('Lỗi đồng bộ profile:', err);
            }

            // Ghi nhớ tài khoản nếu được chọn
            const rememberCheckbox = document.getElementById('auth-remember-me');
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('dream_house_remember_email', cleanUsername);
            } else {
                localStorage.removeItem('dream_house_remember_email');
            }

            await this.loadUserProfile();
            this.updateAuthUI();
            this.closeAuthModal();
            if (window.toast) {
                window.toast.success(`Đăng ký thành công! Chào mừng bạn, ${cleanName}!`, 4000, 'Tạo tài khoản thành công');
            }
        } else {
            if (window.toast) {
                window.toast.success('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bằng tên tài khoản vừa tạo.', 4500);
            }
            const switchLink = document.getElementById('auth-switch-mode');
            if (switchLink) switchLink.click();
            const emailInput = document.getElementById('auth-email');
            if (emailInput) emailInput.value = cleanUsername;
            document.getElementById('auth-password')?.focus();
        }
    }

    async registerWithEmail(email, password, fullName) {
        return this.registerWithUsername(email, password, password, fullName);
    }

    async resetPassword(email) {
        const client = this.getSupabase();
        if (!client) return;
        const alertBox = document.getElementById('auth-alert');
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });
        if (error) {
            const friendlyMsg = window.translateAuthError ? window.translateAuthError(error.message) : error.message;
            if (alertBox) {
                alertBox.className = 'auth-alert error';
                alertBox.innerHTML = `<span>⚠️</span> <span>${friendlyMsg}</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) {
                window.toast.error(friendlyMsg);
            }
        } else {
            if (alertBox) {
                alertBox.className = 'auth-alert success';
                alertBox.innerHTML = `<span>✅</span> <span>Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) {
                window.toast.success('Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!', 5000);
            }
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

        // 1. Thông báo Toast đăng xuất thành công cao cấp
        const isVi = (window.i18n && typeof window.i18n.getLang === 'function') 
            ? window.i18n.getLang() === 'vi' 
            : true;

        if (window.toast) {
            const title = isVi ? 'Đăng xuất thành công' : 'Signed Out';
            const msg = isVi 
                ? 'Bạn đã đăng xuất an toàn khỏi tài khoản. Hẹn sớm gặp lại bạn!' 
                : 'You have been signed out safely. See you again soon!';
            window.toast.success(msg, 4000, title);
        }

        // 2. Tự động chuyển ngay sang màn hình / trang login chuyên biệt
        const modal = document.getElementById('auth-modal');
        if (modal) {
            const alertBox = document.getElementById('auth-alert');
            if (alertBox) {
                alertBox.className = 'auth-alert hidden';
                alertBox.textContent = '';
            }

            // Đảm bảo ở chế độ Đăng nhập (Login mode)
            const nameGroup = document.getElementById('auth-name-group');
            if (nameGroup) nameGroup.style.display = 'none';

            const confirmGroup = document.getElementById('auth-confirm-pass-group');
            if (confirmGroup) confirmGroup.style.display = 'none';

            const confirmInput = document.getElementById('auth-confirm-password');
            if (confirmInput) {
                confirmInput.value = '';
                confirmInput.required = false;
            }

            const identifierLabel = document.getElementById('auth-identifier-label');
            if (identifierLabel) {
                identifierLabel.textContent = window.i18n ? window.i18n.t('auth_email') : 'Tên tài khoản hoặc Email';
            }

            const emailInput = document.getElementById('auth-email');
            if (emailInput) {
                emailInput.placeholder = window.i18n ? window.i18n.t('auth_login_placeholder') : 'Nhập tên tài khoản hoặc email...';
            }

            const forgotLink = document.getElementById('auth-forgot-password');
            if (forgotLink) {
                forgotLink.style.display = 'inline-block';
            }

            const modalTitle = document.getElementById('auth-modal-title');
            if (modalTitle) modalTitle.textContent = window.i18n ? window.i18n.t('auth_title_login') : 'Log in';

            const methodHint = document.getElementById('auth-method-hint');
            if (methodHint) methodHint.textContent = window.i18n ? window.i18n.t('auth_email_hint') : 'Log in using username or email';

            const submitBtn = document.getElementById('auth-submit-btn');
            if (submitBtn) submitBtn.textContent = window.i18n ? window.i18n.t('auth_login_action') : 'Log In';

            const switchLink = document.getElementById('auth-switch-mode');
            if (switchLink) switchLink.textContent = window.i18n ? window.i18n.t('auth_no_acc') : 'Need to create an account? Sign Up';

            // Xóa sạch toàn bộ các ô nhập dữ liệu cũ
            const passInput = document.getElementById('auth-password');
            if (passInput) passInput.value = '';
            if (confirmInput) confirmInput.value = '';
            if (emailInput) emailInput.value = '';

            // Chỉ nạp lại tài khoản nếu ĐÃ ĐƯỢC LƯU trong localStorage
            this.loadRememberedAccount();
            const rememberedEmail = localStorage.getItem('dream_house_remember_email');

            modal.classList.remove('hidden');
            window.location.hash = 'login';

            setTimeout(() => {
                if (rememberedEmail) {
                    document.getElementById('auth-password')?.focus();
                } else {
                    document.getElementById('auth-email')?.focus();
                }
            }, 300);
        }
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

        // Đóng panel chi tiết khi bấm vào khoảng trống bên ngoài (Backdrop click)
        const detailModal = document.getElementById('detail-modal');
        if (detailModal) {
            let isMouseDownOnDetailBackdrop = false;
            detailModal.addEventListener('mousedown', (e) => {
                isMouseDownOnDetailBackdrop = (e.target === detailModal);
            });
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal && isMouseDownOnDetailBackdrop) {
                    this.closeDetailPanel();
                }
                isMouseDownOnDetailBackdrop = false;
            });
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
                    if (window.toast) {
                        window.toast.success(window.i18n.t('form_success'), 5000);
                    }
                    form.reset();
                    if (refLabel) {
                        refLabel.textContent = '-';
                        delete refLabel.dataset.templateId;
                    }
                } catch (err) {
                    console.error(err);
                    if (window.toast) {
                        window.toast.error(window.i18n.t('form_error'), 5000);
                    }
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
        const closeBtn = document.getElementById('auth-back-btn') || document.getElementById('close-auth-modal');
        const googleBtn = document.getElementById('auth-google-btn');
        const form = document.getElementById('auth-form');
        const switchModeLink = document.getElementById('auth-switch-mode');
        const forgotLink = document.getElementById('auth-forgot-password');

        let isRegisterMode = false;

        // Tự động kiểm tra và điền tài khoản đã ghi nhớ (nếu có)
        this.loadRememberedAccount();

        // User dropdown toggle (Menu xổ xuống khi click vào Avatar hoặc Tên)
        const profileTrigger = document.getElementById('user-profile-trigger');
        const dropdownMenu = document.getElementById('user-dropdown-menu');

        profileTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !dropdownMenu.classList.contains('hidden');
            dropdownMenu.classList.toggle('hidden', isOpen);
            profileTrigger.setAttribute('aria-expanded', String(!isOpen));
        });

        // Click ra ngoài thì tự đóng dropdown
        document.addEventListener('click', (e) => {
            if (!dropdownMenu?.classList.contains('hidden') && !e.target.closest('#user-menu')) {
                dropdownMenu?.classList.add('hidden');
                profileTrigger?.setAttribute('aria-expanded', 'false');
            }
        });

        // Click mục Yêu thích trong dropdown
        document.getElementById('menu-favorites-link')?.addEventListener('click', () => {
            dropdownMenu?.classList.add('hidden');
            const favCheckbox = document.getElementById('filter-fav-only');
            if (favCheckbox) {
                favCheckbox.checked = true;
                this.activeFilter.onlyFavorites = true;
                this.renderGallery();
            }
        });

        // Click Chỉnh sửa hồ sơ -> Mở Panel Hồ sơ cá nhân
        document.getElementById('menu-edit-profile-btn')?.addEventListener('click', () => {
            this.openProfileModal();
        });

        // Đóng Profile Modal
        document.getElementById('close-profile-modal')?.addEventListener('click', () => {
            this.closeProfileModal();
        });
        document.getElementById('btn-cancel-profile')?.addEventListener('click', () => {
            this.closeProfileModal();
        });

        // Click ra ngoài khoảng trống backdrop để đóng Profile Modal
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            let isMouseDownOnProfileBackdrop = false;
            profileModal.addEventListener('mousedown', (e) => {
                isMouseDownOnProfileBackdrop = (e.target === profileModal);
            });
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal && isMouseDownOnProfileBackdrop) {
                    this.closeProfileModal();
                }
                isMouseDownOnProfileBackdrop = false;
            });
        }

        // Phím Escape đóng tất cả modal đang mở
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAuthModal();
                this.closeProfileModal();
                this.closeDetailPanel();
            }
        });

        // Toggle mục đổi mật khẩu trong Profile Modal
        document.getElementById('toggle-password-section')?.addEventListener('click', () => {
            const body = document.getElementById('password-section-body');
            const toggle = document.getElementById('toggle-password-section');
            const pillText = document.getElementById('pass-toggle-pill-text');
            if (body && toggle) {
                const isHidden = body.classList.toggle('hidden');
                toggle.setAttribute('aria-expanded', String(!isHidden));
                const isVi = window.i18n.getLang() === 'vi';
                if (pillText) {
                    pillText.textContent = isHidden ? (isVi ? 'Mở' : 'Expand') : (isVi ? 'Thu gọn' : 'Collapse');
                }
            }
        });

        // Toggle mắt ẩn/hiện mật khẩu
        const setupEyeToggle = (btnId, inputId) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            if (btn && input) {
                btn.addEventListener('click', () => {
                    const isPass = input.type === 'password';
                    input.type = isPass ? 'text' : 'password';
                    btn.innerHTML = isPass
                        ? `<svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                        : `<svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
                });
            }
        };
        setupEyeToggle('toggle-new-pass-visibility', 'profile-new-pass');
        setupEyeToggle('toggle-confirm-pass-visibility', 'profile-confirm-pass');

        // Theo dõi realtime độ mạnh mật khẩu và so sánh khớp
        const newPassEl = document.getElementById('profile-new-pass');
        const confirmPassEl = document.getElementById('profile-confirm-pass');
        const onPassInput = () => {
            this.updatePasswordSecurityMetrics(newPassEl?.value || '', confirmPassEl?.value || '');
        };
        newPassEl?.addEventListener('input', onPassInput);
        confirmPassEl?.addEventListener('input', onPassInput);

        // Preset Chips chọn ảnh avatar nhanh
        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const url = chip.getAttribute('data-avatar') || '';
                const avatarInput = document.getElementById('profile-avatar-url');
                const nameInput = document.getElementById('profile-name');
                if (avatarInput) avatarInput.value = url;
                this.renderProfileModalAvatar(url, nameInput?.value || '');
            });
        });

        // Live preview khi người dùng gõ link ảnh hoặc đổi tên
        document.getElementById('profile-avatar-url')?.addEventListener('input', (e) => {
            const nameInput = document.getElementById('profile-name');
            this.renderProfileModalAvatar(e.target.value, nameInput?.value || '');
        });
        document.getElementById('profile-name')?.addEventListener('input', (e) => {
            const avatarInput = document.getElementById('profile-avatar-url');
            this.renderProfileModalAvatar(avatarInput?.value || '', e.target.value);
        });

        // Submit form lưu hồ sơ
        document.getElementById('profile-form')?.addEventListener('submit', (e) => {
            this.handleSaveProfile(e);
        });

        document.getElementById('menu-settings-btn')?.addEventListener('click', () => {
            dropdownMenu?.classList.add('hidden');
            if (window.toast) {
                window.toast.info('Hệ thống đang hoạt động tối ưu với Supabase và Three.js.');
            }
        });

        const updateAuthFormMode = (registerMode) => {
            isRegisterMode = registerMode;
            const alertBox = document.getElementById('auth-alert');
            if (alertBox) {
                alertBox.className = 'auth-alert hidden';
                alertBox.textContent = '';
            }
            const nameGroup = document.getElementById('auth-name-group');
            if (nameGroup) nameGroup.style.display = isRegisterMode ? 'block' : 'none';

            const confirmPassGroup = document.getElementById('auth-confirm-pass-group');
            if (confirmPassGroup) confirmPassGroup.style.display = isRegisterMode ? 'block' : 'none';

            const confirmPassInput = document.getElementById('auth-confirm-password');
            if (confirmPassInput) {
                confirmPassInput.required = isRegisterMode;
                if (!isRegisterMode) confirmPassInput.value = '';
            }

            const identifierLabel = document.getElementById('auth-identifier-label');
            const identifierInput = document.getElementById('auth-email');
            if (identifierLabel) {
                identifierLabel.setAttribute('data-i18n', isRegisterMode ? 'auth_username' : 'auth_email');
                identifierLabel.textContent = window.i18n.t(isRegisterMode ? 'auth_username' : 'auth_email');
            }
            if (identifierInput) {
                identifierInput.placeholder = window.i18n.t(isRegisterMode ? 'auth_username_placeholder' : 'auth_login_placeholder');
            }

            const forgotLink = document.getElementById('auth-forgot-password');
            if (forgotLink) {
                forgotLink.style.display = isRegisterMode ? 'none' : 'inline-block';
            }

            const titleEl = document.getElementById('auth-modal-title');
            if (titleEl) {
                titleEl.setAttribute('data-i18n', isRegisterMode ? 'auth_title_register' : 'auth_title_login');
                titleEl.textContent = window.i18n.t(isRegisterMode ? 'auth_title_register' : 'auth_title_login');
            }

            const methodHint = document.getElementById('auth-method-hint');
            if (methodHint) {
                methodHint.setAttribute('data-i18n', isRegisterMode ? 'auth_email_hint_register' : 'auth_email_hint');
                methodHint.textContent = window.i18n.t(
                    isRegisterMode ? 'auth_email_hint_register' : 'auth_email_hint'
                );
            }

            const submitBtn = document.getElementById('auth-submit-btn');
            if (submitBtn) {
                submitBtn.setAttribute('data-i18n', isRegisterMode ? 'auth_register_action' : 'auth_login_action');
                submitBtn.textContent = window.i18n.t(
                    isRegisterMode ? 'auth_register_action' : 'auth_login_action'
                );
            }

            if (switchModeLink) {
                switchModeLink.setAttribute('data-i18n', isRegisterMode ? 'auth_has_acc' : 'auth_no_acc');
                switchModeLink.textContent = window.i18n.t(
                    isRegisterMode ? 'auth_has_acc' : 'auth_no_acc'
                );
            }

            const nameInput = document.getElementById('auth-name');
            const passInput = document.getElementById('auth-password');
            const rememberCheckbox = document.getElementById('auth-remember-me');
            const rememberLabel = document.querySelector('.auth-remember-label');

            if (rememberLabel) {
                rememberLabel.style.display = isRegisterMode ? 'none' : 'inline-flex';
            }

            if (isRegisterMode) {
                // KHI CHUYỂN SANG ĐĂNG KÝ: TUYỆT ĐỐI XÓA SẠCH TẤT CẢ CÁC TRƯỜNG NHẬP LIỆU
                if (nameInput) nameInput.value = '';
                if (identifierInput) {
                    identifierInput.value = '';
                    identifierInput.setAttribute('autocomplete', 'off');
                }
                if (passInput) {
                    passInput.value = '';
                    passInput.setAttribute('autocomplete', 'new-password');
                }
                if (confirmPassInput) {
                    confirmPassInput.value = '';
                    confirmPassInput.setAttribute('autocomplete', 'new-password');
                }
                if (rememberCheckbox) rememberCheckbox.checked = false;

                // Cơ chế chống trình duyệt (Chrome/Edge) tự động điền mật khẩu / tài khoản đã lưu
                setTimeout(() => {
                    if (isRegisterMode) {
                        if (nameInput) nameInput.value = '';
                        if (identifierInput) identifierInput.value = '';
                        if (passInput) passInput.value = '';
                        if (confirmPassInput) confirmPassInput.value = '';
                    }
                }, 50);
                setTimeout(() => {
                    if (isRegisterMode) {
                        if (nameInput) nameInput.value = '';
                        if (identifierInput) identifierInput.value = '';
                        if (passInput) passInput.value = '';
                        if (confirmPassInput) confirmPassInput.value = '';
                    }
                }, 200);
            } else {
                // KHI QUAY LẠI ĐĂNG NHẬP: KHÔI PHỤC THUỘC TÍNH AUTOCOMPLETE VÀ NẠP TÀI KHOẢN GHI NHỚ NẾU CÓ
                if (identifierInput) identifierInput.setAttribute('autocomplete', 'username');
                if (passInput) passInput.setAttribute('autocomplete', 'current-password');
                this.loadRememberedAccount();
            }
        };

        // Mặc định ở chế độ Đăng nhập
        updateAuthFormMode(false);

        loginBtn?.addEventListener('click', () => {
            const alertBox = document.getElementById('auth-alert');
            if (alertBox) {
                alertBox.className = 'auth-alert hidden';
                alertBox.textContent = '';
            }
            updateAuthFormMode(false);
            const passInput = document.getElementById('auth-password');
            if (passInput) passInput.value = '';
            const confirmInput = document.getElementById('auth-confirm-password');
            if (confirmInput) confirmInput.value = '';

            modal?.classList.remove('hidden');
            window.location.hash = 'login';
        });

        closeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAuthModal();
        });
        document.getElementById('auth-back-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAuthModal();
        });

        // Đóng Auth Modal khi click ra ngoài khoảng trống backdrop
        if (modal) {
            let isMouseDownOnAuthBackdrop = false;
            modal.addEventListener('mousedown', (e) => {
                isMouseDownOnAuthBackdrop = (e.target === modal);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal && isMouseDownOnAuthBackdrop) {
                    this.closeAuthModal();
                }
                isMouseDownOnAuthBackdrop = false;
            });
        }

        googleBtn?.addEventListener('click', () => {
            this.loginWithGoogle();
        });

        switchModeLink?.addEventListener('click', (e) => {
            e.preventDefault();
            const targetMode = !isRegisterMode;
            updateAuthFormMode(targetMode);
            window.location.hash = targetMode ? 'register' : 'login';
        });

        // Nút con mắt ẩn/hiện mật khẩu trong form Auth
        const passInput = document.getElementById('auth-password');
        const eyeBtn = document.getElementById('toggle-auth-pass-visibility');
        eyeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!passInput) return;
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            eyeBtn.classList.toggle('active', isPass);
            eyeBtn.setAttribute('title', isPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            eyeBtn.innerHTML = isPass
                ? `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="2" x2="23" y2="23"></line></svg>`
                : `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        });

        // Nút con mắt ẩn/hiện xác nhận mật khẩu trong form Auth
        const confirmPassInput = document.getElementById('auth-confirm-password');
        const confirmEyeBtn = document.getElementById('toggle-auth-confirm-pass-visibility');
        confirmEyeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirmPassInput) return;
            const isPass = confirmPassInput.type === 'password';
            confirmPassInput.type = isPass ? 'text' : 'password';
            confirmEyeBtn.classList.toggle('active', isPass);
            confirmEyeBtn.setAttribute('title', isPass ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu');
            confirmEyeBtn.innerHTML = isPass
                ? `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="2" x2="23" y2="23"></line></svg>`
                : `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        });

        // Nút quay lại trang chủ & Khám phá mẫu nhà từ cột Showcase
        document.getElementById('auth-back-to-home')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAuthModal();
        });
        document.getElementById('auth-explore-cta')?.addEventListener('click', () => {
            this.closeAuthModal();
            document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' });
        });

        // Nhấn phím Escape để đóng nhanh màn hình Auth
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeAuthModal();
            }
        });

        // Kiểm tra mở Auth tự động nếu URL có hash #login hoặc #register
        if (window.location.hash === '#login' || window.location.hash === '#register') {
            if (window.location.hash === '#register') {
                updateAuthFormMode(true);
            } else {
                updateAuthFormMode(false);
                this.loadRememberedAccount();
            }
            modal?.classList.remove('hidden');
        }

        forgotLink?.addEventListener('click', (e) => {
            e.preventDefault();
            const identifier = document.getElementById('auth-email').value.trim();
            if (!identifier) {
                const alertBox = document.getElementById('auth-alert');
                const warningMsg = 'Vui lòng nhập địa chỉ email vào ô bên dưới trước khi yêu cầu khôi phục.';
                if (alertBox) {
                    alertBox.className = 'auth-alert error';
                    alertBox.innerHTML = `<span>⚠️</span> <span>${warningMsg}</span>`;
                    alertBox.classList.remove('hidden');
                }
                if (window.toast) {
                    window.toast.warning(warningMsg);
                }
                document.getElementById('auth-email')?.focus();
                return;
            }
            if (!identifier.includes('@')) {
                const alertBox = document.getElementById('auth-alert');
                const warningMsg = 'Để khôi phục mật khẩu, vui lòng nhập địa chỉ email liên kết tài khoản.';
                if (alertBox) {
                    alertBox.className = 'auth-alert error';
                    alertBox.innerHTML = `<span>⚠️</span> <span>${warningMsg}</span>`;
                    alertBox.classList.remove('hidden');
                }
                if (window.toast) {
                    window.toast.warning(warningMsg);
                }
                document.getElementById('auth-email')?.focus();
                return;
            }
            this.resetPassword(identifier);
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const identifier = document.getElementById('auth-email').value.trim();
            const pass = document.getElementById('auth-password').value;
            const name = document.getElementById('auth-name')?.value.trim();
            const confirmPass = document.getElementById('auth-confirm-password')?.value;

            if (isRegisterMode) {
                this.registerWithUsername(identifier, pass, confirmPass, name);
            } else {
                this.loginWithEmail(identifier, pass);
            }
        });

        document.getElementById('btn-logout')?.addEventListener('click', () => {
            dropdownMenu?.classList.add('hidden');
            profileTrigger?.setAttribute('aria-expanded', 'false');
            this.logout();
        });

        // Kiểm tra thông báo nếu vừa đăng xuất từ trang Admin chuyển về
        if (sessionStorage.getItem('just_logged_out')) {
            sessionStorage.removeItem('just_logged_out');
            if (window.toast) {
                const isVi = (window.i18n && typeof window.i18n.getLang === 'function') 
                    ? window.i18n.getLang() === 'vi' 
                    : true;
                const title = isVi ? 'Đăng xuất thành công' : 'Signed Out';
                const msg = isVi 
                    ? 'Bạn đã đăng xuất an toàn khỏi tài khoản. Hẹn sớm gặp lại bạn!' 
                    : 'You have been signed out safely. See you again soon!';
                window.toast.success(msg, 4000, title);
            }
        }
    }

    setupThemeToggle() {
        // Theme toggle được quản lý với hiệu ứng Circular Reveal (219) ngay trong index.html
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
        const alertBox = document.getElementById('auth-alert');
        if (alertBox) {
            alertBox.className = 'auth-alert hidden';
            alertBox.textContent = '';
        }
        if (window.location.hash === '#login' || window.location.hash === '#register') {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }

    loadRememberedAccount() {
        try {
            // NẾU ĐANG Ở CHẾ ĐỘ ĐĂNG KÝ HOẶC HASH #register: TUYỆT ĐỐI KHÔNG NẠP DỮ LIỆU
            const nameGroup = document.getElementById('auth-name-group');
            const isReg = (nameGroup && nameGroup.style.display !== 'none') || window.location.hash === '#register';
            if (isReg) {
                const emailInput = document.getElementById('auth-email');
                if (emailInput) emailInput.value = '';
                const rememberCheckbox = document.getElementById('auth-remember-me');
                if (rememberCheckbox) rememberCheckbox.checked = false;
                return;
            }

            const rememberedEmail = localStorage.getItem('dream_house_remember_email');
            const emailInput = document.getElementById('auth-email');
            const rememberCheckbox = document.getElementById('auth-remember-me');
            if (rememberedEmail && rememberedEmail.trim()) {
                if (emailInput) emailInput.value = rememberedEmail.trim();
                if (rememberCheckbox) rememberCheckbox.checked = true;
            } else {
                // Tuyệt đối không điền sẵn nếu không có ghi nhớ tài khoản
                if (emailInput) emailInput.value = '';
                if (rememberCheckbox) rememberCheckbox.checked = false;
            }
        } catch (e) {
            console.warn('Lỗi khi nạp tài khoản đã ghi nhớ:', e);
        }
    }

    openProfileModal() {
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        dropdownMenu?.classList.add('hidden');
        document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');

        if (!this.currentUser) return;

        const modal = document.getElementById('profile-modal');
        if (!modal) return;

        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        const avatarInput = document.getElementById('profile-avatar-url');
        const roleText = document.getElementById('profile-role-text');
        const createdDate = document.getElementById('profile-created-date');
        const userId = document.getElementById('profile-user-id');
        const alertBox = document.getElementById('profile-alert');
        const newPassInput = document.getElementById('profile-new-pass');
        const confirmPassInput = document.getElementById('profile-confirm-pass');
        const passSection = document.getElementById('password-section-body');
        const passToggle = document.getElementById('toggle-password-section');

        const displayName = this.currentProfile?.full_name || 
                            this.currentUser.user_metadata?.full_name || 
                            this.currentUser.email.split('@')[0];

        if (nameInput) nameInput.value = displayName;
        if (emailInput) emailInput.value = this.currentUser.email || '';
        if (phoneInput) phoneInput.value = this.currentProfile?.phone || this.currentUser.user_metadata?.phone || '';
        
        const avatarUrl = this.currentProfile?.avatar_url || this.currentUser.user_metadata?.avatar_url || '';
        if (avatarInput) avatarInput.value = avatarUrl;

        const isAdmin = this.currentProfile?.role === 'admin';
        if (roleText) {
            const isVi = window.i18n.getLang() === 'vi';
            roleText.textContent = isAdmin ? (isVi ? 'Quản trị viên (Admin)' : 'Administrator') : (isVi ? 'Thành viên' : 'Member');
        }

        if (createdDate && this.currentUser.created_at) {
            const d = new Date(this.currentUser.created_at);
            createdDate.textContent = d.toLocaleDateString(window.i18n.getLang() === 'vi' ? 'vi-VN' : 'en-US');
        }

        if (userId && this.currentUser.id) {
            userId.textContent = this.currentUser.id.slice(0, 8) + '...';
        }

        this.resetPasswordSection();

        if (alertBox) {
            alertBox.className = 'profile-alert hidden';
            alertBox.textContent = '';
        }

        this.renderProfileModalAvatar(avatarUrl, displayName);
        modal.classList.remove('hidden');
    }

    resetPasswordSection() {
        const newPassInput = document.getElementById('profile-new-pass');
        const confirmPassInput = document.getElementById('profile-confirm-pass');
        const passSection = document.getElementById('password-section-body');
        const passToggle = document.getElementById('toggle-password-section');
        const pillText = document.getElementById('pass-toggle-pill-text');

        if (newPassInput) {
            newPassInput.value = '';
            newPassInput.type = 'password';
        }
        if (confirmPassInput) {
            confirmPassInput.value = '';
            confirmPassInput.type = 'password';
        }
        if (passSection) passSection.classList.add('hidden');
        if (passToggle) passToggle.setAttribute('aria-expanded', 'false');
        if (pillText) {
            pillText.textContent = window.i18n.getLang() === 'vi' ? 'Mở' : 'Expand';
        }

        this.updatePasswordSecurityMetrics('', '');
    }

    updatePasswordSecurityMetrics(pass, confirmPass) {
        const meterBars = [
            document.getElementById('meter-bar-1'),
            document.getElementById('meter-bar-2'),
            document.getElementById('meter-bar-3'),
            document.getElementById('meter-bar-4')
        ];
        const strengthVal = document.getElementById('strength-val');
        const matchChip = document.getElementById('pass-match-chip');
        const critLength = document.getElementById('crit-length');
        const critAlpha = document.getElementById('crit-alphanumeric');

        const isVi = window.i18n.getLang() === 'vi';

        // 1. Kiểm tra tiêu chuẩn
        const hasLength = pass.length >= 6;
        const hasLetters = /[a-zA-Z]/.test(pass);
        const hasNumbers = /[0-9]/.test(pass);
        const hasSymbols = /[^a-zA-Z0-9]/.test(pass);
        const hasAlphaNum = hasLetters && hasNumbers;

        if (critLength) critLength.classList.toggle('valid', hasLength);
        if (critAlpha) critAlpha.classList.toggle('valid', hasAlphaNum);

        // 2. Tính điểm độ mạnh (0 - 4)
        let score = 0;
        if (pass.length > 0) {
            score = 1;
            if (hasLength) score++;
            if (hasAlphaNum) score++;
            if (pass.length >= 8 && (hasSymbols || (/[A-Z]/.test(pass) && /[a-z]/.test(pass)))) score++;
        }

        const colors = ['', '#ef4444', '#f97316', '#eab308', '#10b981'];
        const labels = isVi 
            ? ['Chưa nhập', 'Yếu', 'Trung bình', 'Khá', 'Rất mạnh']
            : ['None', 'Weak', 'Medium', 'Good', 'Strong'];

        meterBars.forEach((bar, idx) => {
            if (bar) {
                bar.style.backgroundColor = (idx < score) ? colors[score] : '';
            }
        });

        if (strengthVal) {
            strengthVal.textContent = labels[score];
            strengthVal.style.color = (score > 0) ? colors[score] : '';
        }

        // 3. Kiểm tra khớp mật khẩu
        if (matchChip) {
            if (!confirmPass) {
                matchChip.className = 'pass-match-chip hidden';
                matchChip.textContent = '';
            } else if (pass === confirmPass) {
                matchChip.className = 'pass-match-chip match';
                matchChip.textContent = isVi ? '✓ Khớp hoàn toàn' : '✓ Passwords match';
            } else {
                matchChip.className = 'pass-match-chip mismatch';
                matchChip.textContent = isVi ? '⚠️ Chưa khớp' : '⚠️ Passwords do not match';
            }
        }
    }

    renderProfileModalAvatar(avatarUrl, name) {
        const preview = document.getElementById('profile-avatar-preview');
        if (!preview) return;
        const initial = (name && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';

        if (avatarUrl && avatarUrl.trim()) {
            preview.innerHTML = `<img src="${avatarUrl.trim()}" alt="Avatar" onerror="this.parentElement.innerHTML='<span id=\\'profile-avatar-char\\'>${initial}</span>'" />`;
        } else {
            preview.innerHTML = `<span id="profile-avatar-char">${initial}</span>`;
        }
    }

    closeProfileModal() {
        const modal = document.getElementById('profile-modal');
        if (modal) modal.classList.add('hidden');
    }

    async handleSaveProfile(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const nameInput = document.getElementById('profile-name');
        const phoneInput = document.getElementById('profile-phone');
        const avatarInput = document.getElementById('profile-avatar-url');
        const newPassInput = document.getElementById('profile-new-pass');
        const confirmPassInput = document.getElementById('profile-confirm-pass');
        const alertBox = document.getElementById('profile-alert');
        const submitBtn = document.getElementById('btn-save-profile');
        const submitBtnText = document.getElementById('save-btn-text');

        const fullName = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const avatarUrl = avatarInput ? avatarInput.value.trim() : '';
        const newPassword = newPassInput ? newPassInput.value : '';
        const confirmPassword = confirmPassInput ? confirmPassInput.value : '';

        const showAlert = (msg, isError = false) => {
            if (alertBox) {
                alertBox.className = `profile-alert ${isError ? 'error' : 'success'}`;
                alertBox.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span> <span>${msg}</span>`;
                alertBox.classList.remove('hidden');
            }
            if (window.toast) {
                if (isError) window.toast.error(msg);
                else window.toast.success(msg);
            }
        };

        if (!fullName) {
            showAlert('Vui lòng nhập họ và tên hiển thị.', true);
            nameInput?.focus();
            return;
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                showAlert('Mật khẩu mới phải có tối thiểu 6 ký tự.', true);
                newPassInput?.focus();
                return;
            }
            if (newPassword !== confirmPassword) {
                showAlert('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.', true);
                confirmPassInput?.focus();
                return;
            }
        }

        const client = this.getSupabase();
        if (!client) {
            showAlert('Không thể kết nối Supabase.', true);
            return;
        }

        const isVi = window.i18n.getLang() === 'vi';
        if (submitBtn) submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang lưu...' : 'Saving...';

        try {
            // 1. Cập nhật bảng profiles
            const profilePayload = {
                full_name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };
            const { error: profileError } = await client
                .from('profiles')
                .update(profilePayload)
                .eq('id', this.currentUser.id);

            if (profileError) throw profileError;

            // Thử cập nhật thêm phone vào profiles nếu cột phone đã tồn tại
            if (phone) {
                try {
                    await client.from('profiles').update({ phone }).eq('id', this.currentUser.id);
                } catch (_) {}
            }

            // 2. Cập nhật Auth user metadata & đổi mật khẩu nếu có
            const userUpdatePayload = {
                data: {
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    phone: phone
                }
            };
            if (newPassword) {
                userUpdatePayload.password = newPassword;
            }

            const { data: authData, error: authError } = await client.auth.updateUser(userUpdatePayload);
            if (authError) throw authError;

            // 3. Cập nhật cache cục bộ
            if (this.currentProfile) {
                this.currentProfile.full_name = fullName;
                this.currentProfile.avatar_url = avatarUrl;
                this.currentProfile.phone = phone;
            }
            if (authData?.user) {
                this.currentUser = authData.user;
            }

            // 4. Cập nhật UI Header ngay lập tức
            this.updateAuthUI();

            showAlert(isVi ? 'Cập nhật hồ sơ thành công!' : 'Profile updated successfully!');

            // Tự động đóng modal sau 1.2s
            setTimeout(() => {
                this.closeProfileModal();
            }, 1200);

        } catch (err) {
            console.error('Save profile error:', err);
            showAlert('Lỗi: ' + (err.message || 'Không thể lưu hồ sơ.'), true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (submitBtnText) submitBtnText.textContent = isVi ? 'Lưu thay đổi' : 'Save Changes';
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('btn-open-login');
        const userDropdown = document.getElementById('user-menu');
        const userNameSpan = document.getElementById('user-display-name');
        const roleBadge = document.getElementById('dropdown-user-role');
        const emailBadge = document.getElementById('dropdown-user-email');
        const adminMenuLink = document.getElementById('menu-admin-link');
        const avatarCircle = document.getElementById('user-avatar-initials');

        if (this.currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userDropdown) userDropdown.classList.remove('hidden');

            const displayName = this.currentProfile?.full_name || 
                                this.currentUser.user_metadata?.full_name || 
                                this.currentUser.user_metadata?.username ||
                                this.currentUser.email.split('@')[0];
            if (userNameSpan) userNameSpan.textContent = displayName;

            // Hiển thị ảnh Avatar trên thanh điều hướng hoặc chữ cái đầu
            const avatarUrl = this.currentProfile?.avatar_url || this.currentUser.user_metadata?.avatar_url;
            if (avatarCircle) {
                if (avatarUrl && avatarUrl.trim()) {
                    avatarCircle.innerHTML = `<img src="${avatarUrl.trim()}" alt="${displayName}" class="nav-avatar-img" onerror="this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'" />`;
                } else {
                    avatarCircle.textContent = displayName.charAt(0).toUpperCase();
                }
            }

            const isAdmin = this.currentProfile?.role === 'admin';
            if (roleBadge) roleBadge.textContent = isAdmin ? 'Quản trị viên (Admin)' : 'Thành viên';
            
            const displayIdentifier = this.currentProfile?.username 
                ? `@${this.currentProfile.username}`
                : (this.currentUser.user_metadata?.username 
                    ? `@${this.currentUser.user_metadata.username}`
                    : (this.currentUser.email && this.currentUser.email.endsWith('@dreamhouse.internal')
                        ? `@${this.currentUser.email.split('@')[0]}`
                        : (this.currentUser.email || '')));
            if (emailBadge) emailBadge.textContent = displayIdentifier;

            // Hiển thị các mục đặc quyền Admin trong Menu xổ xuống
            if (adminMenuLink) adminMenuLink.classList.toggle('hidden', !isAdmin);
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userDropdown) userDropdown.classList.add('hidden');
        }
    }
}

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DreamHouseApp();
    // Đồng bộ ngôn ngữ lần đầu
    window.i18n.updateDOM();
});

