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
        this.isAuthRegisterMode = false;
        this._rpcIncrementMissing = false;
        this.heroShowcaseIndex = 0;
        this.heroShowcaseTimer = null;
        this.featuredShowcaseTemplates = [];
        this.heroWordIndex = 0;
        this.heroWordTimer = null;
        this.heroCountersRun = false;

        this.init();
    }

    getCachedUserFromStorage() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.user) {
                            return parsed.user;
                        }
                    }
                }
            }
        } catch (e) {
            // Bỏ qua lỗi parse
        }
        return null;
    }

    async init() {
        // 0. Luôn đảm bảo khi mở/tải lại trang thì hiển thị tại đầu mục (Scroll to Top on Load/Reload)
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        // Nếu URL có hash anchor thông thường (không phải modal #login / #register) thì xóa và cuộn lên đỉnh
        if (window.location.hash && !['#login', '#register'].includes(window.location.hash)) {
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, null, window.location.pathname + window.location.search);
            }
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }

        const startTime = Date.now();
        // Fallback tối đa 2.5s đảm bảo người dùng luôn vào được web ngay cả khi mạng lag
        const fallbackTimer = setTimeout(() => {
            this.hideSitePreloader();
        }, 2500);

        // 1. Phục hồi phiên đăng nhập tức thì từ localStorage (0ms delay) để không bị nháy chữ "Đăng nhập"
        const cachedUser = this.getCachedUserFromStorage();
        if (cachedUser) {
            this.currentUser = cachedUser;
            this.updateAuthUI();
        }

        this.loadLocalFavorites();
        await this.setupAuth();
        this.setupUIEvents();
        this.initNotificationBell();
        this.initCostCalculator();
        this.initFloorplanExplorer();
        this.initFengShuiSuite();
        this.initCompareEngine();
        this.initBrochureExporter();
        await this.loadTemplates();
        this.renderGallery();
        this.initHeroShowcase();
        this.initHeroRotatingWords();
        this.initHeroCounterRoll();

        // Khởi tạo 3D viewer khi DOM sẵn sàng
        setTimeout(() => {
            if (document.getElementById('threejs-canvas-wrapper')) {
                this.viewer3D = new House3DViewer('threejs-canvas-wrapper');
            }
        }, 100);

        // Lắng nghe sự kiện đổi ngôn ngữ để render lại chữ động
        window.addEventListener('languageChanged', () => {
            this.renderGallery();
            this.updateHeroShowcase(true);
            this.updateHeroRotatingWordLang();
            if (this.currentTemplate) {
                this.updateDetailPanelContent(this.currentTemplate);
            }
            if (typeof this.recalcQuickEstimator === 'function') {
                this.recalcQuickEstimator();
            }
            this.updateAuthUI();
        });

        // Đảm bảo hiệu ứng flipping hiển thị mượt mà tối thiểu 450ms để người dùng cảm nhận được visual luxury
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 450 - elapsed);
        setTimeout(() => {
            clearTimeout(fallbackTimer);
            this.hideSitePreloader();
        }, delay);
    }

    hideSitePreloader() {
        const preloader = document.getElementById('site-preloader');
        if (preloader && !preloader.classList.contains('preloader-hidden')) {
            preloader.classList.add('preloader-hidden');
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            setTimeout(() => {
                if (preloader && preloader.parentNode) {
                    preloader.parentNode.removeChild(preloader);
                }
                document.documentElement.style.scrollBehavior = '';
            }, 600);
        }
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
        this.updateFavoriteCountBadge();
    }

    saveLocalFavorites() {
        localStorage.setItem('dream_house_favs', JSON.stringify(Array.from(this.favorites)));
        this.updateFavoriteCountBadge();
    }

    updateFavoriteCountBadge() {
        const badge = document.getElementById('fav-count-badge');
        if (badge) {
            const count = this.favorites ? this.favorites.size : 0;
            badge.textContent = count;
            badge.classList.remove('badge-pop');
            void badge.offsetWidth;
            badge.classList.add('badge-pop');
        }
    }

    animateGalleryTransition(renderFn) {
        const gallery = document.getElementById('gallery');
        if (!gallery) {
            if (typeof renderFn === 'function') renderFn();
            return;
        }

        const hasCards = gallery.querySelector('.house-card') || gallery.querySelector('.empty-state');
        if (hasCards) {
            gallery.classList.add('gallery-transitioning');
            setTimeout(() => {
                if (typeof renderFn === 'function') renderFn();
                requestAnimationFrame(() => {
                    gallery.classList.remove('gallery-transitioning');
                });
            }, 180);
        } else {
            if (typeof renderFn === 'function') renderFn();
        }
    }

    updateCardFavoriteUI(templateId, isFav) {
        const root = document.querySelector(`.card-fav-u022[data-fav-id="${templateId}"]`);
        if (!root) return;
        const btn = root.querySelector('.u022-btn');
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        root.classList.toggle('is-on', isFav);
        if (btn) {
            btn.setAttribute('aria-pressed', String(isFav));
            const tip = window.i18n ? window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add') : (isFav ? 'Bỏ lưu' : 'Lưu');
            btn.setAttribute('aria-label', tip);
            btn.setAttribute('title', tip);
        }

        root.classList.remove('is-pop');
        if (root._popTimer) {
            clearTimeout(root._popTimer);
            root._popTimer = null;
        }

        if (isFav && !rm) {
            void root.offsetWidth; // Force reflow để trigger animation
            root.classList.add('is-pop');
            root._popTimer = setTimeout(() => {
                root.classList.remove('is-pop');
                root._popTimer = null;
            }, 900);
        }
    }

    async toggleFavorite(templateId) {
        const isFav = this.favorites.has(templateId);
        const nextFav = !isFav;
        if (nextFav) {
            this.favorites.add(templateId);
        } else {
            this.favorites.delete(templateId);
        }
        this.saveLocalFavorites();

        // Cập nhật ngay UI thẻ card không làm hủy DOM / ngắt quãng animation
        this.updateCardFavoriteUI(templateId, nextFav);
        this.updateDetailFavButton();
        this.updateFavoriteCountBadge();

        // Nếu đang lọc chỉ xem yêu thích và người dùng bỏ tim thì kích hoạt animation trượt ẩn thẻ đó trước
        if (this.activeFilter && this.activeFilter.onlyFavorites && !nextFav) {
            const cardEl = document.querySelector(`.house-card[data-id="${templateId}"]`);
            if (cardEl) {
                cardEl.classList.add('card-exit');
            }
            setTimeout(() => {
                this.renderGallery();
            }, 300);
        }

        // Nếu đã đăng nhập, đồng bộ ngay với Supabase
        const client = this.getSupabase();
        if (client && this.currentUser) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(templateId)) {
                try {
                    if (!nextFav) {
                        await client.from('favorites').delete()
                            .eq('user_id', this.currentUser.id)
                            .eq('template_id', templateId);
                    } else {
                        await client.from('favorites').insert({
                            user_id: this.currentUser.id,
                            template_id: templateId
                        });
                    }
                } catch (err) {
                    console.error('Lỗi khi đồng bộ yêu thích với Supabase:', err);
                }
            }
        }
    }

    async syncFavoritesWithSupabase() {
        const client = this.getSupabase();
        if (!client || !this.currentUser) return;
        if (this._isSyncingFavorites) return;
        this._isSyncingFavorites = true;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        try {
            // Lấy danh sách favorites từ DB
            const { data, error } = await client
                .from('favorites')
                .select('template_id')
                .eq('user_id', this.currentUser.id);

            if (!error && data) {
                let hasChanges = false;
                // Thêm các mẫu từ DB vào local nếu chưa có
                data.forEach(row => {
                    if (row.template_id && !this.favorites.has(row.template_id)) {
                        this.favorites.add(row.template_id);
                        hasChanges = true;
                    }
                });

                // Đẩy các mẫu lưu tạm trên máy (chưa có trong DB và hợp lệ UUID) lên DB
                const existingDbIds = new Set(data.map(row => row.template_id));
                const newInserts = Array.from(this.favorites)
                    .filter(tId => uuidRegex.test(tId) && !existingDbIds.has(tId))
                    .map(tId => ({
                        user_id: this.currentUser.id,
                        template_id: tId
                    }));

                if (newInserts.length > 0) {
                    const { error: insertErr } = await client.from('favorites').insert(newInserts);
                    if (insertErr) {
                        console.warn('Lưu favorites mới lên Supabase:', insertErr.message);
                    }
                }
                this.saveLocalFavorites();

                // Chỉ cập nhật trạng thái các nút tim trên thẻ nếu có thay đổi thực sự
                // Tuyệt đối KHÔNG gọi this.renderGallery() để tránh re-render giật lag/chạy lại animation thẻ
                if (hasChanges) {
                    this.favorites.forEach(favId => {
                        this.updateCardFavoriteUI(favId, true);
                    });
                    if (this.activeFilter && this.activeFilter.onlyFavorites) {
                        this.renderGallery();
                    }
                }
            }
        } catch (e) {
            console.error('Lỗi khi đồng bộ favorites:', e);
        } finally {
            this._isSyncingFavorites = false;
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
        try {
            const { data: { session } } = await client.auth.getSession();
            if (session && session.user) {
                this.currentUser = session.user;
                this.updateAuthUI();
                await this.loadUserProfile();
                this.updateAuthUI();
                await this.syncFavoritesWithSupabase();
            } else {
                this.currentUser = null;
                this.currentProfile = null;
                this.updateAuthUI();
            }
        } catch (e) {
            console.warn('Lỗi kiểm tra session Supabase:', e);
            this.updateAuthUI();
        }

        // Lắng nghe trạng thái Auth thay đổi (Đăng nhập, đăng xuất, OAuth callback)
        client.auth.onAuthStateChange(async (event, session) => {
            // Khi người dùng chuyển tab và quay lại, Supabase tự động kiểm tra và làm mới token ngầm (TOKEN_REFRESHED / INITIAL_SESSION).
            // Cập nhật ngay UI Auth nhưng không gọi lại renderGallery() để tránh reload animation.
            if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session && session.user) {
                    this.currentUser = session.user;
                    this.updateAuthUI();
                }
                return;
            }

            if (session && session.user) {
                const isSameUser = this.currentUser && this.currentUser.id === session.user.id;
                this.currentUser = session.user;
                this.updateAuthUI();
                if (!isSameUser) {
                    await this.loadUserProfile();
                    this.updateAuthUI();
                    await this.syncFavoritesWithSupabase();
                }
            } else {
                this.currentUser = null;
                this.currentProfile = null;
                this.updateAuthUI();
            }
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

        const isVi = (window.i18n && typeof window.i18n.getLang === 'function') 
            ? window.i18n.getLang() === 'vi' 
            : true;

        try {
            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname,
                    skipBrowserRedirect: true
                }
            });

            if (error) throw error;

            if (data?.url) {
                // Tiền kiểm tra URL để tránh chuyển hướng người dùng sang trang JSON lỗi nếu Google Provider chưa được kích hoạt trên Supabase
                try {
                    const testRes = await fetch(data.url, {
                        method: 'GET',
                        redirect: 'manual'
                    });

                    if (testRes.status === 400) {
                        const errData = await testRes.json().catch(() => null);
                        if (errData?.msg && errData.msg.includes('Unsupported provider')) {
                            const alertBox = document.getElementById('auth-alert');
                            const guideMsg = isVi 
                                ? 'Đăng nhập Google chưa được kích hoạt trên Supabase Dashboard. Vui lòng đăng nhập bằng Tên tài khoản / Email hoặc cấu hình Google Provider trong Supabase.'
                                : 'Google sign-in is not enabled in Supabase Dashboard. Please use Username / Email login or enable Google Provider in Supabase.';
                            if (alertBox) {
                                alertBox.className = 'auth-alert error';
                                alertBox.innerHTML = `<span>⚠️</span> <span>${guideMsg}</span>`;
                                alertBox.classList.remove('hidden');
                            }
                            if (window.toast) {
                                window.toast.warning(guideMsg, 6000, isVi ? 'Chưa bật Google Provider' : 'Google Provider Disabled');
                            }
                            return;
                        }
                    }
                } catch (probeErr) {
                    console.warn('Probe Google OAuth endpoint warning:', probeErr);
                }

                // Chuyển hướng trình duyệt tới màn hình đăng nhập Google thật
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Google OAuth error:', err);
            const msg = window.translateAuthError ? window.translateAuthError(err.message) : err.message;
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
            this.clearAuthPasswordFields();
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
            const form = document.getElementById('auth-form');
            if (form) form.reset();

            this.setAuthMode('login');
            this.clearAuthPasswordFields();
            modal.classList.remove('is-closing');
            modal.classList.remove('hidden');
            window.location.hash = 'login';
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

        // Tự động lưu vào tư vấn cá nhân và bắn thông báo phản hồi lên chuông của User
        this.notifyUserInquirySubmitted(payload);

        return true;
    }

    // 5.1. DỊCH TỰ ĐỘNG THÔNG MINH CHO TÊN MẪU NHÀ & PHONG CÁCH
    getLocalizedTemplateName(item, lang = window.i18n.getLang()) {
        if (!item) return '';
        if (lang === 'vi') return item.name_vi || item.name_en || '';
        if (item.name_en && item.name_en.trim() && item.name_en !== item.name_vi) {
            return item.name_en;
        }
        let en = item.name_vi || '';
        en = en.replace(/Nhà phố\s+(\d+)\s+tầng/gi, '$1-Story Modern Townhouse');
        en = en.replace(/Biệt thự\s+(\d+)\s+tầng/gi, '$1-Story Luxury Villa');
        en = en.replace(/Nhà cấp 4\s+(\d+)\s+tầng/gi, '$1-Story Country House');
        en = en.replace(/Nhà cấp 4/gi, 'Modern Country Bungalow');
        en = en.replace(/Nhà phố/gi, 'Modern Townhouse');
        en = en.replace(/Biệt thự vườn/gi, 'Garden Villa');
        en = en.replace(/Biệt thự/gi, 'Luxury Villa');
        en = en.replace(/Hiện Đại/gi, 'Modern');
        en = en.replace(/Mái Thái/gi, 'Gable Roof');
        en = en.replace(/Mái Nhật/gi, 'Hip Roof');
        en = en.replace(/Mái Bằng/gi, 'Flat Roof');
        en = en.replace(/Tân Cổ Điển/gi, 'Neo-Classical');
        en = en.replace(/Châu Âu/gi, 'European');
        en = en.replace(/Truyền Thống/gi, 'Traditional');
        en = en.replace(/Tiết Kiệm/gi, 'Budget-Friendly');
        en = en.replace(/Sang Trọng/gi, 'Luxury');
        en = en.replace(/Nghỉ Dưỡng/gi, 'Resort');
        en = en.replace(/Mặt Tiền/gi, 'Frontage');
        en = en.replace(/tầng/gi, 'Stories');
        return en;
    }

    getLocalizedStyle(item, lang = window.i18n.getLang()) {
        if (!item) return '';
        const styleDict = {
            'biet-thu': { vi: 'Biệt thự', en: 'Villa' },
            'nha-pho': { vi: 'Nhà phố', en: 'Townhouse' },
            'nha-cap-4': { vi: 'Nhà cấp 4', en: 'Bungalow' },
            'Biệt thự': { vi: 'Biệt thự', en: 'Villa' },
            'Nhà phố': { vi: 'Nhà phố', en: 'Townhouse' },
            'Nhà cấp 4': { vi: 'Nhà cấp 4', en: 'Bungalow' },
            'Hiện đại': { vi: 'Hiện đại', en: 'Modern' },
            'Tân cổ điển': { vi: 'Tân cổ điển', en: 'Neo-Classical' },
            'Cổ điển': { vi: 'Cổ điển', en: 'Classical' },
            'Mái Nhật': { vi: 'Mái Nhật', en: 'Japanese Roof' },
            'Mái Thái': { vi: 'Mái Thái', en: 'Thai Roof' },
            'Mái bằng': { vi: 'Mái bằng', en: 'Flat Roof' },
            'Mái bằng hiện đại': { vi: 'Mái bằng hiện đại', en: 'Modern Flat Roof' }
        };

        if (lang === 'vi') {
            return item.style_vi || (styleDict[item.type] ? styleDict[item.type].vi : item.type);
        }

        if (item.style_en && item.style_en.trim() && item.style_en !== item.style_vi) {
            return item.style_en;
        }
        if (item.style_vi && styleDict[item.style_vi.trim()]) {
            return styleDict[item.style_vi.trim()].en;
        }
        if (styleDict[item.type]) {
            return styleDict[item.type].en;
        }
        return item.style_en || item.type;
    }

    // 6. RENDER GIAO DIỆN THƯ VIỆN (GALLERY)
    renderGallery() {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        // Đồng bộ trạng thái giao diện nút Lọc yêu thích & Badge đếm
        const favCheckbox = document.getElementById('filter-fav-only');
        if (favCheckbox) favCheckbox.checked = !!this.activeFilter.onlyFavorites;
        document.getElementById('filter-fav-toggle-label')?.classList.toggle('is-active', !!this.activeFilter.onlyFavorites);
        this.updateFavoriteCountBadge();

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
            const isFavFilter = this.activeFilter.onlyFavorites;
            const isVi = lang === 'vi';
            if (isFavFilter) {
                gallery.innerHTML = `
                    <div class="empty-state fav-empty-state">
                        <div class="empty-fav-icon-wrapper">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            </svg>
                        </div>
                        <h3 class="empty-fav-title">${isVi ? 'Chưa có mẫu nhà yêu thích nào' : 'No saved favorite models'}</h3>
                        <p class="empty-fav-desc">${isVi ? 'Hãy bấm vào biểu tượng trái tim trên các mẫu thiết kế để lưu lại và xem nhanh tại đây.' : 'Click the heart icon on any house model to save it to your favorites list.'}</p>
                        <button type="button" class="btn-reset-fav" id="btn-reset-fav-filter">
                            ${isVi ? 'Khám phá tất cả mẫu nhà' : 'Browse all house models'} →
                        </button>
                    </div>
                `;
                document.getElementById('btn-reset-fav-filter')?.addEventListener('click', () => {
                    this.activeFilter.onlyFavorites = false;
                    if (favCheckbox) favCheckbox.checked = false;
                    document.getElementById('filter-fav-toggle-label')?.classList.remove('is-active');
                    this.animateGalleryTransition(() => {
                        this.renderGallery();
                    });
                });
            } else {
                gallery.innerHTML = `
                    <div class="empty-state">
                        <p>${window.i18n.t('empty_gallery')}</p>
                    </div>
                `;
            }
            return;
        }

        gallery.innerHTML = list.map((item, index) => {
            const name = this.getLocalizedTemplateName(item, lang);
            const displayBadge = this.getLocalizedStyle(item, lang);
            const costStr = window.i18n.formatCost(item.cost_estimate_vnd);
            const isFav = this.favorites.has(item.id);
            const isCompared = (this.compareList || []).includes(item.id);

            return `
                <article class="house-card" data-id="${item.id}" style="--card-index: ${index};">
                    <div class="card-thumb">
                        <img src="${item.photo_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'}" 
                             alt="${name}" loading="lazy" />
                        <span class="card-badge">${displayBadge}</span>
                        <!-- Nút Thêm So Sánh Nổi (Feature 4: Circular Glassmorphic Button) -->
                        <button type="button" 
                                class="card-compare-btn ${isCompared ? 'active' : ''}" 
                                data-compare-id="${item.id}" 
                                data-tooltip="${window.i18n.t(isCompared ? 'compare_btn_added' : 'compare_btn_add')}"
                                aria-label="${window.i18n.t(isCompared ? 'compare_btn_added' : 'compare_btn_add')}"
                                title="${window.i18n.t(isCompared ? 'compare_btn_added' : 'compare_btn_add')}">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                                <path d="M7 21h10"/>
                                <path d="M12 3v18"/>
                                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                            </svg>
                        </button>
                        <div class="u022 card-fav-u022 ${isFav ? 'is-on' : ''}" data-fav-id="${item.id}">
                            <div class="u022-scaler">
                                <button class="u022-btn card-fav-btn" 
                                        type="button" 
                                        data-fav-id="${item.id}" 
                                        aria-pressed="${isFav ? 'true' : 'false'}" 
                                        aria-label="${window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add')}" 
                                        title="${window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add')}">
                                    <span class="u022-ring" aria-hidden="true"></span>
                                    <span class="u022-dot" style="--a:0deg;--c:#FF4D6D;--c2:#FFB26B" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:51deg;--c:#8B6CFF;--c2:#FF7A93" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:103deg;--c:#FFB547;--c2:#22C3A6" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:154deg;--c:#FF4D6D;--c2:#8B6CFF" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:206deg;--c:#22C3A6;--c2:#FFB547" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:257deg;--c:#FF7A93;--c2:#3D8BFF" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-dot" style="--a:309deg;--c:#3D8BFF;--c2:#FF4D6D" aria-hidden="true"><i></i><i></i></span>
                                    <span class="u022-heart" aria-hidden="true">
                                        <svg viewBox="0 0 52 52">
                                            <defs>
                                                <linearGradient id="u022-g-${item.id}" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0" stop-color="#FF7A93"/>
                                                    <stop offset="1" stop-color="#F0264D"/>
                                                </linearGradient>
                                            </defs>
                                            <path class="u022-f" style="fill:url(#u022-g-${item.id})" d="M26 45S5 33 5 18.5C5 11.6 10.4 7 16.4 7c4.3 0 7.6 2.3 9.6 5.6C28 9.3 31.3 7 35.6 7 41.6 7 47 11.6 47 18.5 47 33 26 45 26 45z"/>
                                            <path class="u022-o" d="M26 45S5 33 5 18.5C5 11.6 10.4 7 16.4 7c4.3 0 7.6 2.3 9.6 5.6C28 9.3 31.3 7 35.6 7 41.6 7 47 11.6 47 18.5 47 33 26 45 26 45z"/>
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>
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
                if (e.target.closest('.card-fav-btn') || e.target.closest('.card-fav-u022') || e.target.closest('.card-compare-btn')) return;
                const id = card.getAttribute('data-id');
                this.openDetailPanel(id);
            });
        });

        // Gắn sự kiện nút so sánh nhanh trên từng thẻ mẫu nhà
        gallery.querySelectorAll('.card-compare-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-compare-id');
                this.toggleCompareItem(id);
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
    recordTemplateView(templateId) {
        if (!templateId) return;

        // 1. Tăng bộ đếm lượt xem cục bộ ngay lập tức (Zero-lag UI update)
        const item = this.templates.find(t => t.id === templateId);
        if (item) {
            item.view_count = (item.view_count || 0) + 1;
        }

        // 2. Chỉ gửi RPC lên Supabase nếu đã kích hoạt tính năng đồng bộ views (tránh lỗi 404 đỏ console khi chưa chạy SQL)
        const isRpcEnabled = !!(window.APP_CONFIG && window.APP_CONFIG.ENABLE_VIEW_RPC);
        if (!isRpcEnabled) return;

        // 3. Gửi RPC increment_template_view lên Supabase thời gian thực nếu id là UUID hợp lệ
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(templateId)) return;

        // Tránh spam RPC nếu phát hiện hàm chưa tồn tại trên schema cache Supabase
        if (this._rpcIncrementMissing) return;

        const client = this.getSupabase();
        if (client && typeof client.rpc === 'function') {
            client.rpc('increment_template_view', { t_id: templateId }).then(({ error }) => {
                if (error) {
                    if (error.code === 'PGRST202' || (error.message && error.message.includes('schema cache'))) {
                        this._rpcIncrementMissing = true;
                    }
                }
            }).catch(() => {
                this._rpcIncrementMissing = true;
            });
        }
    }

    openDetailPanel(templateId) {
        const item = this.templates.find(t => t.id === templateId);
        if (!item) return;

        this.currentTemplate = item;
        // Ghi nhận lượt xem thời gian thực khi người dùng bấm vào xem mẫu
        this.recordTemplateView(item.id);

        const panel = document.getElementById('detail-modal');
        if (!panel) return;

        this.updateDetailPanelContent(item);
        panel.classList.remove('is-closing');
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
        if (!panel || panel.classList.contains('hidden')) return;
        if (panel.classList.contains('is-closing')) return;

        const closeBtn = document.getElementById('close-detail-modal');
        if (closeBtn) closeBtn.classList.add('is-active');

        panel.classList.add('is-closing');

        setTimeout(() => {
            panel.classList.add('hidden');
            panel.classList.remove('is-closing');
            document.body.style.overflow = '';
            if (closeBtn) closeBtn.classList.remove('is-active');
        }, 280);
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
        const name = this.getLocalizedTemplateName(item, lang);
        const desc = lang === 'vi' ? item.description_vi : (item.description_en || item.description_vi);
        const rooms = lang === 'vi' ? item.rooms_vi : (item.rooms_en || item.rooms_vi);
        const style = this.getLocalizedStyle(item, lang);
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

        this.updateDetailCalculator(item);
        this.updateDetailFloorplans(item);
        this.updateDetailFengShui(item);
        this.updateDetailFavButton();
        this.updateDetailCompareButton();
    }

    updateDetailFavButton() {
        const btn = document.getElementById('detail-fav-btn');
        if (!btn || !this.currentTemplate) return;
        const isFav = this.favorites.has(this.currentTemplate.id);
        btn.textContent = window.i18n.t(isFav ? 'btn_favorite_remove' : 'btn_favorite_add');
        btn.classList.toggle('active', isFav);
    }

    updateDetailCompareButton() {
        const btn = document.getElementById('detail-compare-btn');
        if (!btn || !this.currentTemplate) return;
        const isCompared = (this.compareList || []).includes(this.currentTemplate.id);
        btn.textContent = window.i18n.t(isCompared ? 'detail_btn_remove_compare' : 'detail_btn_add_compare');
        btn.classList.toggle('active', isCompared);
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
                this.renderGallery();
            });
        }

        // Dropdown bộ lọc tùy chỉnh với hiệu ứng animation mượt mà (Animate-UI)
        this.setupCustomDropdowns();

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

        // Checkbox chỉ xem yêu thích với animation chuyển cảnh mượt mà
        const favCheckbox = document.getElementById('filter-fav-only');
        if (favCheckbox) {
            favCheckbox.addEventListener('change', (e) => {
                this.activeFilter.onlyFavorites = e.target.checked;
                document.getElementById('filter-fav-toggle-label')?.classList.toggle('is-active', e.target.checked);
                this.animateGalleryTransition(() => {
                    this.renderGallery();
                });
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
                this.closeInquiryDetailModal();
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

        // Nút so sánh trong panel chi tiết (Feature 4)
        document.getElementById('detail-compare-btn')?.addEventListener('click', () => {
            if (this.currentTemplate) {
                this.toggleCompareItem(this.currentTemplate.id);
            }
        });

        // Nút xuất hồ sơ Concept PDF (Feature 5)
        document.getElementById('detail-export-pdf-btn')?.addEventListener('click', () => {
            if (this.currentTemplate) {
                this.openBrochureModal(this.currentTemplate);
            }
        });

        // Nút "Nhận báo giá mẫu này" trong panel -> cuộn xuống form liên hệ và tự điền tên mẫu kèm phương án dự toán đã chọn
        document.getElementById('detail-inquire-btn')?.addEventListener('click', () => {
            const template = this.currentTemplate;
            this.closeDetailPanel();
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                this.scrollToSection(contactSection);
            }
            if (template) {
                const lang = window.i18n.getLang();
                const templateName = this.getLocalizedTemplateName(template, lang);
                const calcState = this.detailCalcState || {};
                const pkgName = window.i18n.t(`pkg_${calcState.pkg || 'premium'}`);
                const fndName = window.i18n.t(`fnd_${calcState.fnd || 'coc'}`);
                const totalCostFormatted = window.i18n.formatCost(this.currentDetailCalcTotal || template.cost_estimate_vnd);
                const equivArea = this.currentDetailEquivArea || template.gfa_m2;

                const msgInput = document.getElementById('inquiry-message');
                if (msgInput) {
                    msgInput.value = lang === 'vi'
                        ? `Tôi quan tâm mẫu "${templateName}".\n• Phương án dự toán: Gói ${pkgName}, ${fndName}.\n• Diện tích quy đổi: ~${equivArea} m² sàn.\n• Dự toán ước tính: ${totalCostFormatted}.\nNhờ Kiến trúc sư DreamHouse tư vấn chi tiết hồ sơ thiết kế & phương án thi công.`
                        : `I am interested in the "${templateName}" design.\n• Estimate plan: ${pkgName} Package, ${fndName}.\n• Equivalent construction area: ~${equivArea} m².\n• Estimated investment: ${totalCostFormatted}.\nPlease provide detailed architectural layouts and turnkey construction quotation.`;
                }
                const refLabel = document.getElementById('inquiry-selected-model');
                if (refLabel) {
                    refLabel.textContent = `${templateName} (${totalCostFormatted})`;
                    refLabel.dataset.templateId = template.id;
                }
                setTimeout(() => {
                    document.getElementById('inquiry-name')?.focus();
                }, 400);
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
                document.getElementById('filter-fav-toggle-label')?.classList.add('is-active');
                this.animateGalleryTransition(() => {
                    this.renderGallery();
                });
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
            const currentPassInput = document.getElementById('profile-current-pass');
            const newPassInput = document.getElementById('profile-new-pass');
            const confirmPassInput = document.getElementById('profile-confirm-pass');
            if (body && toggle) {
                const isHidden = body.classList.toggle('hidden');
                toggle.setAttribute('aria-expanded', String(!isHidden));
                const isVi = window.i18n.getLang() === 'vi';
                if (pillText) {
                    pillText.textContent = isHidden ? (isVi ? 'Mở' : 'Expand') : (isVi ? 'Thu gọn' : 'Collapse');
                }
                if (!isHidden) {
                    // Triệt để chống Chrome Password Manager tự động điền mật khẩu cũ
                    [currentPassInput, newPassInput, confirmPassInput].forEach(inp => {
                        if (inp) {
                            inp.value = '';
                            inp.setAttribute('readonly', 'readonly');
                        }
                    });
                    setTimeout(() => {
                        const secCard = document.getElementById('security-card');
                        secCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        [currentPassInput, newPassInput, confirmPassInput].forEach(inp => {
                            if (inp && document.activeElement !== inp) {
                                inp.value = '';
                            }
                        });
                    }, 100);
                    setTimeout(() => {
                        [currentPassInput, newPassInput, confirmPassInput].forEach(inp => {
                            if (inp && document.activeElement !== inp) {
                                inp.value = '';
                            }
                        });
                    }, 300);
                }
            }
        });

        // Gỡ bỏ readonly ngay khi người dùng chủ động click hoặc focus để nhập
        ['profile-current-pass', 'profile-new-pass', 'profile-confirm-pass'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const enableInput = () => el.removeAttribute('readonly');
                el.addEventListener('focus', enableInput);
                el.addEventListener('pointerdown', enableInput);
                el.addEventListener('click', enableInput);
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
        setupEyeToggle('toggle-current-pass-visibility', 'profile-current-pass');
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
        // Xử lý Chọn ảnh từ máy tính cho Avatar
        const avatarFileInput = document.getElementById('profile-avatar-file');
        const btnBrowseAvatar = document.getElementById('btn-browse-avatar');
        const avatarPreviewBox = document.getElementById('profile-avatar-preview');
        const avatarFileName = document.getElementById('profile-avatar-filename');
        const toggleAvatarUrlBtn = document.getElementById('toggle-avatar-url-mode');
        const avatarUrlContainer = document.getElementById('avatar-url-container');
        const avatarUrlInput = document.getElementById('profile-avatar-url');

        btnBrowseAvatar?.addEventListener('click', () => avatarFileInput?.click());
        avatarPreviewBox?.addEventListener('click', () => avatarFileInput?.click());

        toggleAvatarUrlBtn?.addEventListener('click', () => {
            if (avatarUrlContainer) {
                avatarUrlContainer.classList.toggle('hidden');
                if (!avatarUrlContainer.classList.contains('hidden')) {
                    avatarUrlInput?.focus();
                }
            }
        });

        avatarFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                if (window.toast) window.toast.warning('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP).');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                if (window.toast) window.toast.warning('Kích thước ảnh tối đa là 10 MB.');
                return;
            }

            if (avatarFileName) {
                const sizeKb = Math.round(file.size / 1024);
                avatarFileName.textContent = `✓ ${file.name} (${sizeKb} KB)`;
                avatarFileName.style.color = 'var(--color-accent)';
            }

            try {
                const compressed = await this.compressAvatarImage(file, 320, 320, 0.85);
                if (avatarUrlInput) avatarUrlInput.value = compressed;
                this.pendingAvatarFile = file;
                this.pendingAvatarBase64 = compressed;
                const nameInput = document.getElementById('profile-name');
                this.renderProfileModalAvatar(compressed, nameInput?.value || '');
            } catch (err) {
                console.error('Lỗi nén ảnh avatar:', err);
                const reader = new FileReader();
                reader.onload = (re) => {
                    const result = re.target?.result;
                    if (avatarUrlInput) avatarUrlInput.value = result;
                    this.pendingAvatarFile = file;
                    this.pendingAvatarBase64 = result;
                    const nameInput = document.getElementById('profile-name');
                    this.renderProfileModalAvatar(result, nameInput?.value || '');
                };
                reader.readAsDataURL(file);
            }
        });

        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const url = chip.getAttribute('data-avatar') || '';
                const avatarInput = document.getElementById('profile-avatar-url');
                const nameInput = document.getElementById('profile-name');
                if (avatarInput) avatarInput.value = url;
                this.pendingAvatarFile = null;
                this.pendingAvatarBase64 = null;
                if (avatarFileName) {
                    avatarFileName.textContent = url ? 'Đã chọn mẫu ảnh nhanh' : 'Đang dùng chữ cái';
                    avatarFileName.style.color = 'var(--color-text-muted)';
                }
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

        // Mặc định khởi tạo ở chế độ Đăng nhập
        this.setAuthMode('login');

        loginBtn?.addEventListener('click', () => {
            this.setAuthMode('login');
            this.clearAuthPasswordFields();

            modal?.classList.remove('is-closing');
            modal?.classList.remove('hidden');
            window.location.hash = 'login';
        });

        document.getElementById('auth-back-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAuthModal();
        });
        document.getElementById('close-auth-modal')?.addEventListener('click', (e) => {
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
            const targetMode = this.isAuthRegisterMode ? 'login' : 'register';
            this.setAuthMode(targetMode);
            window.location.hash = targetMode;
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
            this.smoothScrollTo('#gallery-section', 84);
        });

        // Nhấn phím Escape để đóng nhanh màn hình Auth
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeAuthModal();
            }
        });

        // Kiểm tra mở Auth tự động nếu URL có hash #login hoặc #register
        if (window.location.hash === '#login' || window.location.hash === '#register') {
            this.setAuthMode(window.location.hash === '#register' ? 'register' : 'login');
            modal?.classList.remove('is-closing');
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

            // Chốt chặn kép: Chỉ xử lý đăng ký khi cờ isAuthRegisterMode là true VÀ nhóm xác nhận mật khẩu đang hiển thị trên giao diện
            const confirmPassGroup = document.getElementById('auth-confirm-pass-group');
            const isConfirmVisible = confirmPassGroup && confirmPassGroup.style.display !== 'none';
            const isActuallyRegister = Boolean(this.isAuthRegisterMode && isConfirmVisible);

            if (isActuallyRegister) {
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

        // Khởi tạo bộ điều hướng cuộn mượt cao cấp
        this.setupSmoothScroll();
    }

    /**
     * Khởi tạo bộ điều khiển cuộn mượt tức thì (Instant Compositor Smooth Scroll)
     */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || href === '#' || href.length <= 1) return;

                // Bỏ qua các hash điều hướng modal
                if (href === '#login' || href === '#register') return;

                const targetEl = document.querySelector(href);
                if (targetEl) {
                    e.preventDefault();

                    // Đóng dropdown menu tài khoản nếu đang mở
                    const userMenu = document.getElementById('user-dropdown-menu');
                    if (userMenu && !userMenu.classList.contains('hidden')) {
                        userMenu.classList.add('hidden');
                        document.getElementById('user-profile-trigger')?.setAttribute('aria-expanded', 'false');
                    }

                    // Nếu nhấp "Mẫu nhà đã lưu yêu thích", tự động kích hoạt bộ lọc yêu thích
                    if (link.id === 'menu-favorites-link') {
                        const favCheckbox = document.getElementById('filter-fav-only');
                        if (favCheckbox && !favCheckbox.checked) {
                            favCheckbox.checked = true;
                            this.activeFilter.onlyFavorites = true;
                            document.getElementById('filter-fav-toggle-label')?.classList.add('is-active');
                            this.animateGalleryTransition(() => {
                                this.renderGallery();
                            });
                        }
                    }

                    // Cuộn chuẩn xác đến mục với tỉ lệ căn lề mắt nhìn hoàn hảo (không thừa không thiếu)
                    this.scrollToSection(targetEl);

                    // Cập nhật URL hash nhẹ nhàng
                    if (window.history && window.history.pushState) {
                        window.history.pushState(null, null, href);
                    }
                }
            });
        });
    }

    /**
     * Cuộn trang mượt mà chuẩn xác từng pixel theo tỉ lệ vàng điểm nhìn (GPU Accelerated)
     * @param {string|HTMLElement} target - Bộ chọn CSS hoặc phần tử DOM cần cuộn tới
     * @param {number} [customGap] - Khoảng đệm từ đáy header cố định đến đỉnh tiêu đề (px)
     */
    scrollToSection(target, customGap) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;

        const header = document.querySelector('.site-header');
        const headerHeight = header ? header.offsetHeight : 76;

        // Căn chuẩn vào đỉnh phần tử tiêu đề mục để mắt nhìn vào tự nhiên và cân đối nhất
        const sectionTitle = element.querySelector('.section-title') || element;
        const rect = sectionTitle.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Khoảng cách vàng thanh lịch: cách đáy header cố định đúng 26px
        const topGap = (typeof customGap === 'number') ? customGap : 26;
        const targetY = rect.top + scrollTop - headerHeight - topGap;

        // Gọi trực tiếp native smooth scroll của browser engine
        window.scrollTo({
            top: Math.max(0, Math.round(targetY)),
            behavior: 'smooth'
        });
    }

    // Giữ hàm alias smoothScrollTo để tương thích ngược tuyệt đối
    smoothScrollTo(target, offset) {
        this.scrollToSection(target);
    }

    setupThemeToggle() {
        // Theme toggle được quản lý với hiệu ứng Circular Reveal (219) ngay trong index.html
    }

    /**
     * Khởi tạo Bộ Tính Dự Toán Chi Phí Tương Tác (Feature 1: Interactive Cost Engine 2026)
     * Chuẩn Kỹ thuật Xây dựng Dân dụng Việt Nam & Giao diện Luxury Bento Box
     */
    initCostCalculator() {
        this.detailCalcState = {
            pkg: 'premium',
            rate: 7200000,
            fnd: 'coc',
            coef: 0.40
        };

        this.quickCalcState = {
            width: 5.0,
            depth: 16.0,
            floors: 2,
            roof: 'hip',
            roofCoef: 0.70,
            fnd: 'coc',
            fndCoef: 0.40,
            pkg: 'premium',
            pkgRate: 7200000
        };

        // 1. Sự kiện chọn Gói vật tư trong Detail Modal
        const detailPkgPills = document.querySelectorAll('#detail-calc-packages .calc-pkg-pill');
        detailPkgPills.forEach(pill => {
            pill.addEventListener('click', () => {
                detailPkgPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.detailCalcState.pkg = pill.dataset.pkg;
                this.detailCalcState.rate = Number(pill.dataset.rate) || 7200000;
                
                const rateText = (this.detailCalcState.rate / 1000000).toFixed(1) + ' tr/m²';
                const rateEl = document.getElementById('detail-calc-unit-rate');
                if (rateEl) rateEl.textContent = rateText;

                if (this.currentTemplate) {
                    this.updateDetailCalculator(this.currentTemplate);
                }
            });
        });

        // 2. Sự kiện chọn Loại móng trong Detail Modal
        const detailFndPills = document.querySelectorAll('#detail-calc-foundations .calc-fnd-pill');
        detailFndPills.forEach(pill => {
            pill.addEventListener('click', () => {
                detailFndPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.detailCalcState.fnd = pill.dataset.fnd;
                this.detailCalcState.coef = Number(pill.dataset.coef) || 0.40;

                const hintEl = document.getElementById('detail-calc-fnd-info');
                if (hintEl) {
                    const percent = Math.round(this.detailCalcState.coef * 100);
                    hintEl.textContent = `+${percent}% sàn trệt`;
                }

                if (this.currentTemplate) {
                    this.updateDetailCalculator(this.currentTemplate);
                }
            });
        });

        // 3. Khởi tạo Modal Dự toán Nhanh (Quick Estimator Modal)
        this.setupQuickEstimatorModal();
    }

    /**
     * Tính toán chi phí dự toán chuẩn kỹ sư xây dựng
     */
    calculateConstructionCost(groundAreaM2, totalFloorAreaM2, roofCoef, fndCoef, unitRate) {
        // Diện tích móng = Diện tích sàn trệt × Hệ số móng
        const fndArea = groundAreaM2 * fndCoef;
        // Diện tích các tầng = Tổng diện tích sàn các tầng
        const floorsArea = totalFloorAreaM2;
        // Diện tích mái = Diện tích sàn trệt × Hệ số mái
        const roofArea = groundAreaM2 * roofCoef;

        // Tổng diện tích quy đổi xây dựng (Equivalent Gross Construction Area)
        const equivArea = Math.round(fndArea + floorsArea + roofArea);
        const total = Math.round(equivArea * unitRate);

        // Bóc tách 4 cấu phần chuẩn ngành xây dựng:
        // 1. Thô & Kết cấu: 52%
        // 2. Hoàn thiện kiến trúc: 33%
        // 3. Cơ điện MEP (Điện nước): 10%
        // 4. Quản lý, Giám sát & Dự phòng: 5%
        const raw = Math.round(total * 0.52);
        const finish = Math.round(total * 0.33);
        const me = Math.round(total * 0.10);
        const mgmt = total - raw - finish - me; // 5% còn lại để cân bằng 100%

        return { equivArea, total, raw, finish, me, mgmt };
    }

    /**
     * Cập nhật số liệu hiển thị trong Detail Modal Calculator
     */
    updateDetailCalculator(item) {
        if (!item) return;

        const floors = Number(item.floors) || 2;
        const gfa = Number(item.gfa_m2) || 160;
        const groundArea = (item.width_m && item.depth_m) ? (item.width_m * item.depth_m) : Math.round(gfa / floors);

        // Xác định hệ số mái theo kiểu mái của mẫu
        let roofCoef = 0.70; // Mặc định Mái Nhật / Mái Thái
        if (item.roof === 'flat') roofCoef = 0.35;
        else if (item.roof === 'tile') roofCoef = 1.00;

        const fndCoef = this.detailCalcState?.coef || 0.40;
        const unitRate = this.detailCalcState?.rate || 7200000;

        const res = this.calculateConstructionCost(groundArea, gfa, roofCoef, fndCoef, unitRate);
        this.currentDetailCalcTotal = res.total;
        this.currentDetailEquivArea = res.equivArea;

        // Cập nhật DOM
        const equivBadge = document.getElementById('detail-calc-equiv-badge');
        if (equivBadge) equivBadge.textContent = `${res.equivArea} m² quy đổi`;

        const totalEl = document.getElementById('detail-calc-total-val');
        if (totalEl) totalEl.textContent = window.i18n.formatCost(res.total);

        const rawEl = document.getElementById('detail-breakdown-raw');
        if (rawEl) rawEl.textContent = window.i18n.formatCost(res.raw);

        const finishEl = document.getElementById('detail-breakdown-finish');
        if (finishEl) finishEl.textContent = window.i18n.formatCost(res.finish);

        const meEl = document.getElementById('detail-breakdown-me');
        if (meEl) meEl.textContent = window.i18n.formatCost(res.me);

        const mgmtEl = document.getElementById('detail-breakdown-mgmt');
        if (mgmtEl) mgmtEl.textContent = window.i18n.formatCost(res.mgmt);
    }

    /**
     * Thiết lập Modal Dự Toán Xây Nhà Nhanh (Quick Estimator Modal)
     */
    setupQuickEstimatorModal() {
        const modal = document.getElementById('quick-calc-modal');
        if (!modal) return;

        const openBtnNav = document.getElementById('nav-open-calc');
        const openBtnHero = document.getElementById('hero-calc-btn');
        const closeBtn = document.getElementById('close-quick-calc-modal');

        const openModal = () => {
            modal.classList.remove('hidden');
            modal.classList.remove('is-closing');
            document.body.style.overflow = 'hidden';
            this.recalcQuickEstimator();
        };

        const closeModal = () => {
            if (modal.classList.contains('hidden') || modal.classList.contains('is-closing')) return;
            modal.classList.add('is-closing');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('is-closing');
                document.body.style.overflow = '';
            }, 260);
        };

        openBtnNav?.addEventListener('click', openModal);
        openBtnHero?.addEventListener('click', openModal);
        closeBtn?.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        // 1. Slider Chiều rộng mặt tiền
        const widthSlider = document.getElementById('qc-width');
        const widthVal = document.getElementById('qc-width-val');
        widthSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.quickCalcState.width = val;
            if (widthVal) widthVal.textContent = val.toFixed(1) + ' m';
            this.recalcQuickEstimator();
        });

        // 2. Slider Chiều sâu khu đất
        const depthSlider = document.getElementById('qc-depth');
        const depthVal = document.getElementById('qc-depth-val');
        depthSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.quickCalcState.depth = val;
            if (depthVal) depthVal.textContent = val.toFixed(1) + ' m';
            this.recalcQuickEstimator();
        });

        // 3. Số tầng
        const floorPills = document.querySelectorAll('#qc-floors-group .qc-btn-pill');
        floorPills.forEach(pill => {
            pill.addEventListener('click', () => {
                floorPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.quickCalcState.floors = parseInt(pill.dataset.floors, 10) || 2;
                this.recalcQuickEstimator();
            });
        });

        // 4. Kiểu mái
        const roofPills = document.querySelectorAll('#qc-roof-group .qc-btn-pill');
        roofPills.forEach(pill => {
            pill.addEventListener('click', () => {
                roofPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.quickCalcState.roof = pill.dataset.roof;
                this.quickCalcState.roofCoef = parseFloat(pill.dataset.coef) || 0.70;
                this.recalcQuickEstimator();
            });
        });

        // 5. Loại móng
        const fndPills = document.querySelectorAll('#qc-fnd-group .qc-btn-pill');
        fndPills.forEach(pill => {
            pill.addEventListener('click', () => {
                fndPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.quickCalcState.fnd = pill.dataset.fnd;
                this.quickCalcState.fndCoef = parseFloat(pill.dataset.coef) || 0.40;
                this.recalcQuickEstimator();
            });
        });

        // 6. Gói vật tư
        const pkgCards = document.querySelectorAll('#qc-pkg-group .qc-pkg-card');
        pkgCards.forEach(card => {
            card.addEventListener('click', () => {
                pkgCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.quickCalcState.pkg = card.dataset.pkg;
                this.quickCalcState.pkgRate = parseInt(card.dataset.rate, 10) || 7200000;
                this.recalcQuickEstimator();
            });
        });

        // 7. Nút xem chi tiết mẫu nhà gợi ý
        document.getElementById('qc-btn-view-match')?.addEventListener('click', () => {
            if (this._matchedQuickTemplate) {
                closeModal();
                setTimeout(() => {
                    this.openDetailPanel(this._matchedQuickTemplate.id);
                }, 280);
            }
        });

        // 8. Nút "Gửi dự toán này để KTS tư vấn chi tiết →"
        document.getElementById('qc-btn-send-consult')?.addEventListener('click', () => {
            closeModal();
            const contactSection = document.getElementById('contact-section');
            if (contactSection) {
                this.scrollToSection(contactSection);
            }
            const state = this.quickCalcState;
            const res = this._lastQuickCalcResult || {};
            const pkgName = window.i18n.t(`pkg_${state.pkg}`);
            const fndName = window.i18n.t(`fnd_${state.fnd}`);
            const roofName = window.i18n.t(`roof_${state.roof}_short`) || state.roof;
            const costFormatted = window.i18n.formatCost(res.total || 0);

            const isVi = window.i18n.getLang() === 'vi';
            const msgInput = document.getElementById('inquiry-message');
            if (msgInput) {
                msgInput.value = isVi
                    ? `Dự toán tự tính cho khu đất ${state.width}m × ${state.depth}m (${state.width * state.depth}m²):\n• Quy mô: ${state.floors} tầng, ${roofName}.\n• Kết cấu móng: ${fndName}.\n• Gói vật tư: ${pkgName} (${(state.pkgRate / 1000000).toFixed(1)} tr/m²).\n• Diện tích sàn quy đổi: ~${res.equivArea || 0} m².\n• Tổng mức đầu tư ước tính: ${costFormatted}.\nNhờ KTS Võ Quốc Việt liên hệ tư vấn phương án bố trí mặt bằng tối ưu!`
                    : `Self-calculated estimate for land plot ${state.width}m × ${state.depth}m (${state.width * state.depth}m²):\n• Scale: ${state.floors} storeys, ${roofName}.\n• Foundation: ${fndName}.\n• Material package: ${pkgName} (${(state.pkgRate / 1000000).toFixed(1)}M VND/m²).\n• Equivalent gross floor area: ~${res.equivArea || 0} m².\n• Estimated total investment: ${costFormatted}.\nPlease provide architectural consultation and floor plan options!`;
            }
            const refLabel = document.getElementById('inquiry-selected-model');
            if (refLabel) {
                refLabel.textContent = isVi 
                    ? `Dự toán đất ${state.width}m×${state.depth}m (${costFormatted})`
                    : `Custom ${state.width}m×${state.depth}m (${costFormatted})`;
                delete refLabel.dataset.templateId;
            }
            if (window.toast) {
                window.toast.success(isVi ? 'Đã nạp bảng dự toán vào form tư vấn bên dưới!' : 'Estimate prefilled into consultation form below!');
            }
            setTimeout(() => {
                document.getElementById('inquiry-name')?.focus();
            }, 450);
        });
    }

    /**
     * Tính toán và cập nhật giao diện Quick Estimator Modal
     */
    recalcQuickEstimator() {
        const state = this.quickCalcState;
        if (!state) return;

        const landArea = state.width * state.depth;
        const totalFloorsArea = landArea * state.floors;

        const res = this.calculateConstructionCost(landArea, totalFloorsArea, state.roofCoef, state.fndCoef, state.pkgRate);
        this._lastQuickCalcResult = res;

        // Cập nhật các ô số liệu
        const landEl = document.getElementById('qc-res-land');
        if (landEl) landEl.textContent = `${landArea.toFixed(1)} m²`;

        const gfaEl = document.getElementById('qc-res-gfa');
        if (gfaEl) gfaEl.textContent = `${res.equivArea} m²`;

        const totalEl = document.getElementById('qc-res-total');
        if (totalEl) totalEl.textContent = window.i18n.formatCost(res.total);

        const formulaEl = document.getElementById('qc-res-formula');
        if (formulaEl) {
            formulaEl.textContent = `${res.equivArea} m² × ${(state.pkgRate / 1000000).toFixed(1)} tr/m²`;
        }

        const rawEl = document.getElementById('qc-val-raw');
        if (rawEl) rawEl.textContent = window.i18n.formatCost(res.raw);

        const finishEl = document.getElementById('qc-val-finish');
        if (finishEl) finishEl.textContent = window.i18n.formatCost(res.finish);

        const meEl = document.getElementById('qc-val-me');
        if (meEl) meEl.textContent = window.i18n.formatCost(res.me);

        const mgmtEl = document.getElementById('qc-val-mgmt');
        if (mgmtEl) mgmtEl.textContent = window.i18n.formatCost(res.mgmt);

        // Tìm mẫu nhà tương thích nhất trong thư viện
        if (this.templates && this.templates.length > 0) {
            let bestTpl = null;
            let minDiff = Infinity;
            this.templates.forEach(t => {
                const diff = Math.abs((t.width_m || 5) - state.width) * 2 +
                             Math.abs((t.depth_m || 16) - state.depth) * 0.8 +
                             Math.abs((t.floors || 2) - state.floors) * 5;
                if (diff < minDiff) {
                    minDiff = diff;
                    bestTpl = t;
                }
            });

            this._matchedQuickTemplate = bestTpl || this.templates[0];
            const lang = window.i18n.getLang();
            const matchNameEl = document.getElementById('qc-match-name');
            const matchSpecEl = document.getElementById('qc-match-spec');
            const matchImgEl = document.getElementById('qc-match-img');

            if (matchNameEl && this._matchedQuickTemplate) {
                matchNameEl.textContent = this.getLocalizedTemplateName(this._matchedQuickTemplate, lang);
            }
            if (matchSpecEl && this._matchedQuickTemplate) {
                const roofName = window.i18n.t(`roof_${this._matchedQuickTemplate.roof}`) || this._matchedQuickTemplate.roof;
                matchSpecEl.textContent = `${this._matchedQuickTemplate.width_m}m × ${this._matchedQuickTemplate.depth_m}m • ${this._matchedQuickTemplate.floors} tầng • ${roofName}`;
            }
            if (matchImgEl && this._matchedQuickTemplate) {
                matchImgEl.src = this._matchedQuickTemplate.photo_path || '';
                matchImgEl.alt = matchNameEl ? matchNameEl.textContent : 'House';
            }
        }
    }

    /**
     * =========================================================================
     * TÍNH NĂNG 2: BÓC TÁCH MẶT BẰNG 2D/3D TỪNG TẦNG (FLOOR-BY-FLOOR EXPLORER)
     * Kiến trúc Vector CAD Blueprint & Bóc tách diện tích phòng chi tiết
     * =========================================================================
     */
    initFloorplanExplorer() {
        this.currentFloorIndex = 0;
        this._currentFloorsData = [];

        // 1. Điều hướng Visual Tabs (Phối cảnh | 3D | Mặt bằng tầng)
        const visualNavBtns = document.querySelectorAll('.visual-nav-btn');
        visualNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                visualNavBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                const targetTab = btn.dataset.visualTab;
                if (targetTab === 'photo') {
                    document.getElementById('detail-photo-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (targetTab === 'viewer') {
                    document.getElementById('detail-viewer-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    setTimeout(() => this.viewer3D?.handleResize(), 250);
                } else if (targetTab === 'floorplan') {
                    document.getElementById('detail-floorplan-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        });

        // 2. Nút Phóng to bản vẽ toàn màn hình (Fullscreen Lightbox)
        document.getElementById('btn-fp-zoom')?.addEventListener('click', () => {
            this.openFloorplanLightbox();
        });

        // 3. Nút Mặt cắt 3D từ trên cao (Isometric 3D Cutaway)
        document.getElementById('btn-fp-iso3d')?.addEventListener('click', () => {
            const viewerBtn = document.querySelector('.visual-nav-btn[data-visual-tab="viewer"]');
            if (viewerBtn) viewerBtn.click();
            if (this.viewer3D) {
                this.viewer3D.setCameraPreset('top');
            }
            if (window.toast) {
                const isVi = window.i18n.getLang() === 'vi';
                window.toast.info(isVi ? 'Đang chuyển sang góc nhìn mặt cắt 3D từ trên cao' : 'Switching to 3D Top-Down Isometric view', 2200);
            }
        });

        // 4. Modal Lightbox đóng
        const lightboxModal = document.getElementById('floorplan-lightbox-modal');
        const closeLightboxBtn = document.getElementById('close-floorplan-lightbox');

        const closeLightbox = () => {
            if (!lightboxModal || lightboxModal.classList.contains('hidden')) return;
            lightboxModal.classList.add('is-closing');
            setTimeout(() => {
                lightboxModal.classList.add('hidden');
                lightboxModal.classList.remove('is-closing');
                document.body.style.overflow = '';
            }, 240);
        };

        closeLightboxBtn?.addEventListener('click', closeLightbox);
        lightboxModal?.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxModal && !lightboxModal.classList.contains('hidden')) {
                closeLightbox();
            }
        });
    }

    /**
     * Sinh dữ liệu bóc tách mặt bằng kiến trúc chuẩn kỹ thuật cho từng tầng
     */
    generateFloorplanData(template) {
        if (!template) return [];

        const floorsCount = Math.max(1, parseInt(template.floors, 10) || 1);
        const w = template.width_m || 5.0;
        const d = template.depth_m || 16.0;
        const groundArea = Math.round(w * d);
        const lang = window.i18n.getLang();
        const isVi = lang === 'vi';

        const floors = [];

        // 1. TẦNG 1 (TRỆT)
        const f1Rooms = [];
        if (template.type === 'nha-cap-4') {
            f1Rooms.push({ id: 'r1', name: isVi ? 'Sảnh chính & Hiên đón' : 'Main Porch & Entry', area: Math.round(w * 1.5), icon: '🚪', desc: isVi ? 'Bậc tam cấp phong thủy' : 'Entrance porch' });
            f1Rooms.push({ id: 'r2', name: isVi ? 'Phòng khách & Phòng thờ' : 'Living & Altar Hall', area: Math.round(w * 4.5), icon: '🛋️', desc: isVi ? 'Không gian sinh hoạt trung tâm' : 'Central living hall' });
            f1Rooms.push({ id: 'r3', name: isVi ? 'Bếp & Phòng ăn liên hoàn' : 'Kitchen & Dining', area: Math.round(w * 3.2), icon: '🍳', desc: isVi ? 'Bếp chữ L thông thoáng' : 'Open continuous dining' });
            f1Rooms.push({ id: 'r4', name: isVi ? 'Phòng ngủ 1 (Master)' : 'Master Bedroom', area: 18, icon: '🛏️', desc: isVi ? 'Có WC khép kín' : 'En-suite bath' });
            f1Rooms.push({ id: 'r5', name: isVi ? 'Phòng ngủ 2' : 'Bedroom 2', area: 14, icon: '🛏️', desc: isVi ? 'Cửa sổ đón nắng mai' : 'Window garden view' });
            f1Rooms.push({ id: 'r6', name: isVi ? 'Phòng ngủ 3' : 'Bedroom 3', area: 13, icon: '🛏️', desc: isVi ? 'Phòng trẻ em / khách' : 'Kids / Guest room' });
            f1Rooms.push({ id: 'r7', name: isVi ? 'Nhà vệ sinh chung (WC)' : 'Common Bathroom', area: 5, icon: '🚿', desc: isVi ? 'Phân khu khô ướt' : 'Wet & dry separation' });
            f1Rooms.push({ id: 'r8', name: isVi ? 'Sân ướt & Giặt phơi sau' : 'Service Yard', area: Math.max(6, Math.round(groundArea - 18 - 14 - 13 - 5 - (w * 4.5) - (w * 3.2))), icon: '🧺', desc: isVi ? 'Lối ra vườn sau' : 'Rear garden egress' });
        } else if (template.type === 'biet-thu') {
            f1Rooms.push({ id: 'r1', name: isVi ? 'Tiền sảnh & Sảnh đón VIP' : 'Grand Foyer & Porch', area: 18, icon: '🏛️', desc: isVi ? 'Cột Corinthian bề thế' : 'Stately grand entry' });
            f1Rooms.push({ id: 'r2', name: isVi ? 'Phòng khách Tân cổ điển' : 'Grand Living Parlor', area: 38, icon: '🛋️', desc: isVi ? 'Trần cao 4.2m thông thoáng' : 'High ceiling 4.2m' });
            f1Rooms.push({ id: 'r3', name: isVi ? 'Khu bếp đảo Bar & Phòng ăn' : 'Island Kitchen & Banquet', area: 32, icon: '🍷', desc: isVi ? 'Bàn ăn 10-12 chỗ ngồi' : 'Seats 10-12 guests' });
            f1Rooms.push({ id: 'r4', name: isVi ? 'Phòng ngủ trệt (Người cao tuổi)' : 'Ground Floor Suite', area: 24, icon: '🛏️', desc: isVi ? 'Không phải leo cầu thang, WC riêng' : 'Private bath, elderly friendly' });
            f1Rooms.push({ id: 'r5', name: isVi ? 'Gara ô tô trong nhà' : 'Indoor Car Garage', area: 28, icon: '🚗', desc: isVi ? 'Chứa 2 ô tô & 3 xe máy' : 'Fits 2 cars & bikes' });
            f1Rooms.push({ id: 'r6', name: isVi ? 'WC chung & Kho đồ' : 'Powder Room & Storage', area: 8, icon: '🚿', desc: isVi ? 'Thiết bị vệ sinh cao cấp' : 'Premium sanitary ware' });
        } else {
            f1Rooms.push({ id: 'r1', name: isVi ? 'Sân trước & Gara để xe' : 'Front Yard & Garage', area: Math.round(w * 3.0), icon: '🚗', desc: isVi ? 'Cổng nhôm đúc tự động' : 'Car and scooter parking' });
            f1Rooms.push({ id: 'r2', name: isVi ? 'Phòng khách liên thông' : 'Open Living Hall', area: Math.round(w * 4.8), icon: '🛋️', desc: isVi ? 'Liên thông sảnh chính' : 'Seamless open space' });
            f1Rooms.push({ id: 'r3', name: isVi ? 'Cầu thang & Giếng trời giữa' : 'Stairwell & Central Skylight', area: Math.round(w * 2.2), icon: '🪜', desc: isVi ? 'Cầu thang 21 bậc tài lộc, WC chân thang' : '21-step fengshui stairs, powder room' });
            f1Rooms.push({ id: 'r4', name: isVi ? 'Bếp & Phòng ăn gia đình' : 'Kitchen & Dining Room', area: Math.round(w * 4.2), icon: '🍳', desc: isVi ? 'Tủ bếp Acrylic kịch trần' : 'Modern island and cabinetry' });
            f1Rooms.push({ id: 'r5', name: isVi ? 'Sân sau & Giếng trời thoát khí' : 'Rear Courtyard & Airwell', area: Math.round(w * 1.8), icon: '🌿', desc: isVi ? 'Lấy gió đối lưu tự nhiên' : 'Natural cross-ventilation' });
        }
        floors.push({
            floorNum: 1,
            title: isVi ? 'Mặt bằng Tầng 1 (Trệt)' : 'Floor 1 (Ground Level)',
            shortName: isVi ? 'Tầng 1' : 'Level 1',
            usableArea: groundArea,
            rooms: f1Rooms
        });

        // 2. TẦNG 2 (LẦU 1 - nếu có)
        if (floorsCount >= 2) {
            const f2Rooms = [];
            if (template.type === 'biet-thu') {
                f2Rooms.push({ id: 'r2_1', name: isVi ? 'Phòng ngủ Master Hoàng gia' : 'Presidential Master Suite', area: 46, icon: '👑', desc: isVi ? 'Phòng thay đồ Walk-in & Bồn tắm Jacuzzi' : 'Walk-in closet & spa tub' });
                f2Rooms.push({ id: 'r2_2', name: isVi ? 'Phòng sinh hoạt chung & Thư viện' : 'Family Lounge & Library', area: 26, icon: '📚', desc: isVi ? 'Không gian gắn kết gia đình' : 'Cozy family entertainment' });
                f2Rooms.push({ id: 'r2_3', name: isVi ? 'Phòng ngủ VIP 2' : 'VIP Bedroom 2', area: 24, icon: '🛏️', desc: isVi ? 'WC riêng, ban công view hồ' : 'En-suite bath & balcony' });
                f2Rooms.push({ id: 'r2_4', name: isVi ? 'Phòng ngủ VIP 3' : 'VIP Bedroom 3', area: 22, icon: '🛏️', desc: isVi ? 'Cửa kính panorama tràn viền' : 'Panorama window view' });
                f2Rooms.push({ id: 'r2_5', name: isVi ? 'Ban công thư giãn dài' : 'Grand Balcony', area: 12, icon: '🌅', desc: isVi ? 'Lan can nhôm đúc mạ đồng' : 'Glass railing veranda' });
            } else {
                f2Rooms.push({ id: 'r2_1', name: isVi ? 'Phòng ngủ Master (Gia chủ)' : 'Master Bedroom Suite', area: Math.round(w * 4.5), icon: '👑', desc: isVi ? 'Ban công riêng, WC khép kín' : 'Front balcony, en-suite' });
                f2Rooms.push({ id: 'r2_2', name: isVi ? 'Ban công trước đón gió' : 'Front Balcony', area: Math.round(w * 1.2), icon: '🌅', desc: isVi ? 'Trồng cây cảnh xanh mát' : 'Planter box & railing' });
                f2Rooms.push({ id: 'r2_3', name: isVi ? 'Sảnh thang & Sinh hoạt chung' : 'Stair Hall & Study Nook', area: Math.round(w * 2.5), icon: '📖', desc: isVi ? 'Bàn học tập & làm việc' : 'Shared work/study nook' });
                f2Rooms.push({ id: 'r2_4', name: isVi ? 'Phòng ngủ con 1' : 'Bedroom 2 (Kids)', area: Math.round(w * 3.8), icon: '🛏️', desc: isVi ? 'Cửa sổ mở ra giếng trời sau' : 'Rear airwell daylight' });
                f2Rooms.push({ id: 'r2_5', name: isVi ? 'Nhà vệ sinh tầng 2 (WC)' : 'Bathroom Level 2', area: 5, icon: '🚿', desc: isVi ? 'Vách tắm kính cường lực' : 'Tempered glass shower' });
            }
            floors.push({
                floorNum: 2,
                title: isVi ? 'Mặt bằng Tầng 2 (Lầu 1)' : 'Floor 2 (Level 1)',
                shortName: isVi ? 'Tầng 2' : 'Level 2',
                usableArea: groundArea,
                rooms: f2Rooms
            });
        }

        // 3. TẦNG 3 (LẦU 2 - nếu có)
        if (floorsCount >= 3) {
            const f3Rooms = [];
            f3Rooms.push({ id: 'r3_1', name: isVi ? 'Phòng thờ gia tiên trang nghiêm' : 'Sacred Ancestral Altar', area: Math.round(w * 2.8), icon: '🕯️', desc: isVi ? 'Hướng cát tài lộc theo tuổi gia chủ' : 'Auspicious fengshui orientation' });
            f3Rooms.push({ id: 'r3_2', name: isVi ? 'Phòng ngủ 3 / Phòng làm việc' : 'Bedroom 3 / Home Office', area: Math.round(w * 3.6), icon: '💻', desc: isVi ? 'Yên tĩnh, tập trung tối đa' : 'Quiet home studio' });
            f3Rooms.push({ id: 'r3_3', name: isVi ? 'Khu giặt sấy & Phòng kỹ thuật' : 'Laundry & Utility Room', area: 8, icon: '🧺', desc: isVi ? 'Có ống cấp thoát nước chuyên dụng' : 'Dedicated washing plumbing' });
            f3Rooms.push({ id: 'r3_4', name: isVi ? 'Sân thượng tiệc nướng BBQ & Cây cảnh' : 'Rooftop Sky Garden & BBQ', area: Math.round(w * 4.2), icon: '🍹', desc: isVi ? 'Góc chill ngắm thành phố về đêm' : 'Panoramic city view terrace' });
            floors.push({
                floorNum: 3,
                title: isVi ? 'Mặt bằng Tầng 3 (Lầu 2)' : 'Floor 3 (Level 2)',
                shortName: isVi ? 'Tầng 3' : 'Level 3',
                usableArea: Math.round(groundArea * 0.8),
                rooms: f3Rooms
            });
        }

        // 4. MẶT BẰNG MÁI
        const roofRooms = [
            { id: 'rf_1', name: isVi ? 'Hệ khung vì kèo thép / Sàn BTCT' : 'Roof Framing / Concrete Slab', area: Math.round(groundArea * 0.7), icon: '🏠', desc: isVi ? 'Dốc thoát nước mưa chống đọng' : 'Rain drainage slope' },
            { id: 'rf_2', name: isVi ? 'Vị trí bồn nước Tân Á 1.500L' : 'Water Reservoir (1,500L)', area: 4, icon: '🚰', desc: isVi ? 'Chân giá đỡ thép chịu lực' : 'Reinforced steel base' },
            { id: 'rf_3', name: isVi ? 'Máy nước nóng năng lượng mặt trời' : 'Solar Water Heating System', area: 5, icon: '☀️', desc: isVi ? 'Thái Dương Năng tiết kiệm điện' : 'Eco solar collector' },
            { id: 'rf_4', name: isVi ? 'Ô kính lấy sáng giếng trời thông tầng' : 'Skylight Glass Hatch', area: 4, icon: '🪟', desc: isVi ? 'Kính cường lực an toàn 12mm' : '12mm safety laminated glass' }
        ];
        floors.push({
            floorNum: 99,
            title: isVi ? 'Mặt bằng Mái Kỹ Thuật' : 'Roof Structural Plan',
            shortName: isVi ? 'Mái' : 'Roof',
            usableArea: Math.round(groundArea * 0.7),
            rooms: roofRooms
        });

        return floors;
    }

    /**
     * Tạo chuỗi SVG vector thể hiện bản vẽ mặt bằng kiến trúc CAD độ nét cao
     */
    renderFloorplanSVG(floor, template, isLightbox = false) {
        if (!floor || !template) return '';

        const w = template.width_m || 5.0;
        const d = template.depth_m || 16.0;
        const isVi = window.i18n.getLang() === 'vi';

        // Tọa độ CAD
        const svgW = isLightbox ? 920 : 640;
        const svgH = isLightbox ? 440 : 310;
        const padX = isLightbox ? 75 : 55;
        const padY = isLightbox ? 55 : 42;
        const planW = svgW - padX * 2;
        const planH = svgH - padY * 2;

        const rooms = floor.rooms || [];
        const roomsCount = Math.max(1, rooms.length);

        // Sinh các khối phòng dọc theo chiều dài nhà
        let roomBlocksSVG = '';
        let currentX = padX;

        rooms.forEach((room, i) => {
            // Tỷ lệ chiều ngang phòng theo số lượng hoặc diện tích
            const ratio = room.area ? (room.area / floor.usableArea) : (1 / roomsCount);
            // Giới hạn độ rộng tối thiểu để chữ không bị tràn
            const blockW = Math.max(70, Math.min(planW - (roomsCount - i) * 60, Math.round(planW * Math.max(0.14, ratio))));
            const actualW = (i === roomsCount - 1) ? (padX + planW - currentX) : Math.min(blockW, padX + planW - currentX - 10);

            const rx = currentX;
            const ry = padY;
            const rw = Math.max(50, actualW);
            const rh = planH;

            const centerX = rx + rw / 2;
            const centerY = ry + rh / 2;

            // Ký hiệu cửa đi & mở cửa
            const doorSVG = (i < roomsCount - 1) 
                ? `<path d="M ${rx + rw} ${ry + rh * 0.65} A ${Math.min(24, rh * 0.2)} ${Math.min(24, rh * 0.2)} 0 0 1 ${rx + rw - Math.min(24, rh * 0.2)} ${ry + rh * 0.65 + Math.min(24, rh * 0.2)}" fill="none" stroke="#e5b95d" stroke-width="1.2" stroke-dasharray="2,2"/>
                   <line x1="${rx + rw}" y1="${ry + rh * 0.65}" x2="${rx + rw}" y2="${ry + rh * 0.65 + Math.min(24, rh * 0.2)}" stroke="#e5b95d" stroke-width="1.8"/>`
                : '';

            // Cửa sổ lấy sáng ở mép ngoài
            const windowSVG = (i === 0 || i === roomsCount - 1)
                ? `<line x1="${i === 0 ? rx : rx + rw}" y1="${ry + rh * 0.3}" x2="${i === 0 ? rx : rx + rw}" y2="${ry + rh * 0.7}" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>`
                : '';

            roomBlocksSVG += `
                <g class="svg-room-block" data-room-id="${room.id}" style="cursor: pointer;">
                    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="rgba(229,185,93,0.06)" stroke="rgba(229,185,93,0.3)" stroke-width="1.2" rx="4" class="cad-room-rect"/>
                    ${doorSVG}
                    ${windowSVG}
                    <!-- Icon & Tên phòng -->
                    <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="${isLightbox ? 18 : 15}" class="svg-room-icon">${room.icon}</text>
                    <text x="${centerX}" y="${centerY + 8}" text-anchor="middle" font-size="${isLightbox ? 11 : 9.5}" font-weight="700" fill="#f1f5f9" class="svg-room-title">${room.name}</text>
                    <text x="${centerX}" y="${centerY + 24}" text-anchor="middle" font-size="${isLightbox ? 10 : 8.5}" font-weight="600" fill="#e5b95d" class="svg-room-area">${room.area} m²</text>
                </g>
            `;
            currentX += rw;
        });

        // Thước đo CAD (Top dimension & Left dimension)
        const dimTopY = padY - 14;
        const dimLeftX = padX - 16;
        const depthLabel = `${d.toFixed(1)}m (${(d * 1000).toLocaleString('vi-VN')}mm)`;
        const widthLabel = `${w.toFixed(1)}m (${(w * 1000).toLocaleString('vi-VN')}mm)`;

        return `
            <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" class="blueprint-svg">
                <defs>
                    <!-- Lưới tọa độ CAD Blueprint -->
                    <pattern id="cadGrid-${floor.floorNum}" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)"/>
                    </pattern>
                </defs>

                <!-- Nền lưới CAD -->
                <rect width="${svgW}" height="${svgH}" fill="url(#cadGrid-${floor.floorNum})"/>

                <!-- THƯỚC ĐO KÍCH THƯỚC CHIỀU DÀI (TOP DIMENSION) -->
                <line x1="${padX}" y1="${dimTopY}" x2="${padX + planW}" y2="${dimTopY}" stroke="#94a3b8" stroke-width="1.2"/>
                <line x1="${padX}" y1="${dimTopY - 6}" x2="${padX}" y2="${dimTopY + 6}" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="${padX + planW}" y1="${dimTopY - 6}" x2="${padX + planW}" y2="${dimTopY + 6}" stroke="#94a3b8" stroke-width="1.5"/>
                <text x="${padX + planW / 2}" y="${dimTopY - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="#cbd5e1">${depthLabel}</text>

                <!-- THƯỚC ĐO KÍCH THƯỚC MẶT TIỀN (LEFT DIMENSION) -->
                <line x1="${dimLeftX}" y1="${padY}" x2="${dimLeftX}" y2="${padY + planH}" stroke="#94a3b8" stroke-width="1.2"/>
                <line x1="${dimLeftX - 6}" y1="${padY}" x2="${dimLeftX + 6}" y2="${padY}" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="${dimLeftX - 6}" y1="${padY + planH}" x2="${dimLeftX + 6}" y2="${padY + planH}" stroke="#94a3b8" stroke-width="1.5"/>
                <text x="${dimLeftX - 8}" y="${padY + planH / 2}" text-anchor="middle" font-size="10" font-weight="700" fill="#cbd5e1" transform="rotate(-90, ${dimLeftX - 8}, ${padY + planH / 2})">${widthLabel}</text>

                <!-- TƯỜNG BAO KẾT CẤU CHỊU LỰC (OUTER REINFORCED CONCRETE WALLS 200mm) -->
                <rect x="${padX - 4}" y="${padY - 4}" width="${planW + 8}" height="${planH + 8}" fill="none" stroke="#38bdf8" stroke-width="2.5" rx="5"/>
                <rect x="${padX}" y="${padY}" width="${planW}" height="${planH}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" rx="3"/>

                <!-- CÁC KHỐI PHÒNG CÔNG NĂNG TƯƠNG TÁC -->
                ${roomBlocksSVG}

                <!-- MŨI TÊN CHỈ HƯỚNG BẮC (NORTH ARROW COMPASS) -->
                <g transform="translate(${svgW - 40}, 24)">
                    <circle cx="0" cy="0" r="14" fill="rgba(15,23,42,0.85)" stroke="#e5b95d" stroke-width="1.2"/>
                    <polygon points="0,-10 -4,2 0,0 4,2" fill="#ef4444"/>
                    <polygon points="0,10 -4,-2 0,0 4,-2" fill="#94a3b8"/>
                    <text x="0" y="-12" text-anchor="middle" font-size="9" font-weight="850" fill="#f8fafc">N</text>
                </g>

                <!-- KHUNG TÊN BẢN VẼ CHUẨN KIẾN TRÚC (CAD TITLE BLOCK) -->
                <g transform="translate(${padX}, ${svgH - 12})">
                    <text x="0" y="0" font-size="8.5" font-weight="600" fill="#64748b">DREAM HOUSE ARCHITECTURAL BLUEPRINT • TỶ LỆ 1/100 • TIÊU CHUẨN TCXDVN 2026</text>
                    <text x="${planW}" y="0" text-anchor="end" font-size="8.5" font-weight="700" fill="#e5b95d">${floor.title}</text>
                </g>
            </svg>
        `;
    }

    /**
     * Cập nhật toàn bộ giao diện Mặt bằng từng tầng cho mẫu nhà đang xem
     */
    updateDetailFloorplans(template) {
        if (!template) return;

        this._currentFloorsData = this.generateFloorplanData(template);
        if (!this._currentFloorsData || this._currentFloorsData.length === 0) return;

        // Reset về tầng 1 nếu chỉ số vượt quá số tầng của mẫu mới
        if (this.currentFloorIndex >= this._currentFloorsData.length) {
            this.currentFloorIndex = 0;
        }

        const tabsContainer = document.getElementById('detail-floorplan-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = '';
            this._currentFloorsData.forEach((floor, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fp-pill-btn' + (idx === this.currentFloorIndex ? ' active' : '');
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-selected', String(idx === this.currentFloorIndex));
                btn.textContent = floor.shortName;
                btn.addEventListener('click', () => {
                    this.switchFloorplan(idx);
                });
                tabsContainer.appendChild(btn);
            });
        }

        this.renderCurrentFloorplanView();
    }

    /**
     * Chuyển đổi hiển thị tầng được chọn
     */
    switchFloorplan(index) {
        if (index < 0 || index >= this._currentFloorsData.length) return;
        this.currentFloorIndex = index;

        // Cập nhật active tab trong detail modal
        const detailTabs = document.querySelectorAll('#detail-floorplan-tabs .fp-pill-btn');
        detailTabs.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
            btn.setAttribute('aria-selected', String(i === index));
        });

        // Cập nhật active tab trong lightbox modal (nếu đang mở)
        const lightboxTabs = document.querySelectorAll('#lightbox-floor-tabs .fp-pill-btn');
        lightboxTabs.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
            btn.setAttribute('aria-selected', String(i === index));
        });

        this.renderCurrentFloorplanView();
    }

    /**
     * Render bản vẽ SVG và bảng danh mục phòng của tầng hiện tại
     */
    renderCurrentFloorplanView() {
        const floor = this._currentFloorsData[this.currentFloorIndex];
        const template = this.currentTemplate;
        if (!floor || !template) return;

        // 1. Cập nhật diện tích sử dụng tầng
        const areaBadge = document.getElementById('floorplan-usable-area');
        if (areaBadge) areaBadge.textContent = `${floor.usableArea} m²`;

        // 2. Render SVG vào sân khấu chính
        const stage = document.getElementById('floorplan-blueprint-stage');
        if (stage) {
            stage.innerHTML = this.renderFloorplanSVG(floor, template, false);
            this.attachSVGInteractions(stage);
        }

        // 3. Render danh sách phòng bên dưới bản vẽ
        const grid = document.getElementById('floorplan-rooms-grid');
        if (grid) {
            grid.innerHTML = '';
            (floor.rooms || []).forEach(room => {
                const card = document.createElement('div');
                card.className = 'room-card-item';
                card.dataset.roomId = room.id;
                card.innerHTML = `
                    <span class="room-card-icon" aria-hidden="true">${room.icon}</span>
                    <div class="room-card-info">
                        <strong class="room-card-name">${room.name}</strong>
                        <span class="room-card-area">${room.area} m² • ${room.desc}</span>
                    </div>
                `;

                // Tương tác hover làm sáng khối phòng tương ứng trên SVG
                card.addEventListener('mouseenter', () => {
                    this.highlightRoom(room.id, true);
                });
                card.addEventListener('mouseleave', () => {
                    this.highlightRoom(room.id, false);
                });
                card.addEventListener('click', () => {
                    this.highlightRoom(room.id, true);
                });

                grid.appendChild(card);
            });
        }

        // 4. Nếu Lightbox đang mở, cập nhật luôn Lightbox
        const lightboxModal = document.getElementById('floorplan-lightbox-modal');
        if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
            const titleEl = document.getElementById('lightbox-floor-title');
            if (titleEl) titleEl.textContent = floor.title;

            const lbStage = document.getElementById('lightbox-blueprint-stage');
            if (lbStage) {
                lbStage.innerHTML = this.renderFloorplanSVG(floor, template, true);
                this.attachSVGInteractions(lbStage);
            }
        }
    }

    /**
     * Gắn tương tác di chuột và click vào từng phòng trên sơ đồ SVG
     */
    attachSVGInteractions(containerEl) {
        if (!containerEl) return;
        const blocks = containerEl.querySelectorAll('.svg-room-block');
        blocks.forEach(block => {
            const roomId = block.dataset.roomId;
            block.addEventListener('mouseenter', () => {
                this.highlightRoom(roomId, true);
            });
            block.addEventListener('mouseleave', () => {
                this.highlightRoom(roomId, false);
            });
            block.addEventListener('click', () => {
                this.highlightRoom(roomId, true);
                // Cuộn nhẹ tới thẻ phòng trong danh sách
                const matchedCard = document.querySelector(`.room-card-item[data-room-id="${roomId}"]`);
                if (matchedCard) {
                    matchedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        });
    }

    /**
     * Làm nổi bật (Highlight) phòng trên cả SVG và thẻ thông tin
     */
    highlightRoom(roomId, isHighlight) {
        document.querySelectorAll(`.svg-room-block[data-room-id="${roomId}"] .cad-room-rect`).forEach(rect => {
            if (isHighlight) {
                rect.style.fill = 'rgba(229, 185, 93, 0.28)';
                rect.style.stroke = '#e5b95d';
                rect.style.strokeWidth = '2px';
            } else {
                rect.style.fill = '';
                rect.style.stroke = '';
                rect.style.strokeWidth = '';
            }
        });

        document.querySelectorAll(`.room-card-item[data-room-id="${roomId}"]`).forEach(card => {
            card.classList.toggle('is-highlighted', isHighlight);
        });
    }

    /**
     * Mở Modal Phóng to Bản vẽ Mặt bằng (Fullscreen Lightbox)
     */
    openFloorplanLightbox() {
        const modal = document.getElementById('floorplan-lightbox-modal');
        const floor = this._currentFloorsData[this.currentFloorIndex];
        const template = this.currentTemplate;
        if (!modal || !floor || !template) return;

        const lang = window.i18n.getLang();
        const tplName = this.getLocalizedTemplateName(template, lang);

        const nameEl = document.getElementById('lightbox-template-name');
        if (nameEl) nameEl.textContent = `${tplName} (${template.width_m}m × ${template.depth_m}m)`;

        const titleEl = document.getElementById('lightbox-floor-title');
        if (titleEl) titleEl.textContent = floor.title;

        // Sinh các tabs chọn tầng trong Lightbox
        const tabsContainer = document.getElementById('lightbox-floor-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = '';
            this._currentFloorsData.forEach((f, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fp-pill-btn' + (idx === this.currentFloorIndex ? ' active' : '');
                btn.textContent = f.shortName;
                btn.addEventListener('click', () => {
                    this.switchFloorplan(idx);
                });
                tabsContainer.appendChild(btn);
            });
        }

        // Render SVG khổ lớn
        const lbStage = document.getElementById('lightbox-blueprint-stage');
        if (lbStage) {
            lbStage.innerHTML = this.renderFloorplanSVG(floor, template, true);
            this.attachSVGInteractions(lbStage);
        }

        modal.classList.remove('hidden');
        modal.classList.remove('is-closing');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Kiểm tra quyền Quản trị viên (Admin)
     */
    checkIsAdmin() {
        if (!this.currentUser) return false;
        return this.currentProfile?.role === 'admin' || 
               this.currentUser.user_metadata?.role === 'admin' ||
               this.currentUser.app_metadata?.role === 'admin';
    }

    /**
     * Khởi tạo Notification Bell Dropdown (Prompt #074, Alerts & Feedback) - Phân Quyền Thông Minh (Admin / User)
     * Lucian UX/UI Prompt #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#074
     */
    initNotificationBell() {
        const root = document.getElementById('u074-notif');
        if (!root) return;

        const bell = root.querySelector('.u074-bell');
        const badge = root.querySelector('.u074-badge');
        const list = root.querySelector('.u074-list');
        const allB = root.querySelector('.u074-all');
        const tabs = root.querySelectorAll('.u074-tab');
        const pan = root.querySelector('.u074-pan');
        const emptyState = root.querySelector('.u074-empty');
        if (!bell || !badge || !list || !allB || !pan) return;

        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Định vị mũi tên và panel khớp 100% với tâm của chuông trên cả Desktop & Mobile
        const positionDropdown = () => {
            if (root.classList.contains('is-closed')) return;

            const bellRect = bell.getBoundingClientRect();
            const panRect = pan.getBoundingClientRect();

            // Tính toán tâm chuông so với mép trái của panel
            const bellCenter = bellRect.left + bellRect.width / 2;
            const arrowOffset = Math.max(22, Math.min(panRect.width - 22, bellCenter - panRect.left));

            pan.style.setProperty('--u074-arrow-left', `${arrowOffset}px`);
            pan.style.transformOrigin = `${arrowOffset}px -8px`;

            // Trên mobile, gán tọa độ Y cố định ngay dưới header
            if (window.innerWidth <= 768) {
                const headerHeight = Math.max(64, bellRect.bottom + 10);
                pan.style.top = `${headerHeight}px`;
            } else {
                pan.style.top = '';
            }
        };

        // Lấy danh sách thông báo theo phân quyền tài khoản (Admin vs User cá nhân)
        const getNotificationsForRole = () => {
            const isEn = window.i18n && window.i18n.currentLang === 'en';
            const isAdmin = this.checkIsAdmin();

            // Cập nhật nhãn Tab 2 theo đúng vai trò tài khoản
            if (tabs[1]) {
                const tabKey = isAdmin ? 'notif_tab_inquiries' : 'notif_tab_my_inquiries';
                tabs[1].setAttribute('data-i18n', tabKey);
                tabs[1].textContent = window.i18n.t(tabKey);
            }

            // ============================================================
            // 1. TRƯỜNG HỢP ADMIN: Xem danh sách lead tư vấn của khách hàng
            // ============================================================
            if (isAdmin) {
                const adminArr = isEn ? [
                    ['Nguyen Van Tuan', 'sent a consultation request: “2-Storey Townhouse 5x16m”', '12 min ago', 'linear-gradient(140deg,#8B6CFF,#5B8CFF)', '💬', 1],
                    ['Tran Thi Mai', 'requested an all-inclusive quote: “Neoclassical Villa”', '1 hr ago', 'linear-gradient(140deg,#22C3A6,#0EA5E9)', '📋', 1],
                    ['Le Hoang Nam', 'saved “Modern 1-Storey Japanese Roof House” to favorites', '2 hrs ago', 'linear-gradient(140deg,#FF7A93,#B04FD0)', '❤️', 0],
                    ['DreamHouse System', 'Architectural design catalog 2026 update is now live', 'Yesterday', 'linear-gradient(140deg,#FFB547,#FF7A45)', '📊', 0]
                ] : [
                    ['Nguyễn Văn Tuấn', 'vừa gửi thông tin tư vấn: “Nhà phố 2 tầng 5×16m”', '12 phút trước', 'linear-gradient(140deg,#8B6CFF,#5B8CFF)', '💬', 1],
                    ['Trần Thị Mai', 'yêu cầu báo giá thi công: “Biệt thự Tân cổ điển 3 tầng”', '1 giờ trước', 'linear-gradient(140deg,#22C3A6,#0EA5E9)', '📋', 1],
                    ['Lê Hoàng Nam', 'vừa lưu mẫu “Nhà Cấp 4 Mái Nhật Tiện Nghi” vào yêu thích', '2 giờ trước', 'linear-gradient(140deg,#FF7A93,#B04FD0)', '❤️', 0],
                    ['Hệ thống DreamHouse', 'Bảng dự toán chi phí & catalog kiến trúc 2026 đã sẵn sàng', 'Hôm qua', 'linear-gradient(140deg,#FFB547,#FF7A45)', '📊', 0]
                ];

                adminArr[0].inquiryData = {
                    name: isEn ? 'Nguyen Van Tuan' : 'Nguyễn Văn Tuấn',
                    contact: '0903 555 888',
                    template_name: isEn ? '2-Storey Townhouse 5x16m' : 'Nhà phố 2 tầng 5×16m',
                    template_id: 'nha-pho-2-tang-5x16m',
                    message: isEn ? 
                        'Our family of 4 wants to build this 2-storey house on a 5x16m plot with 3 bedrooms and an open living space. Please send an estimate and floor plan.' :
                        'Gia đình tôi gồm 4 người dự định xây dựng mẫu nhà 2 tầng 5x16m với 3 phòng ngủ và 1 phòng thờ. Nhờ KTS tư vấn chi phí xây thô, hoàn thiện và phương án bố trí mặt bằng.',
                    time: isEn ? '12 min ago' : '12 phút trước',
                    status: 'new',
                    gradient: adminArr[0][3]
                };

                adminArr[1].inquiryData = {
                    name: isEn ? 'Tran Thi Mai' : 'Trần Thị Mai',
                    contact: '0977 889 900',
                    template_name: isEn ? '3-Storey Luxury Neoclassical Villa' : 'Biệt Thự Tân Cổ Điển Châu Âu 3 Tầng',
                    template_id: 'biet-thu-tan-co-dien-chau-au-3-tang',
                    message: isEn ? 
                        'Requesting an all-inclusive design and construction quote for this villa on a 12x20m plot. Budget is around 5 billion VND.' :
                        'Tôi muốn tư vấn mẫu biệt thự tân cổ điển có gara và hầm rượu, diện tích đất 12x20m tại Biên Hòa. Ngân sách dự kiến khoảng 4.8 - 5 tỷ VNĐ.',
                    time: isEn ? '1 hr ago' : '1 giờ trước',
                    status: 'new',
                    gradient: adminArr[1][3]
                };

                adminArr[2].templateId = 'nha-cap-4-mai-nhat-tien-nghi-tiet-kiem';
                return adminArr;
            }

            // ============================================================
            // 2. TRƯỜNG HỢP USER (THÀNH VIÊN / KHÁCH): 
            //    Chỉ hiển thị thông báo khi được Admin gửi lại hoặc nhận 
            //    thông báo khi chính User gửi tư vấn về mẫu đang xem!
            // ============================================================
            const userArr = [];

            // 2.1. Nạp các yêu cầu tư vấn do chính User đã gửi (lưu trong localStorage)
            const myStoredInquiries = JSON.parse(localStorage.getItem('dream_house_my_inquiries') || '[]');
            if (myStoredInquiries.length > 0) {
                myStoredInquiries.slice(0, 3).forEach(inq => {
                    const inqNotif = [
                        isEn ? 'You' : 'Bạn',
                        isEn ? `submitted consultation request for “${inq.template_name || 'Design template'}”. Architect has received it.` :
                               `đã gửi yêu cầu tư vấn thành công về mẫu “${inq.template_name || 'Mẫu nhà đang xem'}”. Kiến trúc sư DreamHouse đã tiếp nhận.`,
                        inq.time || (isEn ? 'Recently' : 'Gần đây'),
                        'linear-gradient(140deg,#3D8BFF,#22C3A6)',
                        '📋',
                        1
                    ];
                    inqNotif.inquiryData = {
                        isUserOwn: true,
                        name: inq.name || (this.currentUser?.user_metadata?.full_name || (isEn ? 'You' : 'Bạn')),
                        contact: inq.contact || 'Chưa cung cấp',
                        template_name: inq.template_name || 'Tư vấn kiến trúc',
                        template_id: inq.template_id,
                        message: inq.message || (isEn ? 'Consultation request submitted.' : 'Yêu cầu tư vấn thiết kế và dự toán thi công.'),
                        time: inq.time || (isEn ? 'Recently' : 'Vừa xong'),
                        status: inq.status || 'new',
                        gradient: 'linear-gradient(140deg,#3D8BFF,#22C3A6)'
                    };
                    userArr.push(inqNotif);
                });
            }

            // 2.2. Thông báo Admin / Kiến trúc sư phản hồi về mẫu nhà User quan tâm
            const curTpl = this.currentTemplate;
            const feedbackTplName = curTpl ? this.getLocalizedTemplateName(curTpl) : (isEn ? 'Modern 3-Storey Townhouse 5m' : 'Nhà Phố Hiện Đại 3 Tầng Mặt Tiền 5m');
            const feedbackTplId = curTpl ? curTpl.id : 'nha-pho-hien-dai-3-tang-mat-tien-5m';

            const adminFeedbackNotif = [
                isEn ? 'Architect Vo Quoc Viet' : 'Kiến trúc sư DreamHouse',
                isEn ? `has replied to your consultation inquiry on “${feedbackTplName}”: Preliminary floor plan & cost estimate are ready!` :
                       `đã gửi phản hồi tư vấn về “${feedbackTplName}”: Phương án bố trí mặt bằng và bảng dự toán thi công đã sẵn sàng.`,
                isEn ? '15 min ago' : '15 phút trước',
                'linear-gradient(140deg,#10B981,#059669)',
                '🏛️',
                1
            ];
            adminFeedbackNotif.inquiryData = {
                isResponse: true,
                name: isEn ? 'Architect Vo Quoc Viet (DreamHouse)' : 'Kiến trúc sư DreamHouse (Võ Quốc Việt)',
                contact: 'Hotline/Zalo: 0367020403 (KTS Võ Quốc Việt)',
                template_name: feedbackTplName,
                template_id: feedbackTplId,
                message: isEn ? 
                    'Hello! Architect Vo Quoc Viet has prepared the functional layout and turnkey cost estimate for ' + feedbackTplName + '. Click "View 3D Model" to explore or call our hotline for direct discussion.' :
                    'Chào bạn, Kiến trúc sư DreamHouse đã tiếp nhận yêu cầu và hoàn tất phương án mặt bằng sơ bộ cho ' + feedbackTplName + '. Chúng tôi đã chuẩn bị bảng dự toán chi phí chi tiết. Bạn có thể bấm "Xem mô hình 3D" để khám phá thêm hoặc liên hệ hotline để trao đổi trực tiếp.',
                time: isEn ? '15 min ago' : '15 phút trước',
                status: 'handled',
                gradient: 'linear-gradient(140deg,#10B981,#059669)'
            };
            userArr.push(adminFeedbackNotif);

            // 2.3. Mẫu nhà yêu thích của người dùng
            const favTplName = isEn ? 'Modern 1-Storey Japanese Roof House' : 'Nhà Cấp 4 Mái Nhật Tiện Nghi';
            const favNotif = [
                'DreamHouse',
                isEn ? `The design “${favTplName}” in your watchlist has a new 3D model update.` :
                       `Mẫu nhà “${favTplName}” bạn đang quan tâm đã có bản vẽ 3D cập nhật mới.`,
                isEn ? '2 hrs ago' : '2 giờ trước',
                'linear-gradient(140deg,#FF7A93,#B04FD0)',
                '❤️',
                0
            ];
            favNotif.templateId = 'nha-cap-4-mai-nhat-tien-nghi-tiet-kiem';
            userArr.push(favNotif);

            // 2.4. Thông báo chào mừng thành viên
            const userName = this.currentUser?.user_metadata?.full_name || (this.currentUser?.email ? this.currentUser.email.split('@')[0] : (isEn ? 'Member' : 'Bạn'));
            const sysNotif = [
                isEn ? 'DreamHouse System' : 'Hệ thống DreamHouse',
                isEn ? `Welcome ${userName}! Explore 100+ construction-ready architectural designs with transparent estimates.` :
                       `Chào mừng ${userName} đến với DreamHouse! Khám phá danh mục kiến trúc 2026 với hơn 100+ mẫu nhà sẵn sàng thi công.`,
                isEn ? 'Yesterday' : 'Hôm qua',
                'linear-gradient(140deg,#FFB547,#FF7A45)',
                '📊',
                0
            ];
            userArr.push(sysNotif);

            return userArr;
        };

        const getIncomingData = () => {
            const isEn = window.i18n && window.i18n.currentLang === 'en';
            const isAdmin = this.checkIsAdmin();

            if (isAdmin) {
                // Admin nhận thông báo khi có khách hàng gửi tư vấn mới
                const incoming = isEn ?
                    ['Pham Thanh Hai', 'requested consultation: “Modern 3-Storey Townhouse 5m”', 'Just now', 'linear-gradient(140deg,#3D8BFF,#22C3A6)', '✨', 1] :
                    ['Phạm Thanh Hải', 'gửi yêu cầu tư vấn: “Nhà Phố Hiện Đại 3 Tầng Mặt Tiền 5m”', 'Vừa xong', 'linear-gradient(140deg,#3D8BFF,#22C3A6)', '✨', 1];

                incoming.inquiryData = {
                    name: isEn ? 'Pham Thanh Hai' : 'Phạm Thanh Hải',
                    contact: '0988 123 456',
                    template_name: isEn ? 'Modern 3-Storey Townhouse 5m Frontage' : 'Nhà Phố Hiện Đại 3 Tầng Mặt Tiền 5m',
                    template_id: 'nha-pho-hien-dai-3-tang-mat-tien-5m',
                    message: isEn ? 
                        'I have a 5x18m land plot in Thu Duc City, planning to start construction in Q2/2026. Please consult on structural design and turnkey estimate.' :
                        'Tôi đang có mảnh đất 5x18m tại TP. Thủ Đức, dự kiến khởi công vào quý 2/2026. Nhờ kiến trúc sư tư vấn chi phí xây thô và hoàn thiện trọn gói mẫu 3 tầng hiện đại này.',
                    time: isEn ? 'Just now' : 'Vừa xong',
                    status: 'new',
                    gradient: incoming[3]
                };
                return incoming;
            }

            // User nhận thông báo khi Admin / KTS phản hồi về mẫu nhà đang xem
            const curTpl = this.currentTemplate;
            const tplTitle = curTpl ? this.getLocalizedTemplateName(curTpl) : (isEn ? '2-Storey Luxury Villa' : 'Biệt Thự Tân Cổ Điển Châu Âu 3 Tầng');
            const incomingUser = [
                isEn ? 'Architect Vo Quoc Viet' : 'Kiến trúc sư DreamHouse',
                isEn ? `sent a new consultation update for “${tplTitle}”: Structural layouts are ready!` :
                       `vừa gửi phản hồi tư vấn về “${tplTitle}”: Hồ sơ thiết kế công năng và dự toán đã hoàn tất!`,
                isEn ? 'Just now' : 'Vừa xong',
                'linear-gradient(140deg,#10B981,#059669)',
                '✨',
                1
            ];
            incomingUser.inquiryData = {
                isResponse: true,
                name: isEn ? 'Architect Vo Quoc Viet (DreamHouse)' : 'Kiến trúc sư DreamHouse (Võ Quốc Việt)',
                contact: 'Hotline/Zalo: 0367020403 (KTS Võ Quốc Việt)',
                template_name: tplTitle,
                template_id: curTpl ? curTpl.id : 'biet-thu-tan-co-dien-chau-au-3-tang',
                message: isEn ? 
                    'Architect Vo Quoc Viet has prepared the functional layout and turnkey cost estimate for ' + tplTitle + '. Click "View 3D Model" to inspect or call our hotline for direct discussion.' :
                    'Kiến trúc sư DreamHouse đã chuẩn bị xong hồ sơ thiết kế công năng và bảng dự toán thi công trọn gói cho ' + tplTitle + '. Hãy bấm "Xem mô hình 3D" để khám phá chi tiết hoặc liên hệ hotline để nhận tư vấn trực tiếp.',
                time: isEn ? 'Just now' : 'Vừa xong',
                status: 'handled',
                gradient: 'linear-gradient(140deg,#10B981,#059669)'
            };
            return incomingUser;
        };

        let mentionOnly = false;

        const createItem = (d, isNew = false) => {
            const li = document.createElement('li');
            li.className = 'u074-it' + (isNew ? ' new' : '');
            li.setAttribute('data-m', d[5]);
            li.innerHTML = `<div>
                <button class="u074-row" type="button">
                    <span class="u074-av" style="--g:${d[3]}" aria-hidden="true"><em>${d[4]}</em></span>
                    <span class="u074-tx">
                        <b>${d[0]}</b> <span>${d[1]}</span>
                        <small>${d[2]}</small>
                    </span>
                    <span class="u074-dot" aria-hidden="true"></span>
                </button>
            </div>`;

            const row = li.querySelector('.u074-row');
            row.addEventListener('click', () => {
                row.classList.add('read');
                updateCount();
                setOpen(false); // Gập dropdown thông báo

                // Xử lý xem chi tiết thông tin người cần tư vấn hoặc mẫu nhà
                if (d.inquiryData) {
                    this.openInquiryDetailModal(d.inquiryData);
                } else if (d[5] === 1) {
                    this.openInquiryDetailModal({
                        name: d[0],
                        contact: d.contact || '0988 123 456',
                        template_name: d.tplName || 'Tư vấn kiến trúc DreamHouse',
                        message: d.message || 'Khách hàng gửi thông tin tư vấn và yêu cầu báo giá dự án.',
                        time: d[2],
                        status: 'new',
                        gradient: d[3]
                    });
                } else if (d.templateId) {
                    const matchedTpl = this.templates ? this.templates.find(t => t.id === d.templateId || t.slug === d.templateId) : null;
                    if (matchedTpl) {
                        this.openDetailPanel(matchedTpl);
                    } else {
                        this.scrollToSection('gallery');
                    }
                } else {
                    this.scrollToSection('gallery');
                }
            });

            return li;
        };

        const updateCount = () => {
            const unreadItems = list.querySelectorAll('.u074-row:not(.read)');
            const n = unreadItems.length;
            const prev = Number(badge.textContent) || 0;
            badge.textContent = n;
            badge.classList.toggle('zero', n === 0);
            bell.setAttribute('aria-label', (window.i18n && window.i18n.currentLang === 'en' ? 'Notifications, ' : 'Thông báo, ') + n + (window.i18n && window.i18n.currentLang === 'en' ? ' unread' : ' chưa đọc'));
            allB.disabled = (n === 0);

            list.querySelectorAll('.u074-row').forEach(r => {
                const isRead = r.classList.contains('read');
                r.setAttribute('aria-label', r.textContent.replace(/\s+/g, ' ').trim() + (isRead ? '' : ', chưa đọc'));
            });

            if (n > prev && !rm && typeof badge.animate === 'function') {
                badge.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.5)' },
                    { transform: 'scale(1)' }
                ], {
                    duration: 450,
                    easing: 'cubic-bezier(.34,1.5,.64,1)'
                });
            }
        };

        const filterNotifications = () => {
            let visibleCount = 0;
            list.querySelectorAll('.u074-it').forEach(li => {
                const shouldHide = mentionOnly && li.getAttribute('data-m') !== '1';
                li.classList.toggle('hide', shouldHide);
                if (!shouldHide) visibleCount++;
            });
            if (emptyState) {
                emptyState.classList.toggle('show', visibleCount === 0);
            }
        };

        // Render danh sách thông báo theo vai trò hiện tại
        const renderList = () => {
            list.innerHTML = '';
            const initial = getNotificationsForRole();
            initial.forEach((d, i) => {
                const li = createItem(d);
                if (i > 1) {
                    li.querySelector('.u074-row').classList.add('read');
                }
                list.appendChild(li);
            });
            filterNotifications();
            updateCount();

            // CHỈ ADMIN MỚI ĐƯỢC TẢI TOÀN BỘ YÊU CẦU TƯ VẤN CỦA KHÁCH HÀNG TỪ DATABASE
            if (this.checkIsAdmin()) {
                const client = this.getSupabase();
                if (client) {
                    client.from('inquiries').select('*').order('created_at', { ascending: false }).limit(4)
                        .then(({ data, error }) => {
                            if (!error && data && data.length > 0) {
                                data.forEach(inq => {
                                    const inqData = [
                                        inq.name || 'Khách hàng',
                                        `vừa gửi yêu cầu tư vấn: “${inq.template_id || 'Mẫu nhà quan tâm'}”`,
                                        new Date(inq.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                        'linear-gradient(140deg,#6366f1,#a855f7)',
                                        '💬',
                                        1
                                    ];
                                    inqData.inquiryData = {
                                        id: inq.id,
                                        name: inq.name,
                                        contact: inq.contact,
                                        template_name: inq.template_id || 'Tư vấn kiến trúc',
                                        template_id: inq.template_id,
                                        message: inq.message,
                                        time: new Date(inq.created_at).toLocaleString('vi-VN'),
                                        status: inq.status || 'new',
                                        gradient: 'linear-gradient(140deg,#6366f1,#a855f7)'
                                    };
                                    const realLi = createItem(inqData);
                                    if (inq.status === 'handled') {
                                        realLi.querySelector('.u074-row').classList.add('read');
                                    }
                                    list.insertBefore(realLi, list.firstChild);
                                });
                                filterNotifications();
                                updateCount();
                            }
                        }).catch(() => {});
                }
            }
        };

        // Lưu trữ các hàm điều khiển vào instance app để gọi lại từ bên ngoài
        this._createNotificationItem = createItem;
        this._updateNotificationCount = updateCount;
        this._filterNotifications = filterNotifications;
        this._renderNotificationList = renderList;

        renderList();

        // Xử lý chuyển tabs
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                mentionOnly = (index === 1);
                tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === index)));
                filterNotifications();
            });
        });

        // Xử lý nút "Đã đọc tất cả"
        allB.addEventListener('click', () => {
            const unreadRows = list.querySelectorAll('.u074-row:not(.read)');
            unreadRows.forEach((r, i) => {
                setTimeout(() => {
                    if (!root.isConnected) return;
                    r.classList.add('read');
                    updateCount();
                }, i * 110);
            });
        });

        // Xử lý Mở / Đóng Dropdown
        const setOpen = (open) => {
            root.classList.toggle('is-closed', !open);
            bell.setAttribute('aria-expanded', String(open));
            pan.inert = !open;
            if (open) {
                requestAnimationFrame(() => {
                    positionDropdown();
                });
            }
        };

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const isClosed = root.classList.contains('is-closed');
            setOpen(isClosed);
        });

        pan.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Cập nhật vị trí khi resize hoặc cuộn trang
        window.addEventListener('resize', positionDropdown);
        window.addEventListener('scroll', positionDropdown, { passive: true });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (!root.contains(e.target) && !root.classList.contains('is-closed')) {
                setOpen(false);
            }
        });

        // Đóng dropdown khi nhấn phím Esc
        root.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !root.classList.contains('is-closed')) {
                setOpen(false);
                bell.focus();
            }
        });

        // Lắng nghe sự kiện đổi ngôn ngữ để cập nhật nội dung thông báo
        window.addEventListener('languageChanged', () => {
            renderList();
        });

        // Hiệu ứng rung chuông khi có thông báo mới sau 2.4s (Prompt #074)
        setTimeout(() => {
            if (!root.isConnected) return;
            const newLi = createItem(getIncomingData(), true);
            list.insertBefore(newLi, list.firstChild);
            filterNotifications();
            void newLi.offsetWidth; // Force reflow
            newLi.classList.remove('new');

            bell.classList.remove('ring');
            void bell.offsetWidth; // Force reflow
            bell.classList.add('ring');
            updateCount();
            if (!root.classList.contains('is-closed')) {
                positionDropdown();
            }
        }, rm ? 400 : 2400);

        bell.addEventListener('animationend', () => {
            bell.classList.remove('ring');
        });
    }

    /**
     * Bắn thông báo lên chuông ngay khi User gửi yêu cầu tư vấn thành công
     */
    notifyUserInquirySubmitted(payload) {
        // 1. Lưu vào danh sách tư vấn cá nhân của User
        const myInquiries = JSON.parse(localStorage.getItem('dream_house_my_inquiries') || '[]');
        const tplName = payload.template_name || (this.currentTemplate ? this.getLocalizedTemplateName(this.currentTemplate) : (payload.template_id || 'Mẫu nhà đang xem'));
        const inqRecord = {
            id: 'inq_' + Date.now(),
            name: payload.name || 'Bạn',
            contact: payload.contact,
            template_id: payload.template_id,
            template_name: tplName,
            message: payload.message,
            time: 'Vừa xong',
            status: 'submitted'
        };
        myInquiries.unshift(inqRecord);
        localStorage.setItem('dream_house_my_inquiries', JSON.stringify(myInquiries.slice(0, 10)));

        // 2. Đẩy thông báo xác nhận tức thì vào chuông của User
        const root = document.getElementById('u074-notif');
        if (!root) return;
        const list = root.querySelector('.u074-list');
        const bell = root.querySelector('.u074-bell');
        if (!list || !bell) return;

        const isEn = window.i18n && window.i18n.currentLang === 'en';
        const notifData = [
            isEn ? 'You' : 'Bạn',
            isEn ? `successfully sent a consultation inquiry for “${tplName}”. Architect will contact you soon!` :
                   `đã gửi yêu cầu tư vấn thành công về mẫu “${tplName}”. Kiến trúc sư DreamHouse đã tiếp nhận!`,
            isEn ? 'Just now' : 'Vừa xong',
            'linear-gradient(140deg,#3D8BFF,#22C3A6)',
            '📋',
            1
        ];
        notifData.inquiryData = {
            isUserOwn: true,
            name: inqRecord.name,
            contact: inqRecord.contact,
            template_name: tplName,
            template_id: payload.template_id,
            message: payload.message || 'Yêu cầu tư vấn thiết kế và dự toán thi công.',
            time: isEn ? 'Just now' : 'Vừa xong',
            status: 'submitted',
            gradient: 'linear-gradient(140deg,#3D8BFF,#22C3A6)'
        };

        if (this._createNotificationItem) {
            const li = this._createNotificationItem(notifData, true);
            list.insertBefore(li, list.firstChild);
            void li.offsetWidth;
            li.classList.remove('new');
            bell.classList.remove('ring');
            void bell.offsetWidth;
            bell.classList.add('ring');
            if (this._updateNotificationCount) this._updateNotificationCount();
            if (this._filterNotifications) this._filterNotifications();
        }

        // 3. Sau 6 giây, mô phỏng KTS gửi phản hồi tư vấn lại cho User
        setTimeout(() => {
            if (!root.isConnected || this.checkIsAdmin()) return;
            const responseData = [
                isEn ? 'Architect Vo Quoc Viet' : 'Kiến trúc sư DreamHouse',
                isEn ? `has replied to your inquiry for “${tplName}”: Turnkey estimate and structural plans are ready! Click to view.` :
                       `đã phản hồi yêu cầu tư vấn về “${tplName}”: Phương án bố trí mặt bằng và dự toán đã sẵn sàng! Bấm để xem.`,
                isEn ? 'Just now' : 'Vừa xong',
                'linear-gradient(140deg,#10B981,#059669)',
                '✉️',
                1
            ];
            responseData.inquiryData = {
                isResponse: true,
                name: isEn ? 'Architect Vo Quoc Viet (DreamHouse)' : 'Kiến trúc sư DreamHouse (Võ Quốc Việt)',
                contact: 'Hotline/Zalo: 0367020403 (KTS Võ Quốc Việt)',
                template_name: tplName,
                template_id: payload.template_id,
                message: isEn ?
                    'Thank you for your interest! Architect Vo Quoc Viet has prepared the functional layout and preliminary estimate for ' + tplName + '. Click "View 3D Model" to inspect or call our hotline for direct discussion.' :
                    'Cảm ơn bạn đã gửi yêu cầu! Kiến trúc sư DreamHouse đã tiếp nhận và chuẩn bị xong phương án mặt bằng sơ bộ kèm dự toán chi phí cho ' + tplName + '. Hãy bấm "Xem mô hình 3D" để xem chi tiết hoặc liên hệ hotline để trao đổi trực tiếp.',
                time: isEn ? 'Just now' : 'Vừa xong',
                status: 'handled',
                gradient: 'linear-gradient(140deg,#10B981,#059669)'
            };

            if (this._createNotificationItem) {
                const resLi = this._createNotificationItem(responseData, true);
                list.insertBefore(resLi, list.firstChild);
                void resLi.offsetWidth;
                resLi.classList.remove('new');
                bell.classList.remove('ring');
                void bell.offsetWidth;
                bell.classList.add('ring');
                if (this._updateNotificationCount) this._updateNotificationCount();
                if (this._filterNotifications) this._filterNotifications();
            }
        }, 6000);
    }

    /**
     * Mở modal xem chi tiết thông tin người cần tư vấn (Inquiry Detail Modal)
     */
    openInquiryDetailModal(inquiryData) {
        if (!inquiryData) return;
        const modal = document.getElementById('inquiry-detail-modal');
        if (!modal) return;

        const nameEl = document.getElementById('inquiry-client-name');
        const subEl = document.getElementById('inquiry-client-sub');
        const initialEl = document.getElementById('inquiry-avatar-initial');
        const avatarCircle = document.getElementById('inquiry-avatar-circle');
        const statusBadge = document.getElementById('inquiry-status-badge');
        const statusText = document.getElementById('inquiry-status-text');
        const timeEl = document.getElementById('inquiry-time-text');
        const contactVal = document.getElementById('inquiry-contact-val');
        const callBtn = document.getElementById('inquiry-call-btn');
        const copyBtn = document.getElementById('inquiry-copy-btn');
        const tplName = document.getElementById('inquiry-tpl-name');
        const tplTag = document.getElementById('inquiry-tpl-tag');
        const viewTplBtn = document.getElementById('inquiry-view-tpl-btn');
        const msgText = document.getElementById('inquiry-message-text');
        const handledBtn = document.getElementById('inquiry-handled-btn');
        const adminLinkBtn = document.getElementById('inquiry-admin-link-btn');

        const isAdmin = this.checkIsAdmin();
        const clientName = inquiryData.name || 'Khách hàng';
        if (nameEl) nameEl.textContent = clientName;
        if (initialEl) initialEl.textContent = clientName.trim().charAt(0).toUpperCase();

        if (avatarCircle && inquiryData.gradient) {
            avatarCircle.style.background = inquiryData.gradient;
        }

        // Tùy biến hiển thị theo vai trò (User vs Admin)
        if (inquiryData.isResponse) {
            if (subEl) subEl.textContent = 'Phản hồi chính thức từ Kiến trúc sư DreamHouse';
            if (statusBadge) statusBadge.className = 'inquiry-status-badge handled';
            if (statusText) statusText.textContent = 'Admin / KTS đã phản hồi';
            if (handledBtn) handledBtn.style.display = 'none';
            if (adminLinkBtn) adminLinkBtn.style.display = 'none';
        } else if (inquiryData.isUserOwn) {
            if (subEl) subEl.textContent = 'Yêu cầu tư vấn của bạn đã gửi đến Kiến trúc sư';
            if (statusBadge) statusBadge.className = 'inquiry-status-badge';
            if (statusText) statusText.textContent = 'Đang chờ KTS liên hệ';
            if (handledBtn) handledBtn.style.display = 'none';
            if (adminLinkBtn) adminLinkBtn.style.display = 'none';
        } else {
            // Trường hợp Admin xem lead khách hàng
            const isHandled = inquiryData.status === 'handled';
            if (subEl) subEl.textContent = 'Khách hàng quan tâm dự án kiến trúc';
            if (statusBadge) statusBadge.className = 'inquiry-status-badge' + (isHandled ? ' handled' : '');
            if (statusText) statusText.textContent = isHandled ? 'Đã tư vấn / xử lý' : 'Yêu cầu tư vấn mới';
            if (handledBtn) handledBtn.style.display = isAdmin ? 'inline-flex' : 'none';
            if (adminLinkBtn) adminLinkBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }

        if (timeEl) timeEl.textContent = inquiryData.time || 'Vừa xong';
        const contact = inquiryData.contact || '0367020403';
        if (contactVal) contactVal.textContent = contact;

        if (callBtn) {
            const cleanPhone = contact.replace(/[^0-9+]/g, '');
            if (cleanPhone) {
                callBtn.href = `tel:${cleanPhone}`;
                callBtn.style.display = 'inline-flex';
            } else {
                callBtn.style.display = 'none';
            }
        }

        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(contact).then(() => {
                    if (window.toast) window.toast.success('Đã sao chép liên hệ: ' + contact);
                }).catch(() => {
                    if (window.toast) window.toast.info('Liên hệ: ' + contact);
                });
            };
        }

        const templateName = inquiryData.template_name || inquiryData.template_id || 'Tư vấn kiến trúc chung';
        if (tplName) tplName.textContent = templateName;

        // Tìm mẫu nhà tương ứng trong danh mục
        const matchedTpl = this.templates ? this.templates.find(t => 
            (inquiryData.template_id && (t.id === inquiryData.template_id || t.slug === inquiryData.template_id)) ||
            (t.name_vi && templateName.includes(t.name_vi)) ||
            (t.name_en && templateName.includes(t.name_en))
        ) : null;

        if (tplTag) {
            tplTag.textContent = matchedTpl ? (matchedTpl.type || 'Kiến trúc nổi bật') : 'Tư vấn thiết kế';
        }

        if (viewTplBtn) {
            viewTplBtn.onclick = () => {
                this.closeInquiryDetailModal();
                if (matchedTpl) {
                    this.openDetailPanel(matchedTpl);
                } else if (this.templates && this.templates.length > 0) {
                    this.openDetailPanel(this.templates[0]);
                } else {
                    this.scrollToSection('gallery');
                }
            };
        }

        if (msgText) {
            msgText.textContent = `“${inquiryData.message || 'Khách hàng quan tâm mẫu nhà này và muốn nhận bản vẽ thiết kế công năng kèm dự toán thi công chi tiết.'}”`;
        }

        if (handledBtn) {
            handledBtn.onclick = async () => {
                inquiryData.status = 'handled';
                if (statusBadge) statusBadge.classList.add('handled');
                if (statusText) statusText.textContent = 'Đã tư vấn / xử lý';

                const client = this.getSupabase();
                if (client && inquiryData.id) {
                    try {
                        await client.from('inquiries').update({ status: 'handled' }).eq('id', inquiryData.id);
                    } catch (e) {
                        console.warn('Lỗi cập nhật status inquiry:', e);
                    }
                }
                if (window.toast) window.toast.success('Đã đánh dấu đã tư vấn thành công!');
            };
        }

        if (adminLinkBtn) {
            adminLinkBtn.onclick = () => {
                this.closeInquiryDetailModal();
                window.location.href = 'admin.html';
            };
        }

        // Nút đóng modal
        const closeBtn = document.getElementById('close-inquiry-modal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeInquiryDetailModal();
        }

        modal.onclick = (e) => {
            if (e.target === modal) this.closeInquiryDetailModal();
        };

        modal.classList.remove('hidden', 'is-closing');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Đóng modal xem chi tiết yêu cầu tư vấn với hiệu ứng mượt mà
     */
    closeInquiryDetailModal() {
        const modal = document.getElementById('inquiry-detail-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        modal.classList.add('is-closing');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('is-closing');
            document.body.style.overflow = '';
        }, 240);
    }

    /**
     * Khởi tạo hệ thống Dropdown tuỳ chỉnh hiện đại có hiệu ứng Animation trượt & xoay chevron (Animate-UI)
     */
    setupCustomDropdowns() {
        const dropdowns = document.querySelectorAll('.custom-dropdown');
        if (!dropdowns.length) return;

        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.custom-dropdown-trigger');
            const menu = dropdown.querySelector('.custom-dropdown-menu');
            const label = dropdown.querySelector('.custom-dropdown-label');
            const options = dropdown.querySelectorAll('.custom-dropdown-option');
            const nativeSelect = dropdown.querySelector('select');
            if (!trigger || !menu) return;

            // Bấm mở / đóng dropdown với animation mượt mà
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('is-open');

                // Đóng tất cả các custom dropdown khác đang mở
                document.querySelectorAll('.custom-dropdown.is-open').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('is-open');
                        d.querySelector('.custom-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                    }
                });

                dropdown.classList.toggle('is-open', !isOpen);
                trigger.setAttribute('aria-expanded', String(!isOpen));
            });

            // Chọn một mục trong danh sách menu
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = option.getAttribute('data-value');
                    const textSpan = option.querySelector('.option-text');
                    const text = textSpan ? textSpan.textContent.trim() : option.textContent.trim();
                    const i18nKey = textSpan?.getAttribute('data-i18n');

                    // Cập nhật class selected và aria-selected
                    options.forEach(o => {
                        o.classList.remove('selected');
                        o.setAttribute('aria-selected', 'false');
                    });
                    option.classList.add('selected');
                    option.setAttribute('aria-selected', 'true');

                    // Cập nhật nhãn hiển thị trên trigger button
                    if (label) {
                        label.textContent = text;
                        if (i18nKey) {
                            label.setAttribute('data-i18n', i18nKey);
                        } else {
                            label.removeAttribute('data-i18n');
                        }
                    }

                    // Đóng dropdown êm ái
                    dropdown.classList.remove('is-open');
                    trigger.setAttribute('aria-expanded', 'false');

                    // Đồng bộ giá trị vào thẻ select ngầm và kích hoạt event 'change'
                    if (nativeSelect && nativeSelect.value !== val) {
                        nativeSelect.value = val;
                        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });

            // Lắng nghe thay đổi từ native select nếu có script bên ngoài cập nhật
            if (nativeSelect) {
                nativeSelect.addEventListener('change', () => {
                    const currentVal = nativeSelect.value;
                    const matchingOption = dropdown.querySelector(`.custom-dropdown-option[data-value="${currentVal}"]`);
                    if (matchingOption) {
                        options.forEach(o => {
                            o.classList.remove('selected');
                            o.setAttribute('aria-selected', 'false');
                        });
                        matchingOption.classList.add('selected');
                        matchingOption.setAttribute('aria-selected', 'true');
                        if (label) {
                            const optText = matchingOption.querySelector('.option-text');
                            label.textContent = optText ? optText.textContent.trim() : matchingOption.textContent.trim();
                            const optI18n = optText?.getAttribute('data-i18n');
                            if (optI18n) label.setAttribute('data-i18n', optI18n);
                        }
                    }
                });
            }
        });

        // Bấm ra ngoài khoảng trống để đóng mọi dropdown đang mở
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.custom-dropdown.is-open').forEach(d => {
                    d.classList.remove('is-open');
                    d.querySelector('.custom-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                });
            }
        });

        // Nhấn phím Escape để đóng nhanh dropdown
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.custom-dropdown.is-open').forEach(d => {
                    d.classList.remove('is-open');
                    d.querySelector('.custom-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }

    clearAuthPasswordFields() {
        const passInput = document.getElementById('auth-password');
        const confirmInput = document.getElementById('auth-confirm-password');
        if (passInput) {
            passInput.value = '';
            passInput.type = 'password';
            passInput.removeAttribute('readonly');
        }
        if (confirmInput) {
            confirmInput.value = '';
            confirmInput.type = 'password';
            confirmInput.removeAttribute('readonly');
        }
        const defaultEye = `<svg class="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const togglePassBtn = document.getElementById('toggle-auth-pass-visibility');
        if (togglePassBtn) {
            togglePassBtn.innerHTML = defaultEye;
            togglePassBtn.classList.remove('active');
        }
        const toggleConfirmBtn = document.getElementById('toggle-auth-confirm-pass-visibility');
        if (toggleConfirmBtn) {
            toggleConfirmBtn.innerHTML = defaultEye;
            toggleConfirmBtn.classList.remove('active');
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        // Tránh kích hoạt lặp nếu đang trong hiệu ứng animation đóng
        if (modal.classList.contains('is-closing')) return;

        const backBtn = document.getElementById('auth-back-btn');
        if (backBtn) backBtn.classList.add('is-active-back');

        modal.classList.add('is-closing');
        this.clearAuthPasswordFields();

        const alertBox = document.getElementById('auth-alert');
        if (alertBox) {
            alertBox.className = 'auth-alert hidden';
            alertBox.textContent = '';
        }
        if (window.location.hash === '#login' || window.location.hash === '#register') {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }

        // Chờ animation mượt mà kết thúc (300ms) rồi mới ẩn modal hoàn toàn
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('is-closing');
            if (backBtn) backBtn.classList.remove('is-active-back');
        }, 300);
    }

    setAuthMode(mode) {
        const isRegister = (mode === 'register');
        this.isAuthRegisterMode = isRegister;

        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.remove('is-closing');

        const alertBox = document.getElementById('auth-alert');
        if (alertBox) {
            alertBox.className = 'auth-alert hidden';
            alertBox.textContent = '';
        }

        const nameGroup = document.getElementById('auth-name-group');
        if (nameGroup) nameGroup.style.display = isRegister ? 'block' : 'none';

        const confirmPassGroup = document.getElementById('auth-confirm-pass-group');
        if (confirmPassGroup) confirmPassGroup.style.display = isRegister ? 'block' : 'none';

        const confirmPassInput = document.getElementById('auth-confirm-password');
        if (confirmPassInput) {
            confirmPassInput.required = isRegister;
            confirmPassInput.value = '';
        }

        const identifierLabel = document.getElementById('auth-identifier-label');
        const identifierInput = document.getElementById('auth-email');
        if (identifierLabel) {
            identifierLabel.setAttribute('data-i18n', isRegister ? 'auth_username' : 'auth_email');
            identifierLabel.textContent = window.i18n ? window.i18n.t(isRegister ? 'auth_username' : 'auth_email') : (isRegister ? 'Tên tài khoản (Username)' : 'Tên tài khoản hoặc Email');
        }
        if (identifierInput) {
            identifierInput.placeholder = window.i18n ? window.i18n.t(isRegister ? 'auth_username_placeholder' : 'auth_login_placeholder') : (isRegister ? 'Ví dụ: quocviet99' : 'Nhập tên tài khoản hoặc email...');
        }

        const forgotLink = document.getElementById('auth-forgot-password');
        if (forgotLink) {
            forgotLink.style.display = isRegister ? 'none' : 'inline-block';
        }

        const titleEl = document.getElementById('auth-modal-title');
        if (titleEl) {
            titleEl.setAttribute('data-i18n', isRegister ? 'auth_title_register' : 'auth_title_login');
            titleEl.textContent = window.i18n ? window.i18n.t(isRegister ? 'auth_title_register' : 'auth_title_login') : (isRegister ? 'Sign Up' : 'Log in');
        }

        const methodHint = document.getElementById('auth-method-hint');
        if (methodHint) {
            methodHint.setAttribute('data-i18n', isRegister ? 'auth_email_hint_register' : 'auth_email_hint');
            methodHint.textContent = window.i18n ? window.i18n.t(isRegister ? 'auth_email_hint_register' : 'auth_email_hint') : (isRegister ? 'Đăng ký tài khoản bằng Username' : 'Đăng nhập bằng tên tài khoản hoặc email');
        }

        const submitBtn = document.getElementById('auth-submit-btn');
        if (submitBtn) {
            submitBtn.setAttribute('data-i18n', isRegister ? 'auth_register_action' : 'auth_login_action');
            submitBtn.textContent = window.i18n ? window.i18n.t(isRegister ? 'auth_register_action' : 'auth_login_action') : (isRegister ? 'Đăng ký' : 'Đăng nhập');
        }

        const switchModeLink = document.getElementById('auth-switch-mode');
        if (switchModeLink) {
            switchModeLink.setAttribute('data-i18n', isRegister ? 'auth_has_acc' : 'auth_no_acc');
            switchModeLink.textContent = window.i18n ? window.i18n.t(isRegister ? 'auth_has_acc' : 'auth_no_acc') : (isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay');
        }

        const nameInput = document.getElementById('auth-name');
        const passInput = document.getElementById('auth-password');
        const rememberCheckbox = document.getElementById('auth-remember-me');
        const rememberLabel = document.querySelector('.auth-remember-label');

        if (rememberLabel) {
            rememberLabel.style.display = isRegister ? 'none' : 'inline-flex';
        }

        if (isRegister) {
            if (nameInput) {
                nameInput.value = '';
                nameInput.setAttribute('name', 'name');
                nameInput.setAttribute('autocomplete', 'name');
            }
            if (identifierInput) {
                identifierInput.value = '';
                identifierInput.setAttribute('name', 'username');
                identifierInput.setAttribute('autocomplete', 'username');
            }
            this.clearAuthPasswordFields();
            if (passInput) {
                passInput.setAttribute('name', 'password');
                passInput.setAttribute('autocomplete', 'new-password');
            }
            if (confirmPassInput) {
                confirmPassInput.setAttribute('name', 'confirm_password');
                confirmPassInput.setAttribute('autocomplete', 'new-password');
            }
            if (rememberCheckbox) rememberCheckbox.checked = false;
        } else {
            if (identifierInput) {
                identifierInput.setAttribute('name', 'username');
                identifierInput.setAttribute('autocomplete', 'username');
            }
            if (passInput) {
                passInput.setAttribute('name', 'password');
                passInput.setAttribute('autocomplete', 'current-password');
            }
            if (confirmPassInput) {
                confirmPassInput.setAttribute('name', 'confirm_password');
                confirmPassInput.setAttribute('autocomplete', 'new-password');
            }
            this.clearAuthPasswordFields();
            this.loadRememberedAccount();
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
        
        const avatarUrl = this.currentProfile?.avatar_url || 
                          this.currentUser.user_metadata?.avatar_url || 
                          this.currentUser.user_metadata?.picture || '';
        if (avatarInput) avatarInput.value = avatarUrl;

        // Đặt lại trạng thái trường chọn tệp ảnh
        const fileInput = document.getElementById('profile-avatar-file');
        if (fileInput) fileInput.value = '';
        const fileNameSpan = document.getElementById('profile-avatar-filename');
        if (fileNameSpan) {
            fileNameSpan.textContent = avatarUrl ? (avatarUrl.startsWith('data:') ? 'Ảnh tùy chỉnh đã lưu' : 'Đã có ảnh đại diện') : 'Chưa chọn tệp ảnh mới';
            fileNameSpan.style.color = 'var(--color-text-muted)';
        }
        this.pendingAvatarFile = null;
        this.pendingAvatarBase64 = null;

        const urlContainer = document.getElementById('avatar-url-container');
        if (urlContainer) urlContainer.classList.add('hidden');

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
        setTimeout(() => {
            const currentPass = document.getElementById('profile-current-pass');
            if (currentPass && document.activeElement !== currentPass) {
                currentPass.value = '';
                currentPass.setAttribute('readonly', 'readonly');
            }
        }, 150);

        if (alertBox) {
            alertBox.className = 'profile-alert hidden';
            alertBox.textContent = '';
        }

        this.renderProfileModalAvatar(avatarUrl, displayName);
        modal.classList.remove('is-closing');
        modal.classList.remove('hidden');
    }

    resetPasswordSection() {
        const currentPassInput = document.getElementById('profile-current-pass');
        const newPassInput = document.getElementById('profile-new-pass');
        const confirmPassInput = document.getElementById('profile-confirm-pass');
        const passSection = document.getElementById('password-section-body');
        const passToggle = document.getElementById('toggle-password-section');
        const pillText = document.getElementById('pass-toggle-pill-text');

        if (currentPassInput) {
            currentPassInput.value = '';
            currentPassInput.type = 'password';
            currentPassInput.setAttribute('readonly', 'readonly');
        }
        if (newPassInput) {
            newPassInput.value = '';
            newPassInput.type = 'password';
            newPassInput.setAttribute('readonly', 'readonly');
        }
        if (confirmPassInput) {
            confirmPassInput.value = '';
            confirmPassInput.type = 'password';
            confirmPassInput.setAttribute('readonly', 'readonly');
        }

        const defaultEyeSvg = `<svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        ['toggle-current-pass-visibility', 'toggle-new-pass-visibility', 'toggle-confirm-pass-visibility'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.innerHTML = defaultEyeSvg;
        });

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

        let charSpan = document.getElementById('profile-avatar-char');
        let img = document.getElementById('profile-avatar-img');

        if (!charSpan) {
            charSpan = document.createElement('span');
            charSpan.id = 'profile-avatar-char';
            charSpan.className = 'profile-avatar-char';
            preview.insertBefore(charSpan, preview.firstChild);
        }
        charSpan.textContent = initial;

        if (!img) {
            img = document.createElement('img');
            img.id = 'profile-avatar-img';
            img.className = 'profile-avatar-img';
            img.alt = 'Avatar';
            preview.insertBefore(img, preview.querySelector('.profile-avatar-overlay'));
        }

        img.onerror = () => {
            img.style.display = 'none';
            img.classList.add('hidden');
        };

        if (avatarUrl && avatarUrl.trim()) {
            img.src = avatarUrl.trim();
            img.style.display = 'block';
            img.classList.remove('hidden');
        } else {
            img.style.display = 'none';
            img.classList.add('hidden');
            img.removeAttribute('src');
        }
    }

    compressAvatarImage(file, maxWidth = 320, maxHeight = 320, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    const minSide = Math.min(width, height);
                    const sx = (width - minSide) / 2;
                    const sy = (height - minSide) / 2;

                    canvas.width = Math.min(minSide, maxWidth);
                    canvas.height = Math.min(minSide, maxHeight);

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, canvas.width, canvas.height);

                    try {
                        const dataUrl = canvas.toDataURL('image/webp', quality);
                        resolve(dataUrl);
                    } catch (_) {
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    }
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    closeProfileModal() {
        const modal = document.getElementById('profile-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        if (modal.classList.contains('is-closing')) return;

        const closeBtn = document.getElementById('close-profile-modal');
        if (closeBtn) closeBtn.classList.add('is-active');

        modal.classList.add('is-closing');

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('is-closing');
            document.body.style.overflow = '';
            if (closeBtn) closeBtn.classList.remove('is-active');
        }, 280);
    }

    async handleSaveProfile(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const nameInput = document.getElementById('profile-name');
        const phoneInput = document.getElementById('profile-phone');
        const avatarInput = document.getElementById('profile-avatar-url');
        const currentPassInput = document.getElementById('profile-current-pass');
        const newPassInput = document.getElementById('profile-new-pass');
        const confirmPassInput = document.getElementById('profile-confirm-pass');
        const alertBox = document.getElementById('profile-alert');
        const submitBtn = document.getElementById('btn-save-profile');
        const submitBtnText = document.getElementById('save-btn-text');

        const fullName = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const avatarUrl = avatarInput ? avatarInput.value.trim() : '';
        const currentPassword = currentPassInput ? currentPassInput.value : '';
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

        const isVi = window.i18n ? window.i18n.getLang() === 'vi' : true;

        if (!fullName) {
            showAlert(isVi ? 'Vui lòng nhập họ và tên hiển thị.' : 'Please enter your display name.', true);
            nameInput?.focus();
            return;
        }

        if (newPassword || currentPassword) {
            if (!currentPassword) {
                showAlert(isVi ? 'Vui lòng nhập mật khẩu hiện tại để xác minh đổi mật khẩu.' : 'Please enter your current password to verify.', true);
                currentPassInput?.focus();
                return;
            }
            if (!newPassword) {
                showAlert(isVi ? 'Vui lòng nhập mật khẩu mới.' : 'Please enter a new password.', true);
                newPassInput?.focus();
                return;
            }
            if (newPassword.length < 6) {
                showAlert(isVi ? 'Mật khẩu mới phải có tối thiểu 6 ký tự.' : 'New password must be at least 6 characters.', true);
                newPassInput?.focus();
                return;
            }
            if (newPassword !== confirmPassword) {
                showAlert(isVi ? 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.' : 'Passwords do not match. Please verify.', true);
                confirmPassInput?.focus();
                return;
            }
            if (currentPassword === newPassword) {
                showAlert(isVi ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : 'New password must be different from current password.', true);
                newPassInput?.focus();
                return;
            }
        }

        const client = this.getSupabase();
        if (!client) {
            showAlert('Không thể kết nối Supabase.', true);
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang lưu...' : 'Saving...';

        try {
            // 1. Nếu có đổi mật khẩu: Xác thực mật khẩu hiện tại trước với Supabase Auth
            if (newPassword) {
                if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang xác thực...' : 'Verifying...';

                const email = this.currentUser.email;
                if (!email) {
                    throw new Error(isVi ? 'Không tìm thấy thông tin email tài khoản.' : 'Account email not found.');
                }

                const { error: verifyErr } = await client.auth.signInWithPassword({
                    email,
                    password: currentPassword
                });

                if (verifyErr) {
                    console.error('Verify current password failed:', verifyErr);
                    showAlert(isVi ? 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.' : 'Current password is incorrect. Please check again.', true);
                    currentPassInput?.focus();
                    if (submitBtn) submitBtn.disabled = false;
                    if (submitBtnText) submitBtnText.textContent = isVi ? 'Lưu thay đổi' : 'Save Changes';
                    return;
                }
            }

            if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang lưu...' : 'Saving...';

            // 2. Upload ảnh nếu người dùng chọn ảnh từ máy tính
            let finalAvatarUrl = avatarUrl;
            if (this.pendingAvatarFile) {
                if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang tải ảnh lên...' : 'Uploading avatar...';
                try {
                    const fileExt = this.pendingAvatarFile.name.split('.').pop() || 'jpg';
                    const fileName = `user_${this.currentUser.id}_${Date.now()}.${fileExt}`;
                    const filePath = `avatars/${fileName}`;

                    const { data: uploadData, error: upErr } = await client.storage
                        .from('template-images')
                        .upload(filePath, this.pendingAvatarFile, { upsert: true });

                    if (!upErr && uploadData) {
                        const { data: { publicUrl } } = client.storage.from('template-images').getPublicUrl(filePath);
                        if (publicUrl) finalAvatarUrl = publicUrl;
                    }
                } catch (stErr) {
                    console.warn('Storage upload fallback to compressed base64:', stErr);
                }
            }

            if (submitBtnText) submitBtnText.textContent = isVi ? 'Đang lưu...' : 'Saving...';

            // 3. Cập nhật bảng profiles
            const profilePayload = {
                full_name: fullName,
                avatar_url: finalAvatarUrl,
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

            // 4. Cập nhật Auth user metadata & đổi mật khẩu nếu có
            const userUpdatePayload = {
                data: {
                    full_name: fullName,
                    avatar_url: finalAvatarUrl,
                    phone: phone
                }
            };
            if (newPassword) {
                userUpdatePayload.password = newPassword;
            }

            const { data: authData, error: authError } = await client.auth.updateUser(userUpdatePayload);
            if (authError) throw authError;

            // 5. Cập nhật cache cục bộ
            if (this.currentProfile) {
                this.currentProfile.full_name = fullName;
                this.currentProfile.avatar_url = finalAvatarUrl;
                this.currentProfile.phone = phone;
            }
            if (authData?.user) {
                this.currentUser = authData.user;
            }

            // 6. Cập nhật UI Header ngay lập tức
            this.updateAuthUI();

            // 7. Reset form mật khẩu nếu đã đổi thành công
            if (newPassword) {
                this.resetPasswordSection();
            }

            this.pendingAvatarFile = null;
            this.pendingAvatarBase64 = null;

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
        const avatarCircle = document.getElementById('user-avatar-initials') || document.querySelector('.user-avatar-circle');

        if (this.currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userDropdown) userDropdown.classList.remove('hidden');

            const displayName = this.currentProfile?.full_name || 
                                this.currentUser.user_metadata?.full_name || 
                                this.currentUser.user_metadata?.username ||
                                (this.currentUser.email ? this.currentUser.email.split('@')[0] : 'Thành viên');
            if (userNameSpan) userNameSpan.textContent = displayName;

            // Hiển thị ảnh Avatar trên thanh điều hướng hoặc chữ cái đầu
            const avatarUrl = this.currentProfile?.avatar_url || 
                              this.currentUser.user_metadata?.avatar_url || 
                              this.currentUser.user_metadata?.picture;
            if (avatarCircle) {
                if (avatarUrl && avatarUrl.trim()) {
                    avatarCircle.innerHTML = `<img src="${avatarUrl.trim()}" alt="${displayName}" class="nav-avatar-img" onerror="this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center';" />`;
                } else {
                    avatarCircle.textContent = displayName.charAt(0).toUpperCase();
                }
            }

            const isAdmin = this.currentProfile?.role === 'admin' || 
                            this.currentUser.user_metadata?.role === 'admin' ||
                            this.currentUser.app_metadata?.role === 'admin';
            const roleKey = isAdmin ? 'role_admin' : 'role_member';
            if (roleBadge) {
                roleBadge.setAttribute('data-i18n', roleKey);
                roleBadge.textContent = window.i18n.t(roleKey);
            }
            const profileRoleEl = document.getElementById('profile-role-text');
            if (profileRoleEl) {
                profileRoleEl.setAttribute('data-i18n', roleKey);
                profileRoleEl.textContent = window.i18n.t(roleKey);
            }
            
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
            if (avatarCircle) {
                avatarCircle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            }
        }

        // Đồng bộ danh sách thông báo theo vai trò tài khoản (Admin xem lead khách hàng, User xem thông báo cá nhân)
        if (typeof this._renderNotificationList === 'function') {
            this._renderNotificationList();
        }
    }

    /**
     * =========================================================================
     * FEATURE 3: TIỆN ÍCH PHONG THỦY BẢN ĐỊA HÓA (LOCALIZED FENG SHUI SUITE)
     * Thước Lỗ Ban 3 Dải Đo (52.2cm, 42.9cm, 38.8cm) & Bát Trạch Tra Cứu Hướng Nhà
     * =========================================================================
     */
    initFengShuiSuite() {
        // 1. Mở / Đóng Modal Phong Thủy (#fengshui-modal)
        const modal = document.getElementById('fengshui-modal');
        const openBtns = [
            document.getElementById('nav-open-fengshui'),
            document.getElementById('hero-fengshui-btn'),
            document.getElementById('detail-btn-open-fs')
        ];
        const closeBtn = document.getElementById('close-fengshui-modal');

        const openModal = () => {
            if (!modal) return;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this._updateLubanDisplay(this._currentLubanMm || 2120);
            this._recalcBatTrach();
        };

        const closeModal = () => {
            if (!modal) return;
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        openBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', openModal);
        });

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        // 2. Chuyển đổi Tabs: Thước Lỗ Ban vs Bát Trạch
        const tabLuban = document.getElementById('fs-tab-luban');
        const tabBatTrach = document.getElementById('fs-tab-battrach');
        const panelLuban = document.getElementById('fs-panel-luban');
        const panelBatTrach = document.getElementById('fs-panel-battrach');

        if (tabLuban && tabBatTrach && panelLuban && panelBatTrach) {
            tabLuban.addEventListener('click', () => {
                tabLuban.classList.add('active');
                tabLuban.setAttribute('aria-selected', 'true');
                tabBatTrach.classList.remove('active');
                tabBatTrach.setAttribute('aria-selected', 'false');
                panelLuban.classList.add('active');
                panelBatTrach.classList.remove('active');
                this._updateLubanDisplay(this._currentLubanMm || 2120);
            });

            tabBatTrach.addEventListener('click', () => {
                tabBatTrach.classList.add('active');
                tabBatTrach.setAttribute('aria-selected', 'true');
                tabLuban.classList.remove('active');
                tabLuban.setAttribute('aria-selected', 'false');
                panelBatTrach.classList.add('active');
                panelLuban.classList.remove('active');
                this._recalcBatTrach();
            });
        }

        // 3. Khởi tạo Động cơ Thước Lỗ Ban
        this._initLubanEngine();

        // 4. Khởi tạo Động cơ Bát Trạch & Hướng Nhà
        this._initBatTrachEngine();

        // 5. Cầu nối tư vấn Phong Thủy 1-Chạm
        const bridgeBtn = document.getElementById('btn-fs-send-consult');
        if (bridgeBtn) {
            bridgeBtn.addEventListener('click', () => {
                closeModal();
                const contactSection = document.getElementById('contact-section');
                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                const noteInput = document.getElementById('inquiry-notes');
                if (noteInput && this._lastBatTrachData) {
                    const d = this._lastBatTrachData;
                    noteInput.value = `[TƯ VẤN PHONG THỦY] Gia chủ sinh năm ${d.year} (${d.canChi} - Mệnh ${d.menh}), Cung Phi ${d.cungPhi} (${d.groupName}). Hướng hợp: ${d.goodDirsStr}. Nhờ KTS Võ Quốc Việt tư vấn phương án bố trí mặt bằng công năng và hướng nhà phù hợp phong thủy.`;
                    noteInput.focus();
                }
                if (window.toast) {
                    window.toast.success(
                        window.i18n.getLang() === 'vi' 
                            ? 'Đã chuyển thông số phong thủy vào lời nhắn! Vui lòng để lại số điện thoại để KTS liên hệ.' 
                            : 'Feng Shui parameters attached! Please leave your phone number for Architect consultation.'
                    );
                }
            });
        }
    }

    /**
     * Khởi tạo Động cơ Thước Lỗ Ban 3 dải đo
     */
    _initLubanEngine() {
        this._currentLubanMm = 2120;
        this._lubanUnit = 'mm';

        // Bảng dữ liệu định nghĩa 3 thước Lỗ Ban
        this.LUBAN_TABLES = {
            // Thước 52.2 cm (522 mm) - 8 cung, mỗi cung 65.25mm
            522: {
                cycle: 522,
                majorCount: 8,
                step: 65.25,
                cungs: [
                    { name: 'Quý Nhân', isGood: true, meaning: 'Gia chủ gặp quý nhân phù trợ, sự nghiệp hanh thông, con cháu vinh hiển hiếu thuận.', minors: ['Quyền Lộc', 'Trung Tín', 'Tự Tại', 'Phúc Lộc', 'Quang Minh'] },
                    { name: 'Hiểm Họa', isGood: false, meaning: 'Dễ gặp điều bất trắc, tán tài hao của, tinh thần bất an, gia sự bất ổn.', minors: ['Tán Tài', 'Hậu Họa', 'Dâm Dục', 'Lo Sợ', 'Tang Sự'] },
                    { name: 'Thiên Tai', isGood: false, meaning: 'Đề phòng ốm đau bệnh tật triền miên, mất mát của cải, chia rẽ nội bộ.', minors: ['Thoát Tài', 'Mất Người', 'Mất Của', 'Lâm Bệnh', 'Chia Rẽ'] },
                    { name: 'Thiên Tài', isGood: true, meaning: 'Tài lộc dồi dào, thêm đinh thêm quý, công danh đỗ đạt, gia đạo thịnh vượng.', minors: ['Thi Thơ', 'Thêm Đinh', 'Hưng Vượng', 'Đắc Tài', 'Lộc Tồn'] },
                    { name: 'Phúc Lộc', isGood: true, meaning: 'Phúc đức tràn đầy, con cháu thành đạt, tài sản dồi dào, vạn sự hanh thông.', minors: ['Tử Tôn', 'Phú Quý', 'Tiến Bảo', 'Chiêu Tài', 'Thập Tài'] },
                    { name: 'Cô Độc', isGood: false, meaning: 'Gia đạo bất hòa, tha hương ly tán, cô quạnh, khó giữ của cải.', minors: ['Tuyệt Mệnh', 'Tán Sản', 'Thiếu Người', 'Bạc Bẽo', 'Trục Trặc'] },
                    { name: 'Thiên Tặc', isGood: false, meaning: 'Coi chừng trộm cướp, thị phi kiện tụng, tiền tài tiêu tán, tai ương khó lường.', minors: ['Phòng Bệnh', 'Chiêu Tai', 'Tù Ngục', 'Quan Tụng', 'Trộm Cướp'] },
                    { name: 'Tể Tướng', isGood: true, meaning: 'Công danh hiển hách, thăng quan tiến chức, quý nhân nâng đỡ, gia sản vững bền.', minors: ['Đại Tài', 'Thi Cử', 'Hoạch Tài', 'Hiếu Thuận', 'Quý Nhân'] }
                ]
            },
            // Thước 42.9 cm (429 mm) - 8 cung, mỗi cung 53.625mm
            429: {
                cycle: 429,
                majorCount: 8,
                step: 53.625,
                cungs: [
                    { name: 'Tài', isGood: true, meaning: 'Đón tài lộc cát tường, làm ăn phát đạt, tiền của vào nhà như nước.', minors: ['Tài Đức', 'Báo Khố', 'Lục Hợp', 'Nghênh Phúc'] },
                    { name: 'Bệnh', isGood: false, meaning: 'Dễ vướng bệnh tật, hao tài tốn của, việc quan sự bất an phiền muộn.', minors: ['Thoát Tài', 'Công Sự', 'Lao Ngục', 'Cô Quả'] },
                    { name: 'Ly', isGood: false, meaning: 'Gia đạo ly tán, thị phi khẩu thiệt, hao hụt tiền tài, công việc bế tắc.', minors: ['Trường Bệnh', 'Tụng Tụng', 'Kiếp Tài', 'Khổ Nạn'] },
                    { name: 'Nghĩa', isGood: true, meaning: 'Thêm đinh quý tử, tình nghĩa thủy chung, làm ăn gặp may mắn đại cát.', minors: ['Thêm Đinh', 'Ích Lợi', 'Quý Tử', 'Đại Cát'] },
                    { name: 'Quan', isGood: true, meaning: 'Thuận đường quan lộ, thi cử đỗ đạt cao, phú quý thịnh vượng nhiều đời.', minors: ['Thuận Khoa', 'Hoành Tài', 'Tiến Ích', 'Phú Quý'] },
                    { name: 'Kiếp', isGood: false, meaning: 'Dễ bị lừa gạt, mất mát tài sản, ly hương bôn ba, tai ương rình rập.', minors: ['Tử Biệt', 'Thoái Khẩu', 'Ly Hương', 'Thất Tài'] },
                    { name: 'Hại', isGood: false, meaning: 'Bệnh tật triền miên, khẩu thiệt thị phi, gia đạo trắc trở nhiều điều hại.', minors: ['Tai Bệnh', 'Tử Tuyệt', 'Khẩu Thiệt', 'Lâm Bệnh'] },
                    { name: 'Bản', isGood: true, meaning: 'Bản mệnh hưng vượng, tài trí sáng suốt, tiến bảo sinh sôi nhiều của cải.', minors: ['Tài Chí', 'Đăng Khoa', 'Tiến Bảo', 'Hưng Vượng'] }
                ]
            },
            // Thước 38.8 cm (388 mm) - 10 cung, mỗi cung 38.8mm
            388: {
                cycle: 388,
                majorCount: 10,
                step: 38.8,
                cungs: [
                    { name: 'Đinh', isGood: true, meaning: 'Sao phúc chiếu rọi, gia đạo bình an, thêm đinh vượng khí tổ tông.', minors: ['Phúc Tinh', 'Cập Đệ', 'Tài Vượng', 'Đăng Khoa'] },
                    { name: 'Hại', isGood: false, meaning: 'Tránh khẩu thiệt thị phi, đề phòng bệnh tật hoặc tai nạn rủi ro.', minors: ['Khẩu Thiệt', 'Bệnh Lâm', 'Tử Tuyệt', 'Tai Họa'] },
                    { name: 'Vượng', isGood: true, meaning: 'Hỷ sự lâm môn, tiến bảo phát tài, hưởng nhiều thiên đức cát khí.', minors: ['Thiên Đức', 'Hỷ Sự', 'Tiến Bảo', 'Thêm Phúc'] },
                    { name: 'Khổ', isGood: false, meaning: 'Thất thoát tiền tài, việc quan sự trở ngại, tâm thần âu lo vất vả.', minors: ['Thất Thoát', 'Quan Quỷ', 'Kiếp Tài', 'Vô Tự'] },
                    { name: 'Nghĩa', isGood: true, meaning: 'Đại cát đại lợi, phúc trạch sâu dày, được trời ban tài lộc hanh thông.', minors: ['Đại Cát', 'Tài Vượng', 'Ích Lợi', 'Thiên Phú'] },
                    { name: 'Quan', isGood: true, meaning: 'Công danh hiển đạt, tiến bảo thăng hoa, buôn bán phát tài đắc lợi.', minors: ['Phú Quý', 'Tiến Bảo', 'Hoạnh Tài', 'Thuận Khoa'] },
                    { name: 'Tử', isGood: false, meaning: 'Ly hương phiêu bạt, thất thoát con người, tiêu tán của cải gia đình.', minors: ['Ly Hương', 'Tử Biệt', 'Thoát Đinh', 'Thất Tài'] },
                    { name: 'Hưng', isGood: true, meaning: 'Gia đình hưng thịnh, con cháu thông minh đỗ đạt, rạng rỡ dòng tộc.', minors: ['Đăng Khoa', 'Quý Tử', 'Thêm Đinh', 'Hưng Vượng'] },
                    { name: 'Thất', isGood: false, meaning: 'Thoái tài hao của, cô quả trắc trở, kiện tụng khó yên.', minors: ['Cô Quả', 'Lao Ngục', 'Công Sự', 'Thoái Tài'] },
                    { name: 'Tài', isGood: true, meaning: 'Nghênh đón phúc lộc, lục hợp viên mãn, tài đức vẹn toàn viên mãn.', minors: ['Nghinh Phúc', 'Lục Hợp', 'Tiến Bảo', 'Tài Đức'] }
                ]
            }
        };

        const inputVal = document.getElementById('luban-input-value');
        const sliderVal = document.getElementById('luban-range-slider');
        const unitBtns = document.querySelectorAll('.unit-btn');
        const presetChips = document.querySelectorAll('.fs-chip');

        // Lắng nghe Input số
        if (inputVal) {
            inputVal.addEventListener('input', () => {
                let val = parseFloat(inputVal.value) || 0;
                if (this._lubanUnit === 'cm') val = val * 10;
                val = Math.max(100, Math.min(8000, val));
                this._currentLubanMm = val;
                if (sliderVal) sliderVal.value = Math.min(5000, Math.max(200, val));
                this._updateLubanDisplay(val);
            });
        }

        // Lắng nghe Slider
        if (sliderVal) {
            sliderVal.addEventListener('input', () => {
                const val = parseFloat(sliderVal.value) || 2120;
                this._currentLubanMm = val;
                if (inputVal) {
                    inputVal.value = this._lubanUnit === 'cm' ? (val / 10).toFixed(1) : val;
                }
                this._updateLubanDisplay(val);
            });
        }

        // Lắng nghe Unit Toggle (mm / cm)
        unitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                unitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._lubanUnit = btn.dataset.unit || 'mm';
                if (inputVal) {
                    inputVal.value = this._lubanUnit === 'cm' ? (this._currentLubanMm / 10).toFixed(1) : this._currentLubanMm;
                }
            });
        });

        // Lắng nghe Preset Chips
        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const val = parseFloat(chip.dataset.val) || 2120;
                this._currentLubanMm = val;
                if (inputVal) {
                    inputVal.value = this._lubanUnit === 'cm' ? (val / 10).toFixed(1) : val;
                }
                if (sliderVal) {
                    sliderVal.value = Math.min(5000, Math.max(200, val));
                }
                this._updateLubanDisplay(val);
            });
        });

        // Kéo thả thước tương tác trực tiếp trên sân khấu Thước Lỗ Ban
        const stage = document.querySelector('.luban-rulers-stage');
        if (stage) {
            let isDragging = false;
            let startX = 0;
            let initialMm = 0;

            const onPointerDown = (e) => {
                isDragging = true;
                startX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                initialMm = this._currentLubanMm || 2120;
                stage.classList.add('is-dragging');
            };

            const onPointerMove = (e) => {
                if (!isDragging) return;
                const currentX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                const deltaPx = currentX - startX;
                // Kéo sang phải làm giảm mm, kéo sang trái làm tăng mm (1mm = 2px)
                const deltaMm = Math.round(deltaPx / 2.0);
                let newMm = initialMm - deltaMm;
                newMm = Math.max(100, Math.min(8000, newMm));
                this._currentLubanMm = newMm;

                if (inputVal) {
                    inputVal.value = this._lubanUnit === 'cm' ? (newMm / 10).toFixed(1) : newMm;
                }
                if (sliderVal) {
                    sliderVal.value = Math.min(5000, Math.max(200, newMm));
                }
                this._updateLubanDisplay(newMm);
            };

            const onPointerUp = () => {
                if (isDragging) {
                    isDragging = false;
                    stage.classList.remove('is-dragging');
                }
            };

            stage.addEventListener('mousedown', onPointerDown);
            window.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);

            stage.addEventListener('touchstart', onPointerDown, { passive: true });
            window.addEventListener('touchmove', onPointerMove, { passive: true });
            window.addEventListener('touchend', onPointerUp);
        }

        this._updateLubanDisplay(this._currentLubanMm);
    }

    /**
     * Cập nhật hiển thị giao diện 3 Thước Lỗ Ban và Bảng chẩn đoán
     */
    _updateLubanDisplay(valMm) {
        valMm = Math.round(valMm);
        const readout = document.getElementById('luban-readout');
        const diagDim = document.getElementById('diag-current-dim');
        const coordBadge = document.getElementById('hairline-coord-badge');

        if (readout) readout.textContent = `${valMm} mm (${(valMm / 10).toFixed(1)} cm)`;
        if (diagDim) diagDim.textContent = `${valMm} mm`;
        if (coordBadge) coordBadge.textContent = `${valMm} mm (${(valMm / 10).toFixed(1)} cm)`;

        // Render từng thước: 522, 429, 388
        const res522 = this._renderSingleRulerTape(522, valMm, 'tape-track-522');
        const res429 = this._renderSingleRulerTape(429, valMm, 'tape-track-429');
        const res388 = this._renderSingleRulerTape(388, valMm, 'tape-track-388');

        // Cập nhật thẻ chẩn đoán 52.2
        this._updateDiagnosisCard('522', res522);
        this._updateDiagnosisCard('429', res429);
        this._updateDiagnosisCard('388', res388);

        // Lời khuyên tổng hợp KTS
        const adviceBox = document.getElementById('diag-advice-text');
        if (adviceBox) {
            const allGood = res522.isGood && res429.isGood && res388.isGood;
            const openGood = res522.isGood; // Thông thủy quan trọng nhất cho cửa
            if (allGood) {
                adviceBox.innerHTML = `Kích thước <strong>${valMm} mm</strong> là kích thước phong thủy đại cát, <span style="color:#ef4444;font-weight:700">ĐỎ CẢ 3 THƯỚC</span>! Vô cùng cát lợi cho gia chủ làm cửa chính, phòng ngủ hoặc bàn thờ.`;
            } else if (openGood) {
                adviceBox.innerHTML = `Kích thước <strong>${valMm} mm</strong> đạt cung Đỏ <span style="color:#ef4444;font-weight:700">${res522.cungName} (${res522.minorName})</span> trên thước Thông Thủy 52.2cm. Rất thích hợp làm kích thước lọt lòng cửa chính, cửa thông phòng và chiều cao trần nhà.`;
            } else {
                // Gợi ý kích thước đỏ gần nhất
                const cycle = 522;
                const posInCycle = valMm % cycle;
                let nearestGoodMm = valMm;
                // Tìm cung tốt gần nhất của thước 522
                for (let delta = 1; delta <= 120; delta++) {
                    const testPlus = valMm + delta;
                    const testMinus = valMm - delta;
                    if (this._evaluateCung(522, testPlus).isGood) {
                        nearestGoodMm = testPlus;
                        break;
                    }
                    if (this._evaluateCung(522, testMinus).isGood) {
                        nearestGoodMm = testMinus;
                        break;
                    }
                }
                const diff = nearestGoodMm - valMm;
                const action = diff > 0 ? `tăng thêm ${diff} mm (lên ${nearestGoodMm} mm)` : `giảm bớt ${Math.abs(diff)} mm (xuống ${nearestGoodMm} mm)`;
                adviceBox.innerHTML = `Kích thước <strong>${valMm} mm</strong> hiện rơi vào <span style="color:#ef4444;font-weight:700">${res522.cungName} (Cung Xấu)</span> trên thước Thông Thủy. KTS khuyên bạn nên <strong>${action}</strong> để đạt cung Cát Lộc may mắn!`;
            }
        }
    }

    /**
     * Đánh giá một giá trị mm rơi vào cung nào trên thước
     */
    _evaluateCung(rulerKey, valMm) {
        const table = this.LUBAN_TABLES[rulerKey];
        if (!table) return { cungName: '', isGood: false, meaning: '', minorName: '' };

        const pos = valMm % table.cycle;
        const majorIndex = Math.floor(pos / table.step) % table.majorCount;
        const cung = table.cungs[majorIndex];

        // Tính cung nhỏ
        const posInMajor = pos - (majorIndex * table.step);
        const minorStep = table.step / cung.minors.length;
        const minorIndex = Math.min(cung.minors.length - 1, Math.floor(posInMajor / minorStep));
        const minorName = cung.minors[minorIndex];

        return {
            majorIndex,
            cungName: cung.name,
            isGood: cung.isGood,
            meaning: cung.meaning,
            minorName,
            posInCycle: pos
        };
    }

    /**
     * Render dải thước chuyển động theo tọa độ valMm (Kiến trúc đa tầng 3-tier siêu nét)
     */
    _renderSingleRulerTape(rulerKey, valMm, trackElementId) {
        const track = document.getElementById(trackElementId);
        const table = this.LUBAN_TABLES[rulerKey];
        if (!track || !table) return this._evaluateCung(rulerKey, valMm);

        const currentCung = this._evaluateCung(rulerKey, valMm);

        // Quy chuẩn tỉ lệ kiến trúc: 1mm = 2.0px để các cung và vạch chia thoáng đãng, sắc nét
        const pxPerMm = 2.0;
        const spanMm = 450; // Quét vùng hiển thị 450mm mỗi bên tâm kim đo (tổng 900mm = 1800px)
        const minMm = Math.max(0, valMm - spanMm);
        const maxMm = valMm + spanMm;

        const firstMajor = Math.floor(minMm / table.step);
        const lastMajor = Math.ceil(maxMm / table.step);
        const trackStartMm = firstMajor * table.step;

        // 1. Sinh các khối Cung Lớn và phân chia Cung Nhỏ
        let cungsHtml = '';
        for (let k = firstMajor; k <= lastMajor; k++) {
            const majorIdx = ((k % table.majorCount) + table.majorCount) % table.majorCount;
            const cung = table.cungs[majorIdx];
            const cungWidthPx = table.step * pxPerMm;
            const isGood = cung.isGood;
            const cungClass = isGood ? 'cung-good' : 'cung-bad';
            const cungBadgeText = isGood ? 'CÁT' : 'HUNG';

            // Sinh các ô Cung Nhỏ bên dưới
            const numMinors = cung.minors.length;
            const minorWidthPx = cungWidthPx / numMinors;
            let minorsHtml = '';
            for (let m = 0; m < numMinors; m++) {
                const minorStartMm = (k * table.step) + (m * (table.step / numMinors));
                const minorEndMm = minorStartMm + (table.step / numMinors);
                const isActive = (valMm >= minorStartMm && valMm < minorEndMm);
                const activeClass = isActive ? 'is-active-minor' : '';
                const minorName = cung.minors[m];

                // Tách 2 từ của tên cung nhỏ để hiển thị dạng 2 dòng cân đối, rõ ràng
                const words = minorName.split(' ');
                const labelHtml = words.length === 2
                    ? `<span class="minor-w">${words[0]}</span><span class="minor-w">${words[1]}</span>`
                    : `<span class="minor-w">${minorName}</span>`;

                minorsHtml += `
                    <div class="tape-minor-cell ${activeClass}" style="width: ${minorWidthPx.toFixed(1)}px;" title="${cung.name} - ${minorName}">
                        ${labelHtml}
                    </div>
                `;
            }

            cungsHtml += `
                <div class="tape-cung-block ${cungClass}" style="width: ${cungWidthPx.toFixed(1)}px;">
                    <div class="tape-major-header">
                        <span class="tape-major-name">${cung.name}</span>
                        <span class="tape-cung-badge">${cungBadgeText}</span>
                    </div>
                    <div class="tape-minor-row">
                        ${minorsHtml}
                    </div>
                </div>
            `;
        }

        // 2. Sinh dải vạch Centimet & Milimet trên đầu thước
        const startCm = Math.floor(trackStartMm / 10);
        const endCm = Math.ceil(((lastMajor + 1) * table.step) / 10);
        let metricTicksHtml = '';
        for (let c = startCm; c <= endCm; c++) {
            const cmMm = c * 10;
            const posPx = (cmMm - trackStartMm) * pxPerMm;
            // Vạch cm chính và số cm
            metricTicksHtml += `
                <div class="metric-cm-mark" style="left: ${posPx.toFixed(1)}px;">
                    <span class="metric-cm-val">${c}</span>
                    <div class="metric-tick tick-cm"></div>
                </div>
            `;
            // Vạch 5mm (giữa 2 số cm)
            const midMm = cmMm + 5;
            const midPx = (midMm - trackStartMm) * pxPerMm;
            metricTicksHtml += `
                <div class="metric-tick tick-mid" style="left: ${midPx.toFixed(1)}px;"></div>
            `;
        }

        const totalWidthPx = ((lastMajor + 1) * table.step - trackStartMm) * pxPerMm;

        track.innerHTML = `
            <div class="tape-metric-bar" style="width: ${totalWidthPx.toFixed(1)}px;">
                ${metricTicksHtml}
            </div>
            <div class="tape-cungs-row" style="width: ${totalWidthPx.toFixed(1)}px;">
                ${cungsHtml}
            </div>
        `;

        // 3. Căn chỉnh dịch chuyển track sao cho tọa độ valMm khớp chuẩn xác tuyệt đối với kim đo (50%)
        const targetOffsetPx = -((valMm - trackStartMm) * pxPerMm);
        track.style.transform = `translateX(${targetOffsetPx.toFixed(1)}px)`;

        // 4. Cập nhật thẻ trạng thái trực tiếp trên header của thước
        const livePill = document.getElementById(`ruler-live-pill-${rulerKey}`);
        if (livePill) {
            livePill.className = `ruler-live-pill ${currentCung.isGood ? 'pill-good' : 'pill-bad'}`;
            livePill.innerHTML = currentCung.isGood
                ? `<span class="pill-icon">✓ CÁT</span> <strong>${currentCung.cungName}</strong> · ${currentCung.minorName}`
                : `<span class="pill-icon">✕ HUNG</span> <strong>${currentCung.cungName}</strong> · ${currentCung.minorName}`;
        }

        return currentCung;
    }

    /**
     * Cập nhật thẻ kết quả chẩn đoán
     */
    _updateDiagnosisCard(rulerKey, res) {
        const card = document.getElementById(`diag-card-${rulerKey}`);
        const statusPill = document.getElementById(`diag-status-${rulerKey}`);
        const titleEl = document.getElementById(`diag-cung-${rulerKey}`);
        const meaningEl = document.getElementById(`diag-meaning-${rulerKey}`);

        if (card) {
            card.classList.toggle('is-good', res.isGood);
            card.classList.toggle('is-bad', !res.isGood);
        }

        if (statusPill) {
            statusPill.textContent = res.isGood ? 'Cát (Tốt)' : 'Hung (Xấu)';
            statusPill.className = `diag-status-pill ${res.isGood ? 'status-good' : 'status-bad'}`;
        }

        if (titleEl) {
            titleEl.textContent = `Cung ${res.cungName} (${res.minorName})`;
        }

        if (meaningEl) {
            meaningEl.textContent = res.meaning;
        }
    }

    /**
     * Khởi tạo Động cơ Bát Trạch & Hướng Nhà Hợp Tuổi
     */
    _initBatTrachEngine() {
        const yearSelect = document.getElementById('battrach-birth-select');
        const genderPills = document.querySelectorAll('.gender-pill');
        const calcBtn = document.getElementById('btn-calc-battrach');

        this._batTrachGender = 'male';

        // Nạp danh sách năm sinh từ 1950 đến 2026
        if (yearSelect) {
            let options = '';
            for (let y = 2026; y >= 1950; y--) {
                const selected = y === 1990 ? 'selected' : '';
                options += `<option value="${y}" ${selected}>${y} (Năm sinh)</option>`;
            }
            yearSelect.innerHTML = options;
            yearSelect.addEventListener('change', () => this._recalcBatTrach());
        }

        genderPills.forEach(pill => {
            pill.addEventListener('click', () => {
                genderPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this._batTrachGender = pill.dataset.gender || 'male';
                this._recalcBatTrach();
            });
        });

        if (calcBtn) {
            calcBtn.addEventListener('click', () => this._recalcBatTrach());
        }

        this._recalcBatTrach();
    }

    /**
     * Tính toán Bát Trạch và hiển thị La Bàn 8 Hướng
     */
    _recalcBatTrach() {
        const yearSelect = document.getElementById('battrach-birth-select');
        const year = parseInt(yearSelect?.value) || 1990;
        const gender = this._batTrachGender || 'male';

        // 1. Tính Can Chi
        const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
        const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
        const canIndex = (year - 4) % 10;
        const chiIndex = (year - 4) % 12;
        const canChi = `${CAN[canIndex >= 0 ? canIndex : canIndex + 10]} ${CHI[chiIndex >= 0 ? chiIndex : chiIndex + 12]}`;

        // 2. Mệnh Ngũ Hành Niên Mệnh (Tra cứu chu kỳ 60 hoa giáp)
        const MENH_TABLE = {
            'Hải Trung Kim': [1984, 1985, 1924, 1925],
            'Lư Trung Hỏa': [1986, 1987, 1926, 1927],
            'Đại Lâm Mộc': [1988, 1989, 1928, 1929],
            'Lộ Bàng Thổ': [1990, 1991, 1930, 1931],
            'Kiếm Phong Kim': [1992, 1993, 1932, 1933],
            'Sơn Đầu Hỏa': [1994, 1995, 1934, 1935],
            'Giản Hạ Thủy': [1996, 1997, 1936, 1937],
            'Thành Đầu Thổ': [1998, 1999, 1938, 1939],
            'Bạch Lạp Kim': [2000, 2001, 1940, 1941],
            'Dương Liễu Mộc': [2002, 2003, 1942, 1943],
            'Tuyền Trung Thủy': [2004, 2005, 1944, 1945],
            'Ốc Thượng Thổ': [2006, 2007, 1946, 1947],
            'Tích Lịch Hỏa': [2008, 2009, 1948, 1949],
            'Tùng Bách Mộc': [2010, 2011, 1950, 1951],
            'Trường Lưu Thủy': [2012, 2013, 1952, 1953],
            'Sa Trung Kim': [2014, 2015, 1954, 1955],
            'Sơn Hạ Hỏa': [2016, 2017, 1956, 1957],
            'Bình Địa Mộc': [2018, 2019, 1958, 1959],
            'Bích Thượng Thổ': [2020, 2021, 1960, 1961],
            'Kim Bạch Kim': [2022, 2023, 1962, 1963],
            'Phúc Đăng Hỏa': [2024, 2025, 1964, 1965],
            'Thiên Hà Thủy': [2026, 2027, 1966, 1967]
        };

        let menhName = 'Lộ Bàng Thổ';
        for (const [mName, years] of Object.entries(MENH_TABLE)) {
            if (years.includes(year)) {
                menhName = mName;
                break;
            }
        }

        // 3. Tính Quái Số Cung Phi Bát Trạch (Nam vs Nữ)
        const lastTwoDigits = year % 100;
        let sumDigits = Math.floor(lastTwoDigits / 10) + (lastTwoDigits % 10);
        while (sumDigits > 9) {
            sumDigits = Math.floor(sumDigits / 10) + (sumDigits % 10);
        }

        let quaiSo = 1;
        if (year < 2000) {
            quaiSo = gender === 'male' ? 10 - sumDigits : 5 + sumDigits;
        } else {
            quaiSo = gender === 'male' ? 9 - sumDigits : 6 + sumDigits;
        }
        while (quaiSo > 9) quaiSo -= 9;
        if (quaiSo <= 0) quaiSo += 9;

        // Số 5 hóa Khôn đối với Nam, Cấn đối với Nữ
        if (quaiSo === 5) {
            quaiSo = gender === 'male' ? 2 : 8;
        }

        // Bảng 8 Cung Bát Quái
        const KUA_DATA = {
            1: {
                name: 'Khảm (Thủy)',
                group: 'Đông Tứ Mệnh',
                good: [
                    { dir: 'Đông Nam', star: 'Sinh Khí', angle: 135, meaning: 'Thu hút tài lộc, danh tiếng thăng tiến, vượng khí dồi dào.' },
                    { dir: 'Đông', star: 'Thiên Y', angle: 90, meaning: 'Cải thiện sức khỏe, trường thọ, gia đình bình an không bệnh tật.' },
                    { dir: 'Nam', star: 'Diên Niên', angle: 180, meaning: 'Củng cố các mối quan hệ hòa thuận, gia đạo êm ấm vạn sự thành.' },
                    { dir: 'Bắc', star: 'Phục Vị', angle: 0, meaning: 'Củng cố sức mạnh tinh thần, bản thân tiến bộ, may mắn trong thi cử.' }
                ],
                bad: [
                    { dir: 'Tây Nam', star: 'Tuyệt Mệnh', angle: 225, meaning: 'Phá sản, bệnh tật chết người, tai ương nghiêm trọng cần tránh.' },
                    { dir: 'Đông Bắc', star: 'Ngũ Quỷ', angle: 45, meaning: 'Mất nguồn thu nhập, mất việc làm, cãi lộn thị phi bất hòa.' },
                    { dir: 'Tây Bắc', star: 'Lục Sát', angle: 315, meaning: 'Xáo trộn trong quan hệ tình cảm, thù hận, kiện tụng, tai nạn.' },
                    { dir: 'Tây', star: 'Họa Hại', angle: 270, meaning: 'Không may mắn, thị phi, thất bại trong các dự định làm ăn.' }
                ]
            },
            2: {
                name: 'Khôn (Thổ)',
                group: 'Tây Tứ Mệnh',
                good: [
                    { dir: 'Đông Bắc', star: 'Sinh Khí', angle: 45, meaning: 'Đại cát đại lợi, thu hút tài lộc vượng khí, kinh doanh phát đạt.' },
                    { dir: 'Tây', star: 'Thiên Y', angle: 270, meaning: 'Sức khỏe dồi dào, tâm trí an lành, gia đạo phúc đức.' },
                    { dir: 'Tây Bắc', star: 'Diên Niên', angle: 315, meaning: 'Gia đình gắn kết hòa thuận, sự nghiệp vững vàng lâu bền.' },
                    { dir: 'Tây Nam', star: 'Phục Vị', angle: 225, meaning: 'Tăng cường sức mạnh nội tại, may mắn và bình an.' }
                ],
                bad: [
                    { dir: 'Bắc', star: 'Tuyệt Mệnh', angle: 0, meaning: 'Đại hung hiểm, hao tổn nhân đinh tài của, tuyệt đối tránh làm cửa chính.' },
                    { dir: 'Đông Nam', star: 'Ngũ Quỷ', angle: 135, meaning: 'Thị phi rình rập, hao tổn tiền bạc, dễ gặp hỏa hoạn.' },
                    { dir: 'Nam', star: 'Lục Sát', angle: 180, meaning: 'Gia đạo bất an, tai tiếng thị phi, kiện tụng khó yên.' },
                    { dir: 'Đông', star: 'Họa Hại', angle: 90, meaning: 'Gặp nhiều trở ngại trắc trở, làm ăn thất bát.' }
                ]
            },
            3: {
                name: 'Chấn (Mộc)',
                group: 'Đông Tứ Mệnh',
                good: [
                    { dir: 'Nam', star: 'Sinh Khí', angle: 180, meaning: 'Tài lộc tấn tới, vinh hoa phú quý, con cái học hành đỗ đạt cao.' },
                    { dir: 'Bắc', star: 'Thiên Y', angle: 0, meaning: 'Bệnh tật tiêu trừ, quý nhân phù trợ trường thọ khỏe mạnh.' },
                    { dir: 'Đông Nam', star: 'Diên Niên', angle: 135, meaning: 'Gia đạo êm đẹp hạnh phúc, bạn bè đối tác đồng lòng.' },
                    { dir: 'Đông', star: 'Phục Vị', angle: 90, meaning: 'Bình an tĩnh tâm, thi cử may mắn đắc ý.' }
                ],
                bad: [
                    { dir: 'Tây', star: 'Tuyệt Mệnh', angle: 270, meaning: 'Đại họa tai ương, hao tán tài sản gia phong.' },
                    { dir: 'Tây Bắc', star: 'Ngũ Quỷ', angle: 315, meaning: 'Dễ gặp kẻ xấu hãm hại, mất cắp tiền tài.' },
                    { dir: 'Đông Bắc', star: 'Lục Sát', angle: 45, meaning: 'Trục trặc tình cảm, tai bay vạ gió, thị phi quan sự.' },
                    { dir: 'Tây Nam', star: 'Họa Hại', angle: 225, meaning: 'Khó khăn bất trắc, khẩu thiệt trong công việc.' }
                ]
            },
            4: {
                name: 'Tốn (Mộc)',
                group: 'Đông Tứ Mệnh',
                good: [
                    { dir: 'Bắc', star: 'Sinh Khí', angle: 0, meaning: 'Tài vận hưng thịnh, công danh rộng mở, đắc lộc trời ban.' },
                    { dir: 'Nam', star: 'Thiên Y', angle: 180, meaning: 'Sức khỏe dồi dào, trường thọ an khang thịnh vượng.' },
                    { dir: 'Đông', star: 'Diên Niên', angle: 90, meaning: 'Gia đình hòa thuận keo sơn, nhân duyên bền chặt tốt đẹp.' },
                    { dir: 'Đông Nam', star: 'Phục Vị', angle: 135, meaning: 'Gia tăng may mắn, tinh thần an lạc, vạn sự thuận hòa.' }
                ],
                bad: [
                    { dir: 'Đông Bắc', star: 'Tuyệt Mệnh', angle: 45, meaning: 'Tuyệt mệnh nguy hại, đại kỵ hướng cửa và ban thờ.' },
                    { dir: 'Tây Nam', star: 'Ngũ Quỷ', angle: 225, meaning: 'Gia đạo bất an, bệnh tật hao tốn, thị phi liên miên.' },
                    { dir: 'Tây', star: 'Lục Sát', angle: 270, meaning: 'Mất mát của cải, tình duyên lận đận, kiện tụng.' },
                    { dir: 'Tây Bắc', star: 'Họa Hại', angle: 315, meaning: 'Gặp sự cố không mong muốn, mưu sự khó thành.' }
                ]
            },
            6: {
                name: 'Càn (Kim)',
                group: 'Tây Tứ Mệnh',
                good: [
                    { dir: 'Tây', star: 'Sinh Khí', angle: 270, meaning: 'Đón tài lộc dồi dào, thăng tiến sự nghiệp, gia môn hưng vượng.' },
                    { dir: 'Đông Bắc', star: 'Thiên Y', angle: 45, meaning: 'Được trời che chở, sức khỏe khang kiện, tiêu trừ bệnh tật.' },
                    { dir: 'Tây Nam', star: 'Diên Niên', angle: 225, meaning: 'Quan hệ gia đình và đối tác bền vững tốt đẹp.' },
                    { dir: 'Tây Bắc', star: 'Phục Vị', angle: 315, meaning: 'Tăng cường ý chí, bình an may mắn thuận buồm xuôi gió.' }
                ],
                bad: [
                    { dir: 'Nam', star: 'Tuyệt Mệnh', angle: 180, meaning: 'Hao tài phá sản, họa vô đơn chí cần tránh.' },
                    { dir: 'Đông', star: 'Ngũ Quỷ', angle: 90, meaning: 'Bất hòa xích mích, hao tốn tiền của, kẻ xấu gièm pha.' },
                    { dir: 'Bắc', star: 'Lục Sát', angle: 0, meaning: 'Tình duyên trắc trở, thị phi kiện tụng phiền toái.' },
                    { dir: 'Đông Nam', star: 'Họa Hại', angle: 135, meaning: 'Làm ăn thất bại, tai ương rủi ro ngoài ý muốn.' }
                ]
            },
            7: {
                name: 'Đoài (Kim)',
                group: 'Tây Tứ Mệnh',
                good: [
                    { dir: 'Tây Bắc', star: 'Sinh Khí', angle: 315, meaning: 'Thu hút tài lộc công danh, gia chủ đại phú đại quý.' },
                    { dir: 'Tây Nam', star: 'Thiên Y', angle: 225, meaning: 'Thân tâm an lạc, trường thọ khỏe mạnh, quý nhân phù trợ.' },
                    { dir: 'Đông Bắc', star: 'Diên Niên', angle: 45, meaning: 'Vợ chồng hòa hợp, con cái hiếu thuận vinh hiển.' },
                    { dir: 'Tây', star: 'Phục Vị', angle: 270, meaning: 'Gia đạo yên vui, tâm trí minh mẫn, may mắn trường tồn.' }
                ],
                bad: [
                    { dir: 'Đông', star: 'Tuyệt Mệnh', angle: 90, meaning: 'Đại kỵ hướng cửa, hao tổn đinh tài nặng nề.' },
                    { dir: 'Nam', star: 'Ngũ Quỷ', angle: 180, meaning: 'Hao tiền tốn của, thị phi xích mích kiện cáo.' },
                    { dir: 'Đông Nam', star: 'Lục Sát', angle: 135, meaning: 'Sự nghiệp lận đận, tinh thần bất an lo âu.' },
                    { dir: 'Bắc', star: 'Họa Hại', angle: 0, meaning: 'Trở ngại liên miên, mưu sự khó thành công.' }
                ]
            },
            8: {
                name: 'Cấn (Thổ)',
                group: 'Tây Tứ Mệnh',
                good: [
                    { dir: 'Tây Nam', star: 'Sinh Khí', angle: 225, meaning: 'Vượng khí ngút trời, tài lộc hanh thông, công thành danh toại.' },
                    { dir: 'Tây Bắc', star: 'Thiên Y', angle: 315, meaning: 'Khỏe mạnh sống lâu, tâm tính an nhiên, đón nhận phúc ấm.' },
                    { dir: 'Tây', star: 'Diên Niên', angle: 270, meaning: 'Gia đình gắn kết trên dưới thuận hòa, kinh doanh đắc lợi.' },
                    { dir: 'Đông Bắc', star: 'Phục Vị', angle: 45, meaning: 'Bình an may mắn, thi cử học hành đỗ đạt.' }
                ],
                bad: [
                    { dir: 'Đông Nam', star: 'Tuyệt Mệnh', angle: 135, meaning: 'Đại hung hiểm họa, hao tổn sinh mạng và tài sản.' },
                    { dir: 'Bắc', star: 'Ngũ Quỷ', angle: 0, meaning: 'Dễ vướng hỏa hoạn, thị phi kiện tụng tiêu tán của.' },
                    { dir: 'Đông', star: 'Lục Sát', angle: 90, meaning: 'Gia đạo xào xáo, thất thoát tiền tài, tai nạn.' },
                    { dir: 'Nam', star: 'Họa Hại', angle: 180, meaning: 'Thất bại trắc trở trong cuộc sống và công việc.' }
                ]
            },
            9: {
                name: 'Ly (Hỏa)',
                group: 'Đông Tứ Mệnh',
                good: [
                    { dir: 'Đông', star: 'Sinh Khí', angle: 90, meaning: 'Phát tài phát lộc, danh tiếng lẫy lừng, quan lộ thăng tiến.' },
                    { dir: 'Đông Nam', star: 'Thiên Y', angle: 135, meaning: 'Trường thọ bình an, sức khỏe dẻo dai, quý nhân bảo hộ.' },
                    { dir: 'Bắc', star: 'Diên Niên', angle: 0, meaning: 'Hòa khí sinh tài, gia đình hòa thuận, bạn bè quý mến.' },
                    { dir: 'Nam', star: 'Phục Vị', angle: 180, meaning: 'Tinh thần minh mẫn, may mắn ngập tràn, vạn sự hanh thông.' }
                ],
                bad: [
                    { dir: 'Tây Bắc', star: 'Tuyệt Mệnh', angle: 315, meaning: 'Hao tài phá sản, họa sát thân, tuyệt đối không mở cửa hướng này.' },
                    { dir: 'Tây', star: 'Ngũ Quỷ', angle: 270, meaning: 'Mất mát của cải, tai bay vạ gió, khẩu thiệt thị phi.' },
                    { dir: 'Tây Nam', star: 'Lục Sát', angle: 225, meaning: 'Tình cảm chia rẽ, thù hận, công việc bế tắc.' },
                    { dir: 'Đông Bắc', star: 'Họa Hại', angle: 45, meaning: 'Gặp nhiều thất bại, không may mắn trong dự định.' }
                ]
            }
        };

        const currentKua = KUA_DATA[quaiSo] || KUA_DATA[1];

        // Lưu thông số để dùng cho Consultation Bridge
        const goodDirsArr = currentKua.good.map(g => `${g.dir} (${g.star})`);
        this._lastBatTrachData = {
            year,
            gender,
            canChi,
            menh: menhName,
            cungPhi: currentKua.name,
            groupName: currentKua.group,
            goodDirsStr: goodDirsArr.join(', ')
        };

        // 4. Cập nhật Banner Tóm Tắt
        const kuaBadge = document.getElementById('battrach-kua-badge');
        const groupBadge = document.getElementById('battrach-group-badge');
        const titleEl = document.getElementById('battrach-zodiac-title');
        const compatText = document.getElementById('battrach-compat-text');

        if (kuaBadge) kuaBadge.textContent = `Cung ${currentKua.name}`;
        if (groupBadge) groupBadge.textContent = currentKua.group;
        if (titleEl) titleEl.textContent = `Gia chủ sinh năm ${year}: ${canChi} (${menhName})`;
        if (compatText) {
            const compats = currentKua.good.map(g => g.dir).join(', ');
            compatText.textContent = `Các hướng vượng tài lộc hợp mệnh: ${compats}.`;
        }

        // 5. Vẽ La Bàn Bát Trạch SVG Trực Quan
        this._renderBatTrachCompassSVG(currentKua);

        // 6. Hiển thị danh sách 4 Hướng Tốt & 4 Hướng Xấu
        const goodListEl = document.getElementById('battrach-good-list');
        const badListEl = document.getElementById('battrach-bad-list');

        if (goodListEl) {
            goodListEl.innerHTML = currentKua.good.map(item => `
                <div class="dir-card card-good">
                    <div class="dir-card-header">
                        <span class="dir-star-name">${item.star}</span>
                        <span class="dir-card-heading">Hướng ${item.dir}</span>
                    </div>
                    <p class="dir-meaning">${item.meaning}</p>
                </div>
            `).join('');
        }

        if (badListEl) {
            badListEl.innerHTML = currentKua.bad.map(item => `
                <div class="dir-card card-bad">
                    <div class="dir-card-header">
                        <span class="dir-star-name">${item.star}</span>
                        <span class="dir-card-heading">Hướng ${item.dir}</span>
                    </div>
                    <p class="dir-meaning">${item.meaning}</p>
                </div>
            `).join('');
        }

        // 7. Cập nhật Nguyên Tắc Bố Trí Mặt Bằng Công Năng
        const sinhKhi = currentKua.good.find(g => g.star === 'Sinh Khí') || currentKua.good[0];
        const thienY = currentKua.good.find(g => g.star === 'Thiên Y') || currentKua.good[1];
        const dienNien = currentKua.good.find(g => g.star === 'Diên Niên') || currentKua.good[2];
        const phucVi = currentKua.good.find(g => g.star === 'Phục Vị') || currentKua.good[3];
        const tuyetMenh = currentKua.bad.find(b => b.star === 'Tuyệt Mệnh') || currentKua.bad[0];

        const ruleDoor = document.getElementById('rule-door-text');
        const ruleAltar = document.getElementById('rule-altar-text');
        const ruleKitchen = document.getElementById('rule-kitchen-text');
        const ruleBed = document.getElementById('rule-bed-text');

        if (ruleDoor) ruleDoor.textContent = `Nên mở về hướng ${sinhKhi.dir} (${sinhKhi.star}) để đón tài khí hoặc ${thienY.dir} (${thienY.star}) đón sinh lực.`;
        if (ruleAltar) ruleAltar.textContent = `Tọa cát hướng cát: Tọa tại cung ${dienNien.dir}, mặt ban thờ nhìn về hướng ${sinhKhi.dir} hoặc ${thienY.dir}.`;
        if (ruleKitchen) ruleKitchen.textContent = `Tọa hung hướng cát: Đặt bếp tại cung xấu ${tuyetMenh.dir} (${tuyetMenh.star}) để thiêu đốt hung khí, cửa lò/núm bếp xoay về hướng ${sinhKhi.dir}.`;
        if (ruleBed) ruleBed.textContent = `Đầu giường nên gối về hướng ${thienY.dir} (${thienY.star}) hoặc ${phucVi.dir} (${phucVi.star}) để có giấc ngủ sâu và bình an.`;
    }

    /**
     * Vẽ La Bàn Bát Trạch SVG Vector
     */
    _renderBatTrachCompassSVG(currentKua) {
        const stage = document.getElementById('battrach-compass-stage');
        if (!stage) return;

        // Vẽ vòng tròn la bàn bán kính R = 150 tại tâm (160, 160)
        const cx = 160;
        const cy = 160;
        const rOuter = 145;
        const rInner = 80;

        // 8 Hướng chính và góc quay (Bắc = 0/360, Đông = 90, Nam = 180, Tây = 270)
        const DIRECTIONS = [
            { name: 'Bắc', angle: 0 },
            { name: 'Đông Bắc', angle: 45 },
            { name: 'Đông', angle: 90 },
            { name: 'Đông Nam', angle: 135 },
            { name: 'Nam', angle: 180 },
            { name: 'Tây Nam', angle: 225 },
            { name: 'Tây', angle: 270 },
            { name: 'Tây Bắc', angle: 315 }
        ];

        let sectorsSvg = '';
        DIRECTIONS.forEach(d => {
            // Kiểm tra hướng này tốt hay xấu đối với cung hiện tại
            const goodMatch = currentKua.good.find(g => g.dir === d.name);
            const isGood = !!goodMatch;
            const starName = isGood ? goodMatch.star : (currentKua.bad.find(b => b.dir === d.name)?.star || '');

            const startAngle = (d.angle - 22.5 - 90) * (Math.PI / 180);
            const endAngle = (d.angle + 22.5 - 90) * (Math.PI / 180);

            const x1 = cx + rOuter * Math.cos(startAngle);
            const y1 = cy + rOuter * Math.sin(startAngle);
            const x2 = cx + rOuter * Math.cos(endAngle);
            const y2 = cy + rOuter * Math.sin(endAngle);

            const x3 = cx + rInner * Math.cos(endAngle);
            const y3 = cy + rInner * Math.sin(endAngle);
            const x4 = cx + rInner * Math.cos(startAngle);
            const y4 = cy + rInner * Math.sin(startAngle);

            const fill = isGood ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
            const stroke = isGood ? '#10b981' : '#ef4444';

            // Tọa độ đặt chữ text ở giữa cung
            const midAngle = (d.angle - 90) * (Math.PI / 180);
            const textR1 = 120;
            const textR2 = 98;
            const tx1 = cx + textR1 * Math.cos(midAngle);
            const ty1 = cy + textR1 * Math.sin(midAngle);
            const tx2 = cx + textR2 * Math.cos(midAngle);
            const ty2 = cy + textR2 * Math.sin(midAngle);

            sectorsSvg += `
                <path d="M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z"
                      fill="${fill}" stroke="${stroke}" stroke-width="1.2" />
                <text x="${tx1}" y="${ty1}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="11" font-weight="700">${d.name}</text>
                <text x="${tx2}" y="${ty2}" text-anchor="middle" dominant-baseline="central" fill="${isGood ? '#6ee7b7' : '#fca5a5'}" font-size="9" font-weight="750">${starName}</text>
            `;
        });

        stage.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 320 320" style="display: block; margin: auto;">
                <!-- Vòng tròn nền -->
                <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="#0b0d14" stroke="rgba(234, 179, 8, 0.4)" stroke-width="2" />
                
                <!-- 8 Cung quạt Bát Trạch -->
                ${sectorsSvg}

                <!-- Vòng tròn tâm âm dương Thái Cực -->
                <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#0f172a" stroke="#eab308" stroke-width="2" />
                
                <!-- Ký hiệu Thái cực (Yin-Yang) ở trung tâm -->
                <path d="M ${cx} ${cy - 45} A 45 45 0 0 1 ${cx} ${cy + 45} A 22.5 22.5 0 0 1 ${cx} ${cy} A 22.5 22.5 0 0 0 ${cx} ${cy - 45} Z" fill="#ffffff" />
                <path d="M ${cx} ${cy - 45} A 45 45 0 0 0 ${cx} ${cy + 45} A 22.5 22.5 0 0 1 ${cx} ${cy} A 22.5 22.5 0 0 0 ${cx} ${cy - 45} Z" fill="#000000" />
                <circle cx="${cx}" cy="${cy - 22.5}" r="6" fill="#000000" />
                <circle cx="${cx}" cy="${cy + 22.5}" r="6" fill="#ffffff" />

                <!-- Chữ cung chính giữa -->
                <circle cx="${cx}" cy="${cy}" r="16" fill="rgba(234, 179, 8, 0.95)" />
                <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#000000" font-size="10" font-weight="900">${currentKua.name.split(' ')[0]}</text>
            </svg>
        `;
    }

    /**
     * Cập nhật thông tin gợi ý phong thủy trong Modal Chi Tiết Mẫu Nhà
     */
    updateDetailFengShui(item) {
        if (!item) return;
        const doorEl = document.getElementById('detail-fs-door');
        const altarEl = document.getElementById('detail-fs-altar');

        if (doorEl) {
            // Gợi ý cửa theo quy mô nhà
            if (item.type === 'biet-thu') {
                doorEl.textContent = '1330 × 2120 mm (Tài Vượng - Quý Nhân)';
            } else if (item.type === 'nha-cap-4') {
                doorEl.textContent = '2550 × 2620 mm (Phú Quý - Phúc Tinh)';
            } else {
                doorEl.textContent = '810 × 2120 mm (Tiến Bảo - Tài Chí)';
            }
        }

        if (altarEl) {
            altarEl.textContent = '1270 × 610 mm (Tiến Bảo - Hoạch Tài)';
        }
    }

    /**
     * =========================================================================
     * FEATURE 4: CÔNG CỤ SO SÁNH MẪU NHÀ ĐỐI ĐẦU (SIDE-BY-SIDE COMPARE ENGINE)
     * Khay so sánh nổi (Dock) & Bảng ma trận đối chuẩn đa tiêu chí 2-3 cột
     * =========================================================================
     */
    initCompareEngine() {
        this.compareList = [];
        try {
            const saved = localStorage.getItem('dreamhouse_compare_list');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.compareList = parsed.slice(0, 3);
                }
            }
        } catch (e) {
            this.compareList = [];
        }

        // 1. Lắng nghe các nút trong Khay So Sánh Nổi (Dock)
        const dockCompareBtn = document.getElementById('btn-dock-compare');
        const dockClearBtn = document.getElementById('btn-dock-clear');
        const closeCompareBtn = document.getElementById('close-compare-modal');
        const compareModal = document.getElementById('compare-modal');
        const diffToggle = document.getElementById('compare-diff-toggle');

        if (dockCompareBtn) {
            dockCompareBtn.addEventListener('click', () => this.openCompareModal());
        }

        if (dockClearBtn) {
            dockClearBtn.addEventListener('click', () => {
                this.compareList = [];
                this._saveCompareList();
                this.updateCompareDock();
                this.updateDetailCompareButton();
                this.renderGallery();
                if (window.toast) {
                    window.toast.info(window.i18n.getLang() === 'vi' ? 'Đã xóa tất cả mẫu khỏi so sánh' : 'Cleared all compared designs');
                }
            });
        }

        if (closeCompareBtn) {
            closeCompareBtn.addEventListener('click', () => this.closeCompareModal());
        }

        if (compareModal) {
            compareModal.addEventListener('click', (e) => {
                if (e.target === compareModal) this.closeCompareModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && compareModal && !compareModal.classList.contains('hidden')) {
                this.closeCompareModal();
            }
        });

        // 2. Lắng nghe công tắc "Chỉ hiện điểm khác biệt"
        if (diffToggle) {
            diffToggle.addEventListener('change', () => {
                const isOnlyDiff = diffToggle.checked;
                const rows = document.querySelectorAll('.compare-data-row');
                rows.forEach(row => {
                    if (isOnlyDiff) {
                        row.classList.toggle('diff-hidden', !row.classList.contains('is-diff'));
                    } else {
                        row.classList.remove('diff-hidden');
                    }
                });
            });
        }

        // Cập nhật khay so sánh ban đầu
        this.updateCompareDock();
    }

    _saveCompareList() {
        try {
            localStorage.setItem('dreamhouse_compare_list', JSON.stringify(this.compareList));
        } catch (e) {}
    }

    /**
     * Bật/Tắt mẫu nhà trong danh sách so sánh
     */
    toggleCompareItem(templateId) {
        if (!templateId) return;
        const index = this.compareList.indexOf(templateId);
        const lang = window.i18n.getLang();

        if (index > -1) {
            // Đã có -> Xóa khỏi danh sách
            this.compareList.splice(index, 1);
            if (window.toast) {
                window.toast.info(lang === 'vi' ? 'Đã bỏ mẫu khỏi so sánh' : 'Removed from comparison');
            }
        } else {
            // Chưa có -> Kiểm tra giới hạn 3 mẫu
            if (this.compareList.length >= 3) {
                if (window.toast) {
                    window.toast.warning(window.i18n.t('compare_limit_reached'));
                }
                return;
            }
            this.compareList.push(templateId);
            if (window.toast) {
                window.toast.success(lang === 'vi' ? `Đã thêm vào so sánh (${this.compareList.length}/3)` : `Added to comparison (${this.compareList.length}/3)`);
            }
        }

        this._saveCompareList();
        this.updateCompareDock();
        this.updateDetailCompareButton();
        this.renderGallery();
    }

    /**
     * Cập nhật giao diện Khay So Sánh Nổi (Dock)
     */
    updateCompareDock() {
        const dock = document.getElementById('compare-floating-dock');
        const countBadge = document.getElementById('compare-dock-count');
        const slotsWrap = document.getElementById('compare-dock-slots');
        const compareBtn = document.getElementById('btn-dock-compare');
        const compareBtnText = document.getElementById('btn-dock-compare-text');

        if (!dock) return;

        const count = this.compareList.length;

        if (count === 0) {
            dock.classList.add('hidden');
            if (compareBtn) compareBtn.disabled = true;
            return;
        }

        dock.classList.remove('hidden');

        if (countBadge) countBadge.textContent = `${count}/3`;

        if (compareBtn) {
            compareBtn.disabled = count < 2;
        }

        if (compareBtnText) {
            compareBtnText.textContent = `${window.i18n.t('compare_btn_action')} (${count})`;
        }

        // Render các slot nhỏ
        if (slotsWrap) {
            const lang = window.i18n.getLang();
            slotsWrap.innerHTML = this.compareList.map(id => {
                const item = this.templates.find(t => t.id === id);
                if (!item) return '';
                const name = this.getLocalizedTemplateName(item, lang);
                const thumb = item.photo_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80';
                return `
                    <div class="dock-slot-item">
                        <img src="${thumb}" alt="${name}" class="dock-slot-thumb" />
                        <span class="dock-slot-name" title="${name}">${name}</span>
                        <button type="button" class="dock-slot-remove" data-remove-compare="${id}" title="Xóa mẫu này" aria-label="Xóa mẫu này">✕</button>
                    </div>
                `;
            }).join('');

            // Gắn sự kiện xóa từng slot
            slotsWrap.querySelectorAll('[data-remove-compare]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const removeId = btn.getAttribute('data-remove-compare');
                    this.toggleCompareItem(removeId);
                });
            });
        }
    }

    /**
     * Mở Modal So Sánh Đối Đầu
     */
    openCompareModal() {
        if (this.compareList.length < 2) {
            if (window.toast) {
                window.toast.warning(window.i18n.t('compare_need_two'));
            }
            return;
        }

        const modal = document.getElementById('compare-modal');
        if (!modal) return;

        this.renderCompareTable();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Đóng Modal So Sánh Đối Đầu
     */
    closeCompareModal() {
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    /**
     * Render Bảng Ma Trận So Sánh Đối Đầu 2 - 3 Cột
     */
    renderCompareTable() {
        const container = document.getElementById('compare-table-container');
        if (!container) return;

        const lang = window.i18n.getLang();
        const items = this.compareList.map(id => this.templates.find(t => t.id === id)).filter(Boolean);

        if (items.length < 2) return;

        // Cấu hình các tiêu chí so sánh
        const SECTIONS = [
            {
                title: window.i18n.t('compare_sec_general'),
                rows: [
                    {
                        label: window.i18n.t('compare_row_type'),
                        getValue: (t) => this.getLocalizedStyle(t, lang)
                    },
                    {
                        label: window.i18n.t('compare_row_dims'),
                        getValue: (t) => `${t.width_m || 5}m × ${t.depth_m || 15}m`
                    },
                    {
                        label: window.i18n.t('compare_row_land_area'),
                        getValue: (t) => `${(t.width_m || 5) * (t.depth_m || 15)} m²`
                    },
                    {
                        label: window.i18n.t('compare_row_gfa'),
                        getValue: (t) => `${t.gfa_m2 || 120} m²`,
                        highlight: true
                    }
                ]
            },
            {
                title: window.i18n.t('compare_sec_specs'),
                rows: [
                    {
                        label: window.i18n.t('compare_row_floors'),
                        getValue: (t) => `${t.floors || 1} ${lang === 'vi' ? 'tầng' : 'floors'}`
                    },
                    {
                        label: window.i18n.t('compare_row_roof'),
                        getValue: (t) => {
                            if (t.type === 'nha-cap-4') return lang === 'vi' ? 'Mái Thái / Mái Nhật' : 'Thai / Japanese Pitch Roof';
                            if (t.type === 'biet-thu') return lang === 'vi' ? 'Mái Mansard / Bê tông dán ngói' : 'Mansard / Tiled Concrete';
                            return lang === 'vi' ? 'Mái bằng BTCT lấy sáng' : 'Reinforced Concrete Flat Roof';
                        }
                    }
                ]
            },
            {
                title: window.i18n.t('compare_sec_rooms'),
                rows: [
                    {
                        label: window.i18n.t('compare_row_bedrooms'),
                        getValue: (t) => `${t.bedrooms || (t.type === 'biet-thu' ? 4 : (t.floors > 2 ? 3 : 2))} ${lang === 'vi' ? 'phòng ngủ' : 'beds'}`
                    },
                    {
                        label: window.i18n.t('compare_row_bathrooms'),
                        getValue: (t) => `${t.bathrooms || (t.floors || 2)} ${lang === 'vi' ? 'phòng WC' : 'baths'}`
                    },
                    {
                        label: window.i18n.t('compare_row_living'),
                        getValue: (t) => lang === 'vi' ? 'Phòng khách đón gió liên thông' : 'Open-plan Living Hall'
                    },
                    {
                        label: window.i18n.t('compare_row_kitchen'),
                        getValue: (t) => lang === 'vi' ? 'Bếp & Bàn ăn thông thoáng' : 'Kitchen & Dining Suite'
                    },
                    {
                        label: window.i18n.t('compare_row_balcony'),
                        getValue: (t) => t.has_balcony ? (lang === 'vi' ? '✓ Có ban công' : '✓ Yes') : (lang === 'vi' ? '✗ Không' : '✗ None')
                    },
                    {
                        label: window.i18n.t('compare_row_altar'),
                        getValue: (t) => t.floors > 1 ? (lang === 'vi' ? '✓ Phòng thờ gia tiên riêng' : '✓ Dedicated Sacred Room') : (lang === 'vi' ? 'Không gian thờ trang trọng' : 'Altar Space in Parlor')
                    },
                    {
                        label: window.i18n.t('compare_row_garage'),
                        getValue: (t) => t.type === 'biet-thu' ? (lang === 'vi' ? '✓ Gara 2 ô tô trong nhà' : '✓ 2-Car Garage') : (lang === 'vi' ? 'Sân trước để xe ô tô / xe máy' : 'Front Parking Yard')
                    },
                    {
                        label: window.i18n.t('compare_row_skylight'),
                        getValue: (t) => t.type === 'nha-pho' ? (lang === 'vi' ? '✓ Giếng trời sảnh thang' : '✓ Stairwell Airwell') : (lang === 'vi' ? 'Sân vườn thông gió tự nhiên' : 'Garden Natural Vent')
                    }
                ]
            },
            {
                title: window.i18n.t('compare_sec_cost'),
                rows: [
                    {
                        label: window.i18n.t('compare_row_price'),
                        getValue: (t) => window.i18n.formatCost(t.cost_estimate_vnd),
                        highlight: true
                    },
                    {
                        label: window.i18n.t('compare_row_unit_cost'),
                        getValue: (t) => {
                            const cost = t.cost_estimate_vnd || 1000000000;
                            const gfa = t.gfa_m2 || 100;
                            const unitM = (cost / gfa / 1000000).toFixed(1);
                            return `≈ ${unitM} ${lang === 'vi' ? 'triệu/m²' : 'M VND/m²'}`;
                        }
                    }
                ]
            },
            {
                title: window.i18n.t('compare_sec_fengshui'),
                rows: [
                    {
                        label: window.i18n.t('compare_row_direction'),
                        getValue: (t) => {
                            if (t.type === 'nha-pho') return lang === 'vi' ? 'Nam, Đông Nam, Bắc (Đón gió mát)' : 'South, SE, North (Cool Breeze)';
                            if (t.type === 'biet-thu') return lang === 'vi' ? 'Đông Nam, Đông, Tây Bắc' : 'South-East, East, NW';
                            return lang === 'vi' ? 'Nam, Đông Nam' : 'South, South-East';
                        }
                    },
                    {
                        label: window.i18n.t('compare_row_kua'),
                        getValue: (t) => {
                            if (t.type === 'biet-thu') return lang === 'vi' ? 'Tây Tứ Mệnh / Đông Tứ Mệnh' : 'West Kua / East Kua';
                            return lang === 'vi' ? 'Đông Tứ Mệnh (Khảm, Ly, Chấn, Tốn)' : 'East Kua (Kan, Li, Zhen, Xun)';
                        }
                    }
                ]
            }
        ];

        // 1. Dựng Hàng Header
        let tableHtml = `
            <table class="compare-grid-table">
                <thead>
                    <tr>
                        <th class="compare-head-cell metric-col-head">
                            <span class="presets-label" style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.05em; color: #94a3b8;">
                                ${lang === 'vi' ? 'TIÊU CHÍ SO SÁNH' : 'COMPARISON CRITERIA'}
                            </span>
                        </th>
                        ${items.map(t => {
                            const name = this.getLocalizedTemplateName(t, lang);
                            const thumb = t.photo_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80';
                            const styleBadge = this.getLocalizedStyle(t, lang);
                            const price = window.i18n.formatCost(t.cost_estimate_vnd);
                            return `
                                <th class="compare-head-cell">
                                    <div class="card-preview-box">
                                        <div class="compare-card-thumb-wrap">
                                            <img src="${thumb}" alt="${name}" class="compare-card-thumb" />
                                            <span class="compare-card-type-tag">${styleBadge}</span>
                                        </div>
                                        <h4 class="compare-card-title">${name}</h4>
                                        <div class="compare-card-price-badge">${price}</div>
                                    </div>
                                </th>
                            `;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        // 2. Dựng các dòng tiêu chí
        const isOnlyDiffActive = document.getElementById('compare-diff-toggle')?.checked || false;

        SECTIONS.forEach(sec => {
            tableHtml += `
                <tr class="compare-section-row">
                    <td colspan="${items.length + 1}">${sec.title}</td>
                </tr>
            `;

            sec.rows.forEach(r => {
                const values = items.map(t => r.getValue(t));
                // Kiểm tra xem hàng này các giá trị có khác nhau không
                const isDiff = values.some(v => v !== values[0]);
                const diffClass = isDiff ? 'is-diff' : '';
                const hiddenClass = (isOnlyDiffActive && !isDiff) ? 'diff-hidden' : '';

                tableHtml += `
                    <tr class="compare-data-row ${diffClass} ${hiddenClass}">
                        <td class="compare-label-cell">${r.label}</td>
                        ${values.map(val => `
                            <td class="compare-val-cell ${r.highlight ? 'val-highlight' : ''}">
                                ${val}
                            </td>
                        `).join('')}
                    </tr>
                `;
            });
        });

        // 3. Dựng hàng nút hành động (Actions)
        tableHtml += `
            <tr class="compare-action-row">
                <td class="compare-label-cell" style="vertical-align: middle;">
                    <strong>${lang === 'vi' ? 'Hành động' : 'Actions'}</strong>
                </td>
                ${items.map(t => {
                    const name = this.getLocalizedTemplateName(t, lang);
                    return `
                        <td class="compare-action-cell">
                            <div class="compare-action-group">
                                <button type="button" class="btn-compare-view" data-cmp-view="${t.id}">
                                    ${window.i18n.t('compare_btn_view_detail')}
                                </button>
                                <button type="button" class="btn-primary btn-compare-select" data-cmp-select="${t.id}" data-cmp-name="${name}">
                                    ${window.i18n.t('compare_btn_select_this')}
                                </button>
                            </div>
                        </td>
                    `;
                }).join('')}
            </tr>
        `;

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

        // Gắn sự kiện các nút hành động trong bảng
        container.querySelectorAll('[data-cmp-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-cmp-view');
                this.closeCompareModal();
                this.openDetailPanel(id);
            });
        });

        container.querySelectorAll('[data-cmp-select]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-cmp-select');
                const tName = btn.getAttribute('data-cmp-name');
                const tObj = items.find(it => it.id === id);
                this.closeCompareModal();
                
                // Cuộn xuống form liên hệ và điền nội dung
                const contactSec = document.getElementById('contact-section');
                if (contactSec) contactSec.scrollIntoView({ behavior: 'smooth', block: 'start' });

                const noteInput = document.getElementById('inquiry-notes');
                if (noteInput && tObj) {
                    const priceStr = window.i18n.formatCost(tObj.cost_estimate_vnd);
                    noteInput.value = `[CHỌN TỪ BẢNG SO SÁNH] Tôi quan tâm đến mẫu thiết kế: "${tName}" (Quy mô: ${tObj.width_m}×${tObj.depth_m}m, ${tObj.floors} tầng, dự toán tham khảo: ${priceStr}). Nhờ KTS Võ Quốc Việt tư vấn chi tiết phương án thi công.`;
                    noteInput.focus();
                }

                if (window.toast) {
                    window.toast.success(
                        lang === 'vi' 
                            ? `Đã chọn mẫu "${tName}"! Vui lòng để lại SĐT để KTS liên hệ.` 
                            : `Selected "${tName}"! Please enter your phone number.`
                    );
                }
            });
        });
    }

    /**
     * =========================================================================
     * FEATURE 5: XUẤT HỒ SƠ CONCEPT PDF BROCHURE (ARCHITECTURAL CONCEPT DOSSIER)
     * Xem trước hồ sơ A4, in ấn @media print & tải Concept Dossier 1-Click
     * =========================================================================
     */
    initBrochureExporter() {
        const modal = document.getElementById('brochure-modal');
        const closeBtn = document.getElementById('close-brochure-modal');
        const printBtn = document.getElementById('btn-print-brochure');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeBrochureModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeBrochureModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeBrochureModal();
            }
        });

        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }

    /**
     * Mở Modal Xem Trước & Xuất Hồ Sơ Concept PDF
     */
    openBrochureModal(template) {
        if (!template) {
            template = this.currentTemplate || (this.templates && this.templates[0]);
        }
        if (!template) return;

        const modal = document.getElementById('brochure-modal');
        const content = document.getElementById('brochure-printable-content');
        if (!modal || !content) return;

        const lang = window.i18n.getLang();
        const name = this.getLocalizedTemplateName(template, lang);
        const styleBadge = this.getLocalizedStyle(template, lang);
        const costStr = window.i18n.formatCost(template.cost_estimate_vnd);
        const dossierId = 'DH-2026-' + (template.id ? template.id.toString().slice(0, 6).toUpperCase() : '001');
        const issueDate = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Kích thước & Diện tích
        const width = template.width_m || 5;
        const depth = template.depth_m || 16;
        const landArea = width * depth;
        const gfa = template.gfa_m2 || 150;
        const floors = template.floors || 2;
        const photoUrl = template.photo_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80';

        // Kết cấu mái
        let roofName = lang === 'vi' ? 'Mái bằng BTCT lấy sáng đối lưu' : 'Reinforced Concrete Flat Roof';
        if (template.type === 'nha-cap-4') {
            roofName = lang === 'vi' ? 'Mái Thái / Mái Nhật kèo thép lợp ngói' : 'Thai / Japanese Tiled Pitch Roof';
        } else if (template.type === 'biet-thu') {
            roofName = lang === 'vi' ? 'Mái Mansard tân cổ điển bê tông dán ngói' : 'Mansard Tiled Concrete Roof';
        }

        // Bóc tách mặt bằng tầng 1 CAD Vector SVG
        const floorsData = this.generateFloorplanData(template);
        const floor1 = floorsData[0] || { floorNum: 1, title: 'Mặt bằng Tầng 1 (Trệt)', usableArea: gfa, rooms: [] };
        const blueprintSvg = this.renderFloorplanSVG(floor1, template, false);

        // Khái toán 4 cấu phần
        const totalCost = template.cost_estimate_vnd || 1500000000;
        const costRaw = totalCost * 0.52;
        const costFinish = totalCost * 0.33;
        const costME = totalCost * 0.10;
        const costMgmt = totalCost * 0.05;

        // Dựng HTML cho toàn bộ hồ sơ A4
        content.innerHTML = `
            <!-- HEADER HỒ SƠ ĐỒ ÁN (DOSSIER COVER HEADER) -->
            <header class="dossier-top-header">
                <div>
                    <h1 class="dossier-brand-title">DREAM HOUSE</h1>
                    <div class="dossier-brand-sub">Architectural Design & Construction Portfolio</div>
                </div>
                <div class="dossier-meta-grid">
                    <div class="dossier-meta-item">
                        <span>${window.i18n.t('brochure_code_label')}</span>
                        <strong>${dossierId}</strong>
                    </div>
                    <div class="dossier-meta-item">
                        <span>${window.i18n.t('brochure_date_label')}</span>
                        <strong>${issueDate}</strong>
                    </div>
                    <div class="dossier-meta-item">
                        <span>${window.i18n.t('brochure_architect_label')}</span>
                        <strong>KTS. Võ Quốc Việt</strong>
                    </div>
                    <div class="dossier-meta-item">
                        <span>Hotline/Zalo:</span>
                        <strong>0367020403</strong>
                    </div>
                </div>
            </header>

            <!-- PHẦN 1: PHỐI CẢNH & THÔNG SỐ ĐẶC TẢ KIẾN TRÚC -->
            <section class="dossier-section">
                <h3 class="dossier-section-title">${window.i18n.t('brochure_page1_title')}</h3>
                <div class="dossier-hero-grid">
                    <div class="dossier-hero-photo-wrap">
                        <img src="${photoUrl}" alt="${name}" class="dossier-hero-photo" crossorigin="anonymous" />
                        <span class="dossier-hero-badge">${styleBadge}</span>
                    </div>
                    <div class="dossier-specs-box">
                        <div>
                            <h2 class="dossier-house-name">${name}</h2>
                            <table class="dossier-specs-table">
                                <tr>
                                    <td>${window.i18n.t('compare_row_dims')}:</td>
                                    <td><strong>${width}m × ${depth}m</strong></td>
                                </tr>
                                <tr>
                                    <td>${window.i18n.t('compare_row_land_area')}:</td>
                                    <td><strong>${landArea} m²</strong></td>
                                </tr>
                                <tr>
                                    <td>${window.i18n.t('compare_row_gfa')}:</td>
                                    <td><strong>${gfa} m² (Quy đổi)</strong></td>
                                </tr>
                                <tr>
                                    <td>${window.i18n.t('compare_row_floors')}:</td>
                                    <td><strong>${floors} tầng cao</strong></td>
                                </tr>
                                <tr>
                                    <td>${window.i18n.t('compare_row_roof')}:</td>
                                    <td><strong>${roofName}</strong></td>
                                </tr>
                                <tr>
                                    <td>${window.i18n.t('spec_rooms')}:</td>
                                    <td><strong>${template.bedrooms || (floors > 2 ? 3 : 2)} PN, ${floors} WC, Khách, Bếp</strong></td>
                                </tr>
                            </table>
                        </div>
                        <div class="dossier-price-callout">
                            <span class="dossier-price-label">${lang === 'vi' ? 'Dự toán tham khảo:' : 'Estimated Cost:'}</span>
                            <span class="dossier-price-val">${costStr}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PHẦN 2: BẢN VẼ SƠ ĐỒ MẶT BẰNG CAD VECTOR & CÔNG NĂNG -->
            <section class="dossier-section">
                <h3 class="dossier-section-title">${window.i18n.t('brochure_page2_title')}</h3>
                <div class="dossier-blueprint-preview-wrap">
                    <div class="dossier-blueprint-stage">
                        ${blueprintSvg}
                    </div>
                </div>

                <!-- Bảng diện tích các phòng -->
                <table class="dossier-rooms-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Không Gian / Phòng</th>
                            <th>Công Năng Bố Trí</th>
                            <th style="text-align: right;">Diện Tích (m²)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${floor1.rooms.map((rm, idx) => `
                            <tr>
                                <td style="width: 40px; color: #64748b;">0${idx + 1}</td>
                                <td><strong>${rm.name}</strong></td>
                                <td style="color: #475569;">${rm.desc || 'Thiết kế thông thoáng tiêu chuẩn'}</td>
                                <td style="text-align: right; font-weight: 750; color: #b45309;">${rm.area} m²</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </section>

            <!-- PHẦN 3: KHÁI TOÁN KINH PHÍ THI CÔNG & PHONG THỦY KIẾN TRÚC -->
            <section class="dossier-section">
                <h3 class="dossier-section-title">${window.i18n.t('brochure_page3_title')}</h3>
                <div class="dossier-budget-grid">
                    <!-- Bóc tách chi phí -->
                    <div class="dossier-card-tile">
                        <h4 class="dossier-card-tile-title">${lang === 'vi' ? 'Cấu Phần Chi Phí Xây Dựng (Q1/2026):' : 'Cost Breakdown Structure:'}</h4>
                        <div class="dossier-tile-row">
                            <span>Phần Thô & Kết Cấu BTCT (52%):</span>
                            <strong>${window.i18n.formatCost(costRaw)}</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Hoàn Thiện Kiến Trúc (33%):</span>
                            <strong>${window.i18n.formatCost(costFinish)}</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Hệ Thống Điện Nước MEP (10%):</span>
                            <strong>${window.i18n.formatCost(costME)}</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Quản Lý & Dự Phòng (5%):</span>
                            <strong>${window.i18n.formatCost(costMgmt)}</strong>
                        </div>
                        <div class="dossier-tile-row" style="margin-top: 6px; padding-top: 6px; border-top: 1.5px solid #0f172a; border-bottom: none;">
                            <strong style="color: #0f172a;">${lang === 'vi' ? 'Tổng Dự Toán Trọn Gói:' : 'Total Turnkey:'}</strong>
                            <strong style="color: #b45309; font-size: 0.95rem;">${costStr}</strong>
                        </div>
                    </div>

                    <!-- Tiêu chuẩn Lỗ Ban & Phong Thủy -->
                    <div class="dossier-card-tile">
                        <h4 class="dossier-card-tile-title">${lang === 'vi' ? 'Quy Chuẩn Thước Lỗ Ban & Phong Thủy:' : 'Auspicious Dimensions & Feng Shui:'}</h4>
                        <div class="dossier-tile-row">
                            <span>Cửa chính (Lỗ Ban 52.2cm):</span>
                            <strong>810 × 2120 mm (Cung Quý Nhân)</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Bàn thờ (Lỗ Ban 38.8cm):</span>
                            <strong>1270 × 610 mm (Cung Tiến Bảo)</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Chiều cao thông thủy trệt:</span>
                            <strong>3600 mm (Cung Thuận Khoa)</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Hướng nhà đón gió mát:</span>
                            <strong>Nam, Đông Nam, Bắc</strong>
                        </div>
                        <div class="dossier-tile-row">
                            <span>Nhóm Bát Trạch hợp:</span>
                            <strong>Đông Tứ Mệnh / Tây Tứ Mệnh</strong>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CHÂN TRANG XÁC THỰC PHÁP NHÂN & DẤU PHÊ DUYỆT (SIGNATURE & SEAL) -->
            <footer class="dossier-signature-block">
                <div class="dossier-seal-wrap">
                    <div class="dossier-red-stamp">
                        <div class="stamp-inner">
                            <span class="stamp-org">DREAM HOUSE</span>
                            <span class="stamp-star">★ ★ ★</span>
                            <span class="stamp-status">ĐÃ PHÊ DUYỆT</span>
                        </div>
                    </div>
                    <div class="dossier-verify-text">
                        <strong>${window.i18n.t('brochure_seal_text')}</strong><br/>
                        Hotline/Zalo: 0367020403 • Email: voviet4323@gmail.com<br/>
                        Website: dreamhouse.vn • Facebook: fb.com/quocviet43
                    </div>
                </div>

                <div class="dossier-signature-col">
                    <div class="dossier-sign-role">${window.i18n.t('brochure_architect_label')}</div>
                    <div class="dossier-sign-name">${window.i18n.t('brochure_signature_title')}</div>
                </div>
            </footer>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Đóng Modal Xem Trước Hồ Sơ
     */
    closeBrochureModal() {
        const modal = document.getElementById('brochure-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    /**
     * Khởi tạo Sân khấu Kiến trúc Nổi Hero Showcase v8.8
     */
    initHeroShowcase() {
        const stage = document.getElementById('hero-showcase-stage');
        if (!stage) return;

        // Lựa chọn 3 đồ án kiến trúc đại diện xuất sắc nhất
        if (this.templates && this.templates.length > 0) {
            const bt02 = this.templates.find(t => t.slug === 'biet-thu-tan-co-dien-bt02' || (t.slug && t.slug.includes('bt02')));
            const bt01 = this.templates.find(t => t.slug === 'biet-thu-vuon-bt01' || (t.slug && t.slug.includes('bt01')));
            const np01 = this.templates.find(t => t.slug === 'nha-pho-hien-dai-np01' || (t.slug && t.slug.includes('np01')));

            this.featuredShowcaseTemplates = [
                bt02 || this.templates[0],
                bt01 || (this.templates[1] || this.templates[0]),
                np01 || (this.templates[2] || this.templates[0])
            ].filter(Boolean);
        }

        if (!this.featuredShowcaseTemplates || this.featuredShowcaseTemplates.length === 0) {
            return;
        }

        // Render mẫu đầu tiên
        this.updateHeroShowcase();

        // Gán sự kiện cho các chấm tròn điều hướng (dots)
        const dots = stage.querySelectorAll('.stage-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                const idx = parseInt(dot.getAttribute('data-index'), 10);
                if (!isNaN(idx) && idx !== this.heroShowcaseIndex) {
                    this.heroShowcaseIndex = idx;
                    this.updateHeroShowcase();
                    this.restartHeroShowcaseTimer();
                }
            });
        });

        // Nút xem chi tiết & 3D
        const exploreBtn = document.getElementById('hero-stage-explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentItem = this.featuredShowcaseTemplates[this.heroShowcaseIndex];
                if (currentItem) {
                    this.openDetailPanel(currentItem.id);
                }
            });
        }

        // Tag 3D tương tác ở góc ảnh
        const tag3D = document.getElementById('hero-stage-3d-tag');
        if (tag3D) {
            tag3D.addEventListener('click', (e) => {
                e.preventDefault();
                const currentItem = this.featuredShowcaseTemplates[this.heroShowcaseIndex];
                if (currentItem) {
                    this.openDetailPanel(currentItem.id);
                    setTimeout(() => {
                        const viewerBtn = document.querySelector('.visual-nav-btn[data-visual-tab="viewer"]');
                        if (viewerBtn) viewerBtn.click();
                    }, 220);
                }
            });
        }

        // Click trực tiếp vào khung ảnh
        const stageMedia = stage.querySelector('.hero-stage-media');
        if (stageMedia) {
            stageMedia.style.cursor = 'pointer';
            stageMedia.addEventListener('click', (e) => {
                if (e.target.closest('#hero-stage-3d-tag')) return;
                const currentItem = this.featuredShowcaseTemplates[this.heroShowcaseIndex];
                if (currentItem) {
                    this.openDetailPanel(currentItem.id);
                }
            });
        }

        // Tự động xoay chuyển đồ án sau mỗi 7 giây (tạm dừng khi hover chuột)
        this.startHeroShowcaseTimer();
        stage.addEventListener('mouseenter', () => this.stopHeroShowcaseTimer());
        stage.addEventListener('mouseleave', () => this.startHeroShowcaseTimer());
    }

    startHeroShowcaseTimer() {
        this.stopHeroShowcaseTimer();
        this.heroShowcaseTimer = setInterval(() => {
            if (!this.featuredShowcaseTemplates || this.featuredShowcaseTemplates.length <= 1) return;
            this.heroShowcaseIndex = (this.heroShowcaseIndex + 1) % this.featuredShowcaseTemplates.length;
            this.updateHeroShowcase();
        }, 7000);
    }

    stopHeroShowcaseTimer() {
        if (this.heroShowcaseTimer) {
            clearInterval(this.heroShowcaseTimer);
            this.heroShowcaseTimer = null;
        }
    }

    restartHeroShowcaseTimer() {
        this.stopHeroShowcaseTimer();
        this.startHeroShowcaseTimer();
    }

    /**
     * Cập nhật thông tin đồ án trên Sân khấu Hero Showcase
     */
    updateHeroShowcase(isLanguageChangeOnly = false) {
        if (!this.featuredShowcaseTemplates || this.featuredShowcaseTemplates.length === 0) return;
        const item = this.featuredShowcaseTemplates[this.heroShowcaseIndex];
        if (!item) return;

        const isVi = (window.i18n ? window.i18n.getLang() : 'vi') === 'vi';

        const stageImg = document.getElementById('hero-stage-img');
        const stageTypeText = document.getElementById('hero-stage-type-text');
        const stageTitle = document.getElementById('hero-stage-title');
        const stageDims = document.getElementById('hero-stage-dims');
        const stageFloors = document.getElementById('hero-stage-floors');
        const stageCost = document.getElementById('hero-stage-cost');

        if (stageImg && !isLanguageChangeOnly) {
            stageImg.style.opacity = '0.35';
            stageImg.style.transform = 'scale(1.05)';
            setTimeout(() => {
                stageImg.src = item.photo_path || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';
                stageImg.alt = isVi ? item.name_vi : (item.name_en || item.name_vi);
                stageImg.style.opacity = '1';
                stageImg.style.transform = 'scale(1)';
            }, 180);
        }

        if (stageTypeText) {
            stageTypeText.textContent = isVi ? (item.style_vi || item.type) : (item.style_en || item.style_vi || item.type);
        }

        if (stageTitle) {
            stageTitle.textContent = isVi ? item.name_vi : (item.name_en || item.name_vi);
        }

        if (stageDims) {
            stageDims.textContent = `${item.width_m}m × ${item.depth_m}m`;
        }

        if (stageFloors) {
            stageFloors.textContent = `${item.floors} ${isVi ? 'Tầng' : 'Floors'}`;
        }

        if (stageCost) {
            stageCost.textContent = window.i18n.formatCost(item.cost_estimate_vnd);
        }

        // Cập nhật trạng thái active của dots
        const dots = document.querySelectorAll('.hero-stage-pagination .stage-dot');
        dots.forEach((dot, idx) => {
            const isActive = idx === this.heroShowcaseIndex;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    /**
     * Khởi tạo hiệu ứng chữ động xoay chuyển (Dynamic Rotating Keyword)
     */
    initHeroRotatingWords() {
        const wordEl = document.getElementById('hero-rotating-word');
        if (!wordEl) return;

        const wordsVi = ['lý tưởng', 'thượng lưu', 'chuẩn phong thủy', 'đậm bản sắc', 'bền vững'];
        const wordsEn = ['of your dreams', 'of true luxury', 'in Feng Shui harmony', 'of unique identity', 'built to endure'];

        this.heroWordIndex = 0;

        if (this.heroWordTimer) {
            clearInterval(this.heroWordTimer);
        }

        const headlineEl = document.getElementById('hero-headline');
        let isPaused = false;
        if (headlineEl) {
            headlineEl.addEventListener('mouseenter', () => { isPaused = true; });
            headlineEl.addEventListener('mouseleave', () => { isPaused = false; });
        }

        this.heroWordTimer = setInterval(() => {
            if (isPaused) return;
            const isVi = (window.i18n ? window.i18n.getLang() : 'vi') === 'vi';
            const list = isVi ? wordsVi : wordsEn;

            this.heroWordIndex = (this.heroWordIndex + 1) % list.length;
            const nextWord = list[this.heroWordIndex];

            // Animation: Slide out upwards
            wordEl.classList.remove('slide-in', 'slide-in-prepare');
            wordEl.classList.add('slide-out');

            setTimeout(() => {
                wordEl.textContent = nextWord;
                wordEl.classList.remove('slide-out');
                wordEl.classList.add('slide-in-prepare');
                void wordEl.offsetWidth; // Force reflow
                wordEl.classList.remove('slide-in-prepare');
                wordEl.classList.add('slide-in');
            }, 300);
        }, 3200);
    }

    updateHeroRotatingWordLang() {
        const wordEl = document.getElementById('hero-rotating-word');
        if (!wordEl) return;
        const wordsVi = ['lý tưởng', 'thượng lưu', 'chuẩn phong thủy', 'đậm bản sắc', 'bền vững'];
        const wordsEn = ['of your dreams', 'of true luxury', 'in Feng Shui harmony', 'of unique identity', 'built to endure'];
        const isVi = (window.i18n ? window.i18n.getLang() : 'vi') === 'vi';
        const list = isVi ? wordsVi : wordsEn;
        wordEl.textContent = list[this.heroWordIndex % list.length];
    }

    /**
     * Khởi tạo hiệu ứng cuộn số mượt mà (Animated Rolling Counters)
     */
    initHeroCounterRoll() {
        const pEl = document.getElementById('hero-counter-projects');
        const cEl = document.getElementById('hero-counter-cad');
        const rEl = document.getElementById('hero-counter-rating');
        if (!pEl && !cEl && !rEl) return;

        const animateCounter = (el, target, isDecimal = false, duration = 1800) => {
            if (!el) return;
            const startTime = performance.now();
            const startVal = 0;

            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                // Easing out cubic: 1 - pow(1 - progress, 3)
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentVal = startVal + (target - startVal) * easeProgress;

                if (isDecimal) {
                    el.textContent = currentVal.toFixed(1);
                } else {
                    el.textContent = Math.round(currentVal);
                }

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = isDecimal ? target.toFixed(1) : target;
                }
            };

            requestAnimationFrame(step);
        };

        const runCounters = () => {
            if (this.heroCountersRun) return;
            this.heroCountersRun = true;
            if (pEl) animateCounter(pEl, 150, false, 1800);
            if (cEl) animateCounter(cEl, 100, false, 1800);
            if (rEl) animateCounter(rEl, 4.9, true, 1800);
        };

        const metricsSection = document.getElementById('hero-trust-metrics');
        if ('IntersectionObserver' in window && metricsSection) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    runCounters();
                    observer.disconnect();
                }
            }, { threshold: 0.2 });
            observer.observe(metricsSection);
        } else {
            setTimeout(runCounters, 400);
        }
    }
}

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.app = new DreamHouseApp();
    // Đồng bộ ngôn ngữ lần đầu
    window.i18n.updateDOM();
});

// Luôn đảm bảo khi F5 / Reload hoặc Back-Forward Cache thì hiển thị tại đầu mục
window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
});
window.addEventListener('pageshow', () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});
window.addEventListener('load', () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

