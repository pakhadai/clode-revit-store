// js/views/ProfileView.js
import { BaseView } from './BaseView.js';
import { LoginModal } from '../components/LoginModal.js';

export class ProfileView extends BaseView {
    async render() {
        console.log('ProfileView render...');

        let user = await auth.getUser();

        // Якщо це Telegram Web App і користувача немає - спробуємо автоматично авторизуватись
        if (!user && auth.isWebApp) {
            console.log('Attempting auto-login in Web App...');
            Utils.showLoader(true);
            // Використовуємо спеціалізований метод для Web App
            const success = await auth.authenticateWithWebApp(auth.tg.initData);
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
        const container = document.getElementById('app');

        // Перевіряємо чи це Telegram Web App
        const isTelegramApp = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData;

        if (isTelegramApp) {
            // Автоматична авторизація через Telegram
            container.innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p class="mt-4">Авторизація через Telegram...</p>
                    </div>
                </div>
            `;

            // Спробувати авторизуватися
            auth.authenticate().then(() => {
                window.app.navigateTo('profile');
            });
        } else {
            // Показуємо кнопку для входу через браузер
            container.innerHTML = `
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                        <h2 class="text-2xl font-bold text-center mb-6">Вхід в OhMyRevit</h2>

                        <div class="space-y-4">
                            <!-- Telegram Login Widget -->
                            <div id="telegram-login-widget" class="flex justify-center"></div>

                            <!-- Або кнопка для відкриття в Telegram -->
                            <div class="text-center">
                                <p class="text-gray-500 mb-4">або</p>
                                <a href="https://t.me/ohmyrevit_bot?start=webapp"
                                   class="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
                                    Відкрити в Telegram
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Додаємо Telegram Login Widget
            const script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.setAttribute('data-telegram-login', 'ohmyrevit_bot');
            script.setAttribute('data-size', 'large');
            script.setAttribute('data-radius', '8');
            script.setAttribute('data-onauth', 'onTelegramAuth(user)');
            script.setAttribute('data-request-access', 'write');
            script.async = true;
            document.getElementById('telegram-login-widget').appendChild(script);
        }
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
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
                    <div class="flex items-center gap-4">
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
                            ${user.photo_url ?
                                `<img src="${user.photo_url}" alt="${user.first_name}" class="w-full h-full rounded-full object-cover">` :
                                (user.first_name?.[0] || '👤')
                            }
                        </div>
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">
                                ${user.first_name} ${user.last_name || ''}
                            </h1>
                            <p class="text-gray-600 dark:text-gray-400">
                                @${user.username || `user_${user.telegram_id}`}
                            </p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${user.vip_level > 0 ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">${['', '🥉 Bronze', '🥈 Silver', '🥇 Gold', '💎 Diamond'][user.vip_level] || 'VIP'}</span>` : ''}
                                ${user.is_creator ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">🎨 ${this.app.t('profile.creator')}</span>` : ''}
                                ${user.is_admin ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">👑 ${this.app.t('profile.admin')}</span>` : ''}
                                ${user.subscription ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">⭐ Підписка</span>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                ${user.balance || 0}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                ${this.app.t('profile.balance')}
                            </div>
                        </div>
                    </div>
                    <button onclick="auth.logout()"
                            class="mt-4 w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        🚪 Вийти
                    </button>
                </div>

                ${user.is_admin ? `<div class="mb-4"><button onclick="app.navigateTo('admin')" class="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02]">👑 Адмін панель</button></div>` : ''}

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${createTile('downloads', '📥', 'profile.tabs.downloads')}
                    ${createTile('orders', '📋', 'profile.tabs.orders')}
                    ${createTile('collections', '📚', 'profile.tabs.collections')}
                    ${createTile('referrals', '🤝', 'profile.tabs.referrals')}
                    ${createTile('settings', '⚙️', 'profile.tabs.settings')}
                    ${createTile('support', '💬', 'profile.tabs.support')}
                    ${createTile('faq', '❓', 'profile.tabs.faq')}
                    ${user.is_creator ? `<button onclick="app.navigateTo('creator')" class="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl p-4 shadow hover:shadow-lg transition-all transform hover:scale-[1.02]"><div class="text-3xl mb-1">🎨</div><div class="text-sm font-semibold">Кабінет творця</div></button>`
                    : `<button onclick="admin.showCreatorApplicationModal()" class="bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-xl p-4 shadow hover:shadow-lg transition-all transform hover:scale-[1.02]"><div class="text-3xl mb-1">🚀</div><div class="text-sm font-semibold">Стати творцем</div></button>`}
                </div>
            </div>
        `;
    }
}

export default ProfileView;