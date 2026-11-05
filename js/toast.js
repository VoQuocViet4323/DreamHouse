// js/toast.js
// Hệ thống Toast Notification cao cấp phong cách Animate-UI / Glassmorphism
// Thay thế hoàn toàn alert() mặc định của trình duyệt

(function() {
    'use strict';

    // 1. Tạo container cho Toast nếu chưa tồn tại
    function getOrCreateContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    // 2. Icon SVG vector cho từng loại thông báo
    const ICONS = {
        success: `<svg class="toast-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg class="toast-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg class="toast-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg class="toast-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    const DEFAULT_TITLES = {
        vi: {
            success: 'Thành công',
            error: 'Thông báo lỗi',
            warning: 'Lưu ý',
            info: 'Thông tin'
        },
        en: {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Notice'
        }
    };

    // 3. Hàm hiển thị Toast chính
    function showToast(message, type = 'info', duration = 4000, customTitle = '') {
        const container = getOrCreateContainer();
        const validTypes = ['success', 'error', 'warning', 'info'];
        const toastType = validTypes.includes(type) ? type : 'info';

        const isVi = (window.i18n && typeof window.i18n.getLang === 'function') 
            ? window.i18n.getLang() === 'vi' 
            : true;
        const title = customTitle || DEFAULT_TITLES[isVi ? 'vi' : 'en'][toastType];

        const toast = document.createElement('div');
        toast.className = `toast-card toast-${toastType}`;
        toast.setAttribute('role', 'alert');

        toast.innerHTML = `
            <div class="toast-icon-box">
                ${ICONS[toastType]}
            </div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-msg">${message}</div>
            </div>
            <button type="button" class="toast-close-btn" aria-label="Đóng thông báo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
        `;

        container.appendChild(toast);

        // Kích hoạt animation xuất hiện
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        let removeTimeout = null;

        function dismissToast() {
            if (removeTimeout) clearTimeout(removeTimeout);
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hiding');
            toast.addEventListener('transitionend', () => {
                if (toast.parentElement) toast.remove();
            }, { once: true });
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 350);
        }

        // Tự động đóng sau duration ms
        if (duration > 0) {
            removeTimeout = setTimeout(dismissToast, duration);
        }

        // Nút đóng
        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissToast();
            });
        }

        // Bấm vào toast để đóng nhanh
        toast.addEventListener('click', dismissToast);

        return toast;
    }

    // 4. Hàm phiên dịch thông điệp lỗi Supabase Auth sang tiếng Việt tự nhiên
    function translateAuthError(errMsg) {
        if (!errMsg) return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
        const lower = String(errMsg).toLowerCase();

        if (lower.includes('invalid login credentials')) {
            return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
        }
        if (lower.includes('email not confirmed')) {
            return 'Địa chỉ email này chưa được xác thực. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác Spam) để kích hoạt tài khoản.';
        }
        if (lower.includes('user already registered')) {
            return 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng tính năng Quên mật khẩu.';
        }
        if (lower.includes('password should be at least')) {
            return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
        }
        if (lower.includes('signup requires a valid password')) {
            return 'Vui lòng nhập mật khẩu hợp lệ cho tài khoản.';
        }
        if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('err_name_not_resolved')) {
            return 'Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra kết nối mạng của bạn.';
        }
        if (lower.includes('rate limit')) {
            return 'Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi ít phút trước khi thử lại.';
        }
        return errMsg;
    }

    // 5. Export ra window toàn cục
    window.showToast = showToast;
    window.translateAuthError = translateAuthError;
    window.toast = {
        success: (msg, dur, title) => showToast(msg, 'success', dur, title),
        error: (msg, dur, title) => showToast(msg, 'error', dur, title),
        warning: (msg, dur, title) => showToast(msg, 'warning', dur, title),
        info: (msg, dur, title) => showToast(msg, 'info', dur, title)
    };

    // 6. Ghi đè window.alert để triệt để loại bỏ popup mặc định của browser
    window.alert = function(msg) {
        window.toast.info(msg);
    };

    console.log('✅ Hệ thống Toast Notification (Animate-UI) đã sẵn sàng.');
})();
