import { BaseView } from './BaseView.js';
import { LoginModal } from '../components/LoginModal.js';

export class ProfileView extends BaseView {
    async render() {
        Utils.showLoader(true);
        // --- ВИКОРИСТОВУЄМО НОВИЙ КОРЕКТНИЙ МЕТОД ---
        const user = await auth.getUser();
        Utils.showLoader(false);

        if (!user) {
            // Якщо користувача немає, показуємо сторінку входу
            return this.renderLoginPage();
        }

        // Якщо користувач є, показуємо його профіль
        return this.renderProfilePage(user);
    }

    renderLoginPage() {
        // Ця логіка тепер спрацює тільки якщо користувач не залогінений
        return `
            <div class="auth-required text-center py-16">
                <div class="text-6xl mb-4">👤</div>
                <h1 class="text-2xl font-bold mb-2 dark:text-white">Особистий кабінет</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">Увійдіть, щоб переглянути ваші замовлення, завантаження та налаштування.</p>
                <button onclick="LoginModal.show()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    Увійти через Telegram
                </button>
            </div>
        `;
    }

    renderProfilePage(user) {
        const createTile = (page, icon, titleKey) => `
            <button onclick="app.navigateTo('${page}')" class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition-shadow text-center">
                <div class="text-4xl mb-2">${icon}</div>
                <div class="font-semibold dark:text-white">${this.app.t(titleKey)}</div>
            </button>
        `;

        return `
            <div class="profile-page max-w-4xl mx-auto">
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
                    <div class="flex items-center gap-4">
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
                            ${user.first_name?.[0] || '👤'}
                        </div>
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">${user.first_name} ${user.last_name || ''}</h1>
                            <p class="text-gray-600 dark:text-gray-400">@${user.username || `user_${user.telegram_id}`}</p>
                            <div class="flex flex-wrap gap-4 mt-2">
                                <span class="text-sm font-medium ${user.vip_level > 0 ? 'text-yellow-500' : 'text-gray-500'}">${user.vip_level_name || this.app.t('profile.noVip')}</span>
                                ${user.is_creator ? `<span class="text-sm font-medium text-purple-500">🎨 ${this.app.t('profile.creator')}</span>` : ''}
                                ${user.is_admin ? `<span class="text-sm font-medium text-red-500">👑 ${this.app.t('profile.admin')}</span>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">${user.balance}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">${this.app.t('profile.balance')}</div>
                        </div>
                    </div>
                     <button onclick="auth.logout()" class="mt-4 w-full bg-gray-200 dark:bg-gray-700 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        Вийти
                    </button>
                </div>
                ${user.is_admin ? `
                    <div class="mb-4">
                        <button onclick="app.navigateTo('admin')" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg">
                            👑 Адмін панель
                        </button>
                    </div>
                ` : ''}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${createTile('downloads', '📥', 'profile.tabs.downloads')}
                    ${createTile('orders', '📋', 'profile.tabs.orders')}
                    ${createTile('collections', '📚', 'profile.tabs.collections')}
                    ${createTile('referrals', '🤝', 'profile.tabs.referrals')}
                    ${createTile('settings', '⚙️', 'profile.tabs.settings')}
                    ${createTile('support', '💬', 'profile.tabs.support')}
                    ${createTile('faq', '❓', 'profile.tabs.faq')}
                    ${user.is_creator ?
                        `<button onclick="app.navigateTo('creator')" class="bg-purple-100 dark:bg-purple-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🎨</div>
                            <div class="text-sm font-semibold text-purple-700 dark:text-purple-300">Кабінет творця</div>
                        </button>`
                    :
                        `<button onclick="admin.showCreatorApplicationModal()" class="bg-green-100 dark:bg-green-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🚀</div>
                            <div class="text-sm font-semibold text-green-700 dark:text-green-300">Стати творцем</div>
                        </button>`
                    }
                </div>
            </div>
        `;
    }
}
