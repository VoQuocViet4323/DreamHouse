// js/config.js
// Cấu hình kết nối Supabase và Thông tin liên hệ
// Dự án: DreamHouse Supabase Live DB

const SUPABASE_CONFIG = {
    url: 'https://qdkhqvsbtmbgkmoldazt.supabase.co',
    anonKey: 'sb_publishable_HNBq9BOkrn7bmJxsG4ZHbQ_p937j35i'
};

const CONTACT_INFO = {
    phone: '0367020403',
    zalo: 'https://zalo.me/0367020403',
    email: 'voviet4323@gmail.com',
    facebook: 'https://www.facebook.com/quocviet43'
};

// Khởi tạo Supabase client
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
