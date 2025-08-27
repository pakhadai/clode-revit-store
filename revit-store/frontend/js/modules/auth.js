// MODULAR ARCHITECTURE
import { AuthService } from '../services/AuthService.js';

// Create auth service instance
const authService = new AuthService();

// Initialize on load
authService.init();

// Create legacy-compatible wrapper
const auth = {
    // Properties
    get user() { return authService.user; },
    set user(value) { authService.user = value; },
    get tg() { return authService.tg; },

    // Methods
    initTelegram: () => authService.telegramService.init(),
    authenticate: () => authService.authenticate(),
    getCurrentUser: () => authService.getCurrentUser(),
    isAuthenticated: () => authService.isAuthenticated(),
    logout: () => authService.logout(),
    updateProfile: (data) => authService.updateProfile(data),

    // User state
    getBalance: () => authService.getBalance(),
    getVipLevel: () => authService.getVipLevel(),
    isCreator: () => authService.isCreator(),
    isAdmin: () => authService.isAdmin(),

    // Telegram methods
    getTelegramUser: () => authService.getTelegramUser(),
    getTelegramTheme: () => authService.getTelegramTheme(),
    showConfirm: (msg, cb) => authService.showConfirm(msg, cb),
    showAlert: (msg) => authService.showAlert(msg),
    openLink: (url) => authService.openLink(url),
    hapticFeedback: (type, style) => authService.hapticFeedback(type, style),
    showInviteFriend: () => authService.showInviteFriend(),
    setMainButton: (text, cb, show) => authService.setMainButton(text, cb, show),
    setBackButton: (cb, show) => authService.setBackButton(cb, show)
};

// Export for backward compatibility
window.auth = auth;
export default auth;