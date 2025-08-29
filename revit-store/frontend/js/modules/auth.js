// js/modules/auth.js
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
    get isWebApp() { return authService.isWebApp; },

    // Методи авторизації
    getUser: () => authService.getUser(),
    isAuthenticated: () => authService.isAuthenticated(),
    authenticate: () => authService.authenticate(),
    requireAuthentication: () => authService.requireAuthentication(),
    logout: () => authService.logout(),
    
    // Перевірка середовища
    isTelegramWebApp: () => authService.isTelegramWebApp(),
    
    // Перевірка ролей
    isAdmin: () => authService.isAdmin(),
    isCreator: () => authService.isCreator(),
    
    // Telegram-специфічні методи
    getTelegramUser: () => authService.getTelegramUser(),
    getTelegramTheme: () => authService.getTelegramTheme(),
    hapticFeedback: (type, style) => authService.hapticFeedback(type, style),
    showConfirm: (message, callback) => authService.showConfirm(message, callback),
};

// Експортуємо для використання в інших модулях та робимо глобальним
window.auth = auth;
export default auth;