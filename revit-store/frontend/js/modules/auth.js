import { AuthService } from '../services/AuthService.js';

// Створюємо єдиний екземпляр AuthService
const authService = new AuthService();

// Ініціалізуємо його при завантаженні скрипта
authService.init();

// Створюємо глобальний об'єкт `auth` для сумісності та зручності
const auth = {
    // Властивості
    get user() { return authService.user; },
    get tg() { return authService.tg; },

    // Методи
    getUser: () => authService.getUser(),
    isAuthenticated: () => authService.isAuthenticated(),
    logout: () => authService.logout(),
    isTelegramWebApp: () => authService.isTelegramWebApp(),
    
    // Telegram-специфічні методи
    getTelegramUser: () => authService.getTelegramUser(),
    getTelegramTheme: () => authService.getTelegramTheme(),
};

// Експортуємо для використання в інших модулях та робимо глобальним
window.auth = auth;
export default auth;
