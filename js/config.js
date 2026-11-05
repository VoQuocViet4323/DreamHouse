// js/config.js
// Cấu hình kết nối Supabase và Thông tin liên hệ
// THAY THẾ SUPABASE_URL VÀ SUPABASE_ANON_KEY BẰNG THÔNG TIN TỪ DỰ ÁN SUPABASE CỦA BẠN.
// Tuyệt đối KHÔNG đưa service_role key vào file này.

const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co', // Ví dụ: https://xyzcompany.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY_HERE'
};

const CONTACT_INFO = {
    phone: '0367020403',
    zalo: 'https://zalo.me/0367020403',
    email: 'voviet4323@gmail.com',
    facebook: 'https://www.facebook.com/quocviet43'
};

// Khởi tạo Supabase client nếu thư viện đã tải
let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_CONFIG.url.indexOf('YOUR_PROJECT_ID') === -1) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (e) {
        console.warn('Không thể khởi tạo Supabase Client:', e);
    }
}

// Export cấu hình ra window
window.APP_CONFIG = {
    supabaseConfig: SUPABASE_CONFIG,
    contactInfo: CONTACT_INFO,
    getClient: () => supabaseClient
};

