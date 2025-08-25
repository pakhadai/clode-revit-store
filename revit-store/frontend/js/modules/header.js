/**
 * Модуль верхньої панелі управління
 */

class HeaderModule {
    constructor(app) {
        this.app = app;
        this.searchOpen = false;
        this.notificationCount = 0;
    }

    /**
     * Ініціалізація
     */
    init() {
        this.render();
        this.attachEventListeners();
        this.updateThemeButton();
        this.updateLanguageButton();
    }

    /**
     * Рендер верхньої панелі
     */
    render() {
        const header = document.getElementById('app-header');
        if (!header) return;

        header.innerHTML = `
            <div class="header-container">
                <!-- Логотип -->
                <div class="header-logo">
                    <div class="logo-icon">
                        <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                            <rect width="100" height="100" rx="20" fill="url(#logo-gradient)"/>
                            <path d="M30 40 L50 20 L70 40 L70 70 L50 80 L30 70 Z" fill="white" opacity="0.9"/>
                            <path d="M40 50 L50 40 L60 50 L60 60 L50 65 L40 60 Z" fill="url(#logo-gradient)" opacity="0.7"/>
                            <defs>
                                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <span class="logo-text">OhMyRevit</span>
                </div>

                <!-- Панель дій -->
                <div class="header-actions">
                    <!-- Пошук -->
                    <button class="header-btn" id="search-btn" aria-label="${this.app.t('header.search')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </button>

                    <!-- Сповіщення -->
                    <button class="header-btn" id="notifications-btn" aria-label="${this.app.t('header.notifications')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <span class="header-badge" id="notification-badge" style="display: none;">0</span>
                    </button>

                    <!-- Тема -->
                    <button class="header-btn" id="theme-toggle" aria-label="${this.app.t('header.theme')}">
                        <svg class="theme-icon-light" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                        <svg class="theme-icon-dark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </button>

                    <!-- Мова -->
                    <button class="header-btn" id="language-toggle" aria-label="${this.app.t('header.language')}">
                        <span class="lang-flag" id="current-lang-flag">🇺🇦</span>
                    </button>

                    <!-- Профіль -->
                    <button class="header-btn header-profile" id="profile-btn" aria-label="${this.app.t('nav.profile')}">
                        <div class="profile-avatar" id="user-avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                    </button>
                </div>
            </div>

            <!-- Панель пошуку -->
            <div class="search-panel" id="search-panel" style="display: none;">
                <div class="search-container">
                    <input type="text"
                           class="search-input"
                           id="search-input"
                           placeholder="${this.app.t('header.searchPlaceholder')}"
                           autocomplete="off">
                    <button class="search-close" id="search-close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="search-results" id="search-results"></div>
            </div>
        `;

        this.injectStyles();
    }

    /**
     * Додавання стилів
     */
    injectStyles() {
        if (document.getElementById('header-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'header-styles';
        styles.innerHTML = `
            #app-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 999;
                transition: transform 0.3s ease;
            }

            .dark #app-header {
                background: rgba(31, 41, 55, 0.95);
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                max-width: 1200px;
                margin: 0 auto;
            }

            .header-logo {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                transition: transform 0.2s ease;
            }

            .header-logo:active {
                transform: scale(0.98);
            }

            .logo-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .logo-text {
                font-size: 1.25rem;
                font-weight: 700;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .header-actions {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .header-btn {
                position: relative;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: 12px;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }

            .dark .header-btn {
                color: #9ca3af;
            }

            .header-btn:hover {
                background: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
            }

            .dark .header-btn:hover {
                background: rgba(96, 165, 250, 0.1);
                color: #60a5fa;
            }

            .header-btn:active {
                transform: scale(0.95);
            }

            .header-badge {
                position: absolute;
                top: 6px;
                right: 6px;
                background: #ef4444;
                color: white;
                font-size: 0.625rem;
                font-weight: bold;
                padding: 0.125rem 0.25rem;
                border-radius: 9999px;
                min-width: 16px;
                text-align: center;
            }

            .lang-flag {
                font-size: 1.25rem;
            }

            .profile-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }

            .profile-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            /* Панель пошуку */
            .search-panel {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                animation: slideDown 0.3s ease;
            }

            .dark .search-panel {
                background: #1f2937;
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .search-container {
                display: flex;
                align-items: center;
                padding: 1rem;
                gap: 0.5rem;
            }

            .search-input {
                flex: 1;
                padding: 0.75rem;
                background: rgba(0, 0, 0, 0.05);
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                outline: none;
                transition: background 0.2s ease;
            }

            .dark .search-input {
                background: rgba(255, 255, 255, 0.05);
                color: white;
            }

            .search-input:focus {
                background: rgba(59, 130, 246, 0.1);
            }

            .search-close {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: 10px;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .search-close:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
            }

            .search-results {
                max-height: 400px;
                overflow-y: auto;
                padding: 0.5rem;
            }

            /* Адаптивність */
            @media (max-width: 480px) {
                .logo-text {
                    display: none;
                }

                .header-actions {
                    gap: 0.25rem;
                }

                .header-btn {
                    width: 36px;
                    height: 36px;
                }
            }

            /* Темна тема - іконки */
            .dark .theme-icon-light {
                display: none;
            }

            .dark .theme-icon-dark {
                display: block;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Прикріплення обробників подій
     */
    attachEventListeners() {
        // Пошук
        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.toggleSearch();
        });

        document.getElementById('search-close')?.addEventListener('click', () => {
            this.closeSearch();
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Тема
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Мова
        document.getElementById('language-toggle')?.addEventListener('click', () => {
            this.showLanguageMenu();
        });

        // Сповіщення
        document.getElementById('notifications-btn')?.addEventListener('click', () => {
            this.showNotifications();
        });

        // Профіль
        document.getElementById('profile-btn')?.addEventListener('click', () => {
            this.app.navigateTo('profile');
        });

        // Логотип
        document.querySelector('.header-logo')?.addEventListener('click', () => {
            this.app.navigateTo('home');
        });
    }

    /**
     * Перемикання пошуку
     */
    toggleSearch() {
        const panel = document.getElementById('search-panel');
        const input = document.getElementById('search-input');

        if (this.searchOpen) {
            this.closeSearch();
        } else {
            panel.style.display = 'block';
            input.focus();
            this.searchOpen = true;
        }
    }

    /**
     * Закрити пошук
     */
    closeSearch() {
        const panel = document.getElementById('search-panel');
        const input = document.getElementById('search-input');

        panel.style.display = 'none';
        input.value = '';
        this.searchOpen = false;
        document.getElementById('search-results').innerHTML = '';
    }

    /**
     * Обробка пошуку
     */
    async handleSearch(query) {
        const results = document.getElementById('search-results');

        if (query.length < 2) {
            results.innerHTML = '';
            return;
        }

        // Тут буде реальний пошук через API
        results.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                ${this.app.t('buttons.search')}...
            </div>
        `;
    }

    /**
     * Перемикання теми
     */
    toggleTheme() {
        const currentTheme = this.app.utils.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.app.utils.setTheme(newTheme);
        this.app.applyTheme();
        this.updateThemeButton();
    }

    /**
     * Оновлення кнопки теми
     */
    updateThemeButton() {
        const isDark = document.documentElement.classList.contains('dark');
        const lightIcon = document.querySelector('.theme-icon-light');
        const darkIcon = document.querySelector('.theme-icon-dark');

        if (lightIcon && darkIcon) {
            lightIcon.style.display = isDark ? 'none' : 'block';
            darkIcon.style.display = isDark ? 'block' : 'none';
        }
    }

    /**
     * Показати меню мов
     */
    showLanguageMenu() {
        const currentLang = this.app.utils.getCurrentLanguage();

        const modal = document.createElement('div');
        modal.className = 'language-modal';
        modal.innerHTML = `
            <div class="language-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="language-modal-content">
                <h3 class="language-modal-title">${this.app.t('header.language')}</h3>
                <div class="language-options">
                    <button class="language-option ${currentLang === 'uk' ? 'active' : ''}"
                            onclick="window.headerModule.selectLanguage('uk')">
                        <span class="language-flag">🇺🇦</span>
                        <span class="language-name">Українська</span>
                        ${currentLang === 'uk' ? '<span class="language-check">✓</span>' : ''}
                    </button>
                    <button class="language-option ${currentLang === 'en' ? 'active' : ''}"
                            onclick="window.headerModule.selectLanguage('en')">
                        <span class="language-flag">🇬🇧</span>
                        <span class="language-name">English</span>
                        ${currentLang === 'en' ? '<span class="language-check">✓</span>' : ''}
                    </button>
                    <button class="language-option ${currentLang === 'ru' ? 'active' : ''}"
                            onclick="window.headerModule.selectLanguage('ru')">
                        <span class="language-flag">⚪</span>
                        <span class="language-name">Русский</span>
                        ${currentLang === 'ru' ? '<span class="language-check">✓</span>' : ''}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.injectLanguageModalStyles();
    }

    /**
     * Вибір мови
     */
    selectLanguage(lang) {
        this.app.utils.setLanguage(lang);
        this.updateLanguageButton();
        document.querySelector('.language-modal')?.remove();
        window.location.reload(); // Перезавантажуємо для застосування нової мови
    }

    /**
     * Оновлення кнопки мови
     */
    updateLanguageButton() {
        const lang = this.app.utils.getCurrentLanguage();
        const flags = {
            'uk': '🇺🇦',
            'en': '🇬🇧',
            'ru': '⚪'
        };

        const flagElement = document.getElementById('current-lang-flag');
        if (flagElement) {
            flagElement.textContent = flags[lang] || '🇺🇦';
        }
    }

    /**
     * Показати сповіщення
     */
    showNotifications() {
        // Тимчасово показуємо заглушку
        this.app.utils.showNotification(this.app.t('notifications.empty'), 'info');
    }

    /**
     * Оновити бейдж сповіщень
     */
    updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Оновити аватар користувача
     */
    updateUserAvatar(user) {
        const avatar = document.getElementById('user-avatar');
        if (!avatar) return;

        if (user && user.photo_url) {
            avatar.innerHTML = `<img src="${user.photo_url}" alt="${user.first_name}">`;
        } else if (user && user.first_name) {
            avatar.innerHTML = `<span>${user.first_name[0].toUpperCase()}</span>`;
        }
    }

    /**
     * Стилі для модального вікна мов
     */
    injectLanguageModalStyles() {
        if (document.getElementById('language-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'language-modal-styles';
        styles.innerHTML = `
            .language-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .language-modal-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
            }

            .language-modal-content {
                position: relative;
                background: white;
                border-radius: 16px;
                padding: 1.5rem;
                max-width: 320px;
                width: 100%;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                animation: slideUp 0.3s ease;
            }

            .dark .language-modal-content {
                background: #1f2937;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .language-modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: 1rem;
                color: #111827;
            }

            .dark .language-modal-title {
                color: white;
            }

            .language-options {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .language-option {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: transparent;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .dark .language-option {
                border-color: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .language-option:hover {
                background: rgba(59, 130, 246, 0.1);
                border-color: #3b82f6;
            }

            .language-option.active {
                background: rgba(59, 130, 246, 0.1);
                border-color: #3b82f6;
            }

            .language-flag {
                font-size: 1.5rem;
            }

            .language-name {
                flex: 1;
                text-align: left;
            }

            .language-check {
                color: #3b82f6;
                font-weight: bold;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Експортуємо клас
window.HeaderModule = HeaderModule;
window.headerModule = null; // Буде ініціалізовано в app.js