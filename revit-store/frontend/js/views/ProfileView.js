// js/views/ProfileView.js
import { BaseView } from './BaseView.js';
import { LoginModal } from '../components/LoginModal.js';

export class ProfileView extends BaseView {
    async render() {
        console.log('ProfileView render...');
        
        // Перевіряємо чи є користувач
        let user = await auth.getUser();
        
        // Якщо це Telegram Web App і користувача немає - спробуємо автоматично авторизуватись
        if (!user && auth.isWebApp) {
            console.log('Attempting auto-login in Web App...');
            Utils.showLoader(true);
            const success = await auth.authenticate();
            Utils.showLoader(false);
            
            if (success) {
                user = await auth.getUser();
            }
        }

        if (!user) {
            // Якщо користувача немає, показуємо сторінку входу
            return this.renderLoginPage();
        }

        // Якщо користувач є, показуємо його профіль
        return this.renderProfilePage(user);
    }

    renderLoginPage() {
        console.log('Rendering login page...');
        
        // Для Web App показуємо інше повідомлення
        if (auth.isWebApp) {
            return `
                <div class="auth-required text-center py-16">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h1 class="text-2xl font-bold mb-2 dark:text-white">Помилка авторизації</h1>
                    <p class="text-gray-600 dark:text-gray-400 mb-8">
                        Не вдалося отримати дані з Telegram.<br>
                        Спробуйте перезапустити додаток.
                    </p>
                    <button onclick="location.reload()"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                        Оновити сторінку
                    </button>
                </div>
            `;
        }
        
        // Для звичайного сайту показуємо кнопку входу
        return `
            <div class="auth-required text-center py-16">
                <div class="text-6xl mb-4">👤</div>
                <h1 class="text-2xl font-bold mb-2 dark:text-white">Особистий кабінет</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">
                    Увійдіть, щоб переглянути ваші замовлення, завантаження та налаштування.
                </p>
                <button onclick="LoginModal.show()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold inline-flex items-center gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                    </svg>
                    Увійти через Telegram
                </button>
                
                <div class="mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <p>Після входу ви зможете:</p>
                    <ul class="mt-2 space-y-1">
                        <li>📥 Завантажувати куплені архіви</li>
                        <li>📚 Створювати колекції</li>
                        <li>🎁 Отримувати щоденні бонуси</li>
                        <li>⭐ Оформити підписку</li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderProfilePage(user) {
        console.log('Rendering profile page for user:', user);
        
        const createTile = (page, icon, titleKey) => `
            <button onclick="app.navigateTo('${page}')" 
                    class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition-shadow text-center">
                <div class="text-4xl mb-2">${icon}</div>
                <div class="font-semibold dark:text-white">${this.app.t(titleKey)}</div>
            </button>
        `;

        return `
            <div class="profile-page max-w-4xl mx-auto">
                <!-- Заголовок профілю -->
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
                    <div class="flex items-center gap-4">
                        <!-- Аватар -->
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
                            ${user.photo_url ? 
                                `<img src="${user.photo_url}" alt="${user.first_name}" class="w-full h-full rounded-full object-cover">` : 
                                (user.first_name?.[0] || '👤')
                            }
                        </div>
                        
                        <!-- Інформація -->
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">
                                ${user.first_name} ${user.last_name || ''}
                            </h1>
                            <p class="text-gray-600 dark:text-gray-400">
                                @${user.username || `user_${user.telegram_id}`}
                            </p>
                            
                            <!-- Статуси -->
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${user.vip_level > 0 ? `
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        ${['', '🥉 Bronze', '🥈 Silver', '🥇 Gold', '💎 Diamond'][user.vip_level] || 'VIP'}
                                    </span>
                                ` : ''}
                                
                                ${user.is_creator ? `
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                        🎨 ${this.app.t('profile.creator')}
                                    </span>
                                ` : ''}
                                
                                ${user.is_admin ? `
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        👑 ${this.app.t('profile.admin')}
                                    </span>
                                ` : ''}
                                
                                ${user.subscription ? `
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        ⭐ Підписка
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Баланс -->
                        <div class="text-right">
                            <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                ${user.balance || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                ${this.app.t('profile.balance')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Кнопка виходу -->
                    <button onclick="auth.logout()" 
                            class="mt-4 w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        🚪 Вийти
                    </button>
                </div>

                <!-- Адмін панель для адмінів -->
                ${user.is_admin ? `
                    <div class="mb-4">
                        <button onclick="app.navigateTo('admin')" 
                                class="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02]">
                            👑 Адмін панель
                        </button>
                    </div>
                ` : ''}

                <!-- Плитки функцій -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${createTile('downloads', '📥', 'profile.tabs.downloads')}
                    ${createTile('orders', '📋', 'profile.tabs.orders')}
                    ${createTile('collections', '📚', 'profile.tabs.collections')}
                    ${createTile('referrals', '🤝', 'profile.tabs.referrals')}
                    ${createTile('settings', '⚙️', 'profile.tabs.settings')}
                    ${createTile('support', '💬', 'profile.tabs.support')}
                    ${createTile('faq', '❓', 'profile.tabs.faq')}
                    
                    <!-- Кнопка для творців або стати творцем -->
                    ${user.is_creator ?
                        `<button onclick="app.navigateTo('creator')" 
                                class="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 shadow hover:shadow-lg transition-all transform hover:scale-[1.02]">
                            <div class="text-3xl mb-1">🎨</div>
                            <div class="text-sm font-semibold">Кабінет творця</div>
                        </button>`
                    :
                        `<button onclick="admin.showCreatorApplicationModal()" 
                                class="bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-xl p-4 shadow hover:shadow-lg transition-all transform hover:scale-[1.02]">
                            <div class="text-3xl mb-1">🚀</div>
                            <div class="text-sm font-semibold">Стати творцем</div>
                        </button>`
                    }
                </div>

                <!-- Статистика -->
                ${user.statistics ? `
                    <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                ${user.statistics.downloads || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Завантажень</div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                                ${user.statistics.purchases || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Покупок</div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                ${user.statistics.referrals || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Рефералів</div>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                ${user.daily_streak || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">Днів поспіль</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

export default ProfileView;