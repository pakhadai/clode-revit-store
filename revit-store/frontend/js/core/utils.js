/**
 * Утиліти та допоміжні функції
 */

const Utils = {
    /**
     * Форматування ціни
     */
    formatPrice(cents, currency = '$') {
        const dollars = cents / 100;
        return `${currency}${dollars.toFixed(2)}`;
    },

    /**
     * Форматування дати
     */
    formatDate(dateString, locale = 'uk-UA') {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Форматування розміру файлу
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Debounce функція для оптимізації
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Автоматичне визначення мови з Telegram
    getTelegramLanguage() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tgLang = window.Telegram.WebApp.initDataUnsafe?.user?.language_code;
            if (tgLang && ['uk', 'ru', 'en'].includes(tgLang)) {
                return tgLang;
            }
        }
        return 'en';
    },

    // Автоматичне визначення теми з Telegram
    getTelegramTheme() {
        if (window.Telegram && window.Telegram.WebApp) {
            return window.Telegram.WebApp.colorScheme || 'light';
        }
        return 'light';
    },

    /**
     * Показати повідомлення
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Видаляємо старі повідомлення
        const existingNotification = document.querySelector('.notification-toast');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Створюємо нове повідомлення
        const notification = document.createElement('div');
        notification.className = `notification-toast fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;

        // Додаємо стилі в залежності від типу
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };

        notification.classList.add(...styles[type].split(' '));

        // Іконки для різних типів
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-xl mr-3">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Анімація появи
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 10);

        // Автоматичне видалення
        setTimeout(() => {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    /**
     * Показати лоадер
     */
     showLoader: (() => {
        let loaderTimeout; // Ця змінна тепер "живе" всередині і доступна лише для showLoader

        // Повертаємо саму функцію, яка буде використовуватись у вашому коді
        return function(show = true) {
            let loader = document.getElementById('global-loader');

            // Завжди очищуємо попередній таймер, якщо він був
            clearTimeout(loaderTimeout);

            if (show) {
                // Встановлюємо таймер, щоб показати лоадер лише якщо завантаження триває
                loaderTimeout = setTimeout(() => {
                    if (!loader) {
                        loader = document.createElement('div');
                        loader.id = 'global-loader';
                        loader.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
                        loader.innerHTML = `
                            <div class="bg-white rounded-lg p-6 flex flex-col items-center">
                                <div class="loader border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
                                <p class="mt-4 text-gray-700">${window.app.t('notifications.loading', 'Завантаження...')}</p>
                            </div>
                        `;
                        document.body.appendChild(loader);
                    }
                    loader.classList.remove('hidden');
                }, 200); // Затримка 200 мс
            } else {
                // Якщо лоадер вже є, ховаємо його
                if (loader) {
                    loader.classList.add('hidden');
                }
            }
        };
    })(),

    /**
     * Локальне сховище з підтримкою JSON
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(key);
        },

        clear() {
            localStorage.clear();
        }
    },

    /**
     * Отримати поточну мову
     */
    getCurrentLanguage() {
        return this.storage.get('language', 'uk');
    },

    /**
     * Встановити мову
     */
    setLanguage(lang) {
        this.storage.set('language', lang);
        window.dispatchEvent(new CustomEvent('language:change', { detail: lang }));
    },

    /**
     * Отримати поточну тему
     */
    getCurrentTheme() {
        return this.storage.get('theme', 'light');
    },

    /**
     * Встановити тему
     */
    setTheme(theme) {
        this.storage.set('theme', theme);

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        window.dispatchEvent(new CustomEvent('theme:change', { detail: theme }));
    },

    /**
     * Перевірка мобільного пристрою
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Перевірка Telegram Web App
     */
    isTelegramWebApp() {
        return window.Telegram && window.Telegram.WebApp;
    },

    /**
     * Генерація випадкового ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Плюралізація слів
     */
    pluralize(count, words) {
        // words = ['товар', 'товари', 'товарів']
        const cases = [2, 0, 1, 1, 1, 2];
        return words[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)]];
    },

    /**
     * Копіювати в буфер обміну
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback для старих браузерів
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            this.showNotification(window.app.t('notifications.copied'), 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showNotification(window.app.t('notifications.failedToCopy'), 'error');
            return false;
        }
    },

    /**
     * Валідація email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Отримати параметри з URL
     */
    getUrlParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    /**
     * Оновити URL без перезавантаження сторінки
     */
    updateUrl(params) {
        const url = new URL(window.location);
        Object.keys(params).forEach(key => {
            if (params[key] === null || params[key] === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, params[key]);
            }
        });
        window.history.pushState({}, '', url);
    },

    /**
     * Анімація числа
     */
    animateNumber(element, start, end, duration = 1000) {
        const range = end - start;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const current = Math.floor(start + range * progress);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    /**
     * Завантаження зображення з fallback
     */
    loadImage(src, fallbackSrc = '/assets/images/placeholder.png') {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(fallbackSrc);
            img.src = src;
        });
    },

    /**
     * Throttle функція
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// Експортуємо для використання
window.Utils = Utils;
export default Utils;