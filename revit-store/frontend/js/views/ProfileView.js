// js/views/ProfileView.js
import { BaseView } from './BaseView.js';

export class ProfileView extends BaseView {
    async render() {
        if (!auth.isAuthenticated()) {
            return this.renderAuthRequiredPage();
        }

        const user = auth.user;

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

    renderOrdersTab() {
       const orders = Utils.storage.get('user_orders', []);

       if (orders.length === 0) {
           return `
               <div class="text-center py-16">
                   <div class="text-6xl mb-4">📋</div>
                   <h3 class="text-xl font-bold mb-2 dark:text-white">Немає замовлень</h3>
                   <p class="text-gray-600 dark:text-gray-400">Ваші замовлення з'являться тут</p>
               </div>
           `;
       }

       return `
           <div class="orders-list">
               <h3 class="text-xl font-bold mb-4 dark:text-white">📋 Історія замовлень</h3>
               <div class="space-y-4">
                   ${orders.map(order => `
                       <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
                           <div class="flex justify-between items-start mb-2">
                               <div>
                                   <h4 class="font-bold dark:text-white">Замовлення #${order.order_number}</h4>
                                   <p class="text-sm text-gray-600 dark:text-gray-400">
                                       ${Utils.formatDate(order.created_at)}
                                   </p>
                               </div>
                               <span class="px-3 py-1 rounded-full text-sm ${
                                   order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                   order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                   'bg-red-100 text-red-800'
                               }">
                                   ${order.status === 'completed' ? '✅ Завершено' :
                                     order.status === 'pending' ? '⏳ В обробці' :
                                     '❌ Скасовано'}
                               </span>
                           </div>
                           <div class="text-sm text-gray-600 dark:text-gray-400">
                               Товарів: ${order.items_count} | Сума: ${Utils.formatPrice(order.total)}
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       `;
   }

    renderReferralsTab() {
       const user = auth.user;
       const referralCode = user?.referral_code || 'NOCODE';
       const referralLink = `https://t.me/OhMyRevitBot?start=${referralCode}`;

       return `
           <div class="referrals-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">🤝 ${this.app.t('profile.referrals.title')}</h3>
               <div class="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
                   <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Ваше реферальне посилання:</p>
                   <div class="flex gap-2">
                       <input type="text" value="${referralLink}" readonly
                              class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white">
                       <button onclick="Utils.copyToClipboard('${referralLink}')"
                               class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                           📋 Копіювати
                       </button>
                   </div>
               </div>
               <div class="grid grid-cols-2 gap-4 mb-6">
                   <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                       <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                           ${user?.referral_count || 0}
                       </div>
                       <div class="text-sm text-gray-600 dark:text-gray-400">Запрошено друзів</div>
                   </div>
                   <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                       <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                           ${user?.referral_earnings || 0}
                       </div>
                       <div class="text-sm text-gray-600 dark:text-gray-400">Зароблено бонусів</div>
                   </div>
               </div>
               <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                   <h4 class="font-bold mb-2 dark:text-white">Як це працює:</h4>
                   <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                       <li>✅ Друг реєструється за вашим посиланням</li>
                       <li>✅ Ви отримуєте 30 бонусів за реєстрацію</li>
                       <li>✅ Отримуєте 5% від кожної покупки друга</li>
                       <li>✅ Бонуси нараховуються автоматично</li>
                   </ul>
               </div>
           </div>
       `;
   }

    renderSettingsTab() {
       const user = auth.user;

       return `
           <div class="settings-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">⚙️ ${this.app.t('profile.tabs.settings')}</h3>
               <div class="space-y-6">
                   <div>
                       <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                           ${this.app.t('profile.settings.language')}
                       </label>
                       <select id="settings-language" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                               onchange="app.updateSetting('language', this.value)">
                           <option value="uk" ${user?.language === 'uk' ? 'selected' : ''}>🇺🇦 Українська</option>
                           <option value="en" ${user?.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                           <option value="ru" ${user?.language === 'ru' ? 'selected' : ''}>🏳 Русский</option>
                       </select>
                   </div>
                   <div>
                       <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                           ${this.app.t('profile.settings.theme')}
                       </label>
                       <div class="grid grid-cols-2 gap-4">
                           <button onclick="app.updateSetting('theme', 'light')"
                                   class="p-4 border-2 ${user?.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg hover:border-blue-500">
                               <div class="text-3xl mb-2">☀️</div>
                               <div>${this.app.t('profile.settings.light')}</div>
                           </button>
                           <button onclick="app.updateSetting('theme', 'dark')"
                                   class="p-4 border-2 ${user?.theme === 'dark' ? 'border-blue-500 bg-blue-900' : 'border-gray-300 dark:border-gray-600'} rounded-lg hover:border-blue-500">
                               <div class="text-3xl mb-2">🌙</div>
                               <div>${this.app.t('profile.settings.dark')}</div>
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       `;
   }

    renderSupportTab() {
       return `
           <div class="support-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">💬 Підтримка</h3>
               <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
                   <form onsubmit="app.sendSupportMessage(event)">
                       <div class="mb-4">
                           <label class="block text-sm font-medium mb-2 dark:text-gray-300">Тема звернення</label>
                           <select id="support-topic" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                               <option value="general">Загальне питання</option>
                               <option value="payment">Проблема з оплатою</option>
                               <option value="download">Проблема з завантаженням</option>
                               <option value="creator">Питання творця</option>
                               <option value="other">Інше</option>
                           </select>
                       </div>
                       <div class="mb-4">
                           <label class="block text-sm font-medium mb-2 dark:text-gray-300">Повідомлення</label>
                           <textarea id="support-message" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                     placeholder="Опишіть вашу проблему або питання..." required></textarea>
                       </div>
                       <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                           📤 Відправити
                       </button>
                   </form>
               </div>
           </div>
       `;
   }

    renderFaqTab() {
       const faqItems = [
           { question: 'Як отримати безкоштовні архіви?', answer: 'Безкоштовні архіви доступні всім користувачам у розділі "Безкоштовні" маркетплейсу.' },
           { question: 'Що дає підписка?', answer: 'Підписка надає доступ до всіх преміум архівів, +2 прокрутки колеса щодня, 5% кешбек бонусами.' },
           { question: 'Як працює реферальна програма?', answer: 'Запрошуйте друзів за вашим посиланням. Ви отримаєте 30 бонусів за кожну реєстрацію.' },
       ];

       return `
           <div class="faq-content">
               <h3 class="text-xl font-bold mb-6 dark:text-white">❓ Часті питання</h3>
               <div class="space-y-4">
                   ${faqItems.map((item, index) => `
                       <div class="faq-item bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                           <button onclick="app.toggleFaqItem(${index})"
                                   class="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700">
                               <span class="font-medium dark:text-white">${item.question}</span>
                               <span class="text-gray-400 transform transition-transform" id="faq-icon-${index}">▼</span>
                           </button>
                           <div id="faq-answer-${index}" class="hidden px-6 pb-4">
                               <p class="text-gray-600 dark:text-gray-400">${item.answer}</p>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       `;
   }
}