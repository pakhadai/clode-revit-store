// js/services/ModalService.js
export class ModalService {
    constructor(app) {
        this.app = app;
    }

    async claimDailyBonus() {
        try {
            const response = await api.claimDailyBonus();
            Utils.showNotification(this.app.t('notifications.bonusClaimed').replace('{amount}', response.amount), 'success');
            auth.user.balance = response.new_balance;
            auth.user.daily_streak = response.streak;
            this.app.render();
        } catch (error) {
            Utils.showNotification(this.app.t('notifications.alreadyClaimed'), 'warning');
        }
    }

    async showSubscriptionPlans() {
        try {
            Utils.showLoader(true);

            // Завантажуємо плани з API
            const response = await api.get('/subscriptions/plans', {
                language: Utils.getCurrentLanguage()
            });

            const plans = response.plans || [];
            const activeSubscription = response.active_subscription;

            // Створюємо модальне вікно
            const modal = document.createElement('div');
            modal.id = 'subscription-plans-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';

            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <!-- Заголовок -->
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-3xl font-bold dark:text-white">
                                ⭐ ${this.t('home.subscription.title')}
                            </h2>
                            <button onclick="document.getElementById('subscription-plans-modal').remove()"
                                    class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-3xl">
                                &times;
                            </button>
                        </div>

                        ${activeSubscription ? `
                            <div class="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 mb-6">
                                <p class="text-green-800 dark:text-green-200">
                                    ✅ У вас є активна підписка до ${Utils.formatDate(activeSubscription.expires_at)}
                                    (залишилось ${activeSubscription.days_remaining} днів)
                                </p>
                            </div>
                        ` : ''}

                        <!-- Переваги підписки -->
                        <div class="mb-8">
                            <h3 class="text-xl font-bold mb-4 dark:text-white">Переваги підписки:</h3>
                            <div class="grid md:grid-cols-2 gap-4">
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.newArchives')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.bonusSpins')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.cashback')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.support')}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Плани підписок -->
                        <div class="grid md:grid-cols-2 gap-6 mb-6">
                            ${plans.map(plan => `
                                <div class="border-2 ${plan.is_best_value ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                                            rounded-xl p-6 ${plan.is_best_value ? 'bg-purple-50 dark:bg-purple-900/20' : ''}">
                                    ${plan.is_best_value ? `
                                        <div class="bg-purple-500 text-white text-sm px-3 py-1 rounded-full inline-block mb-3">
                                            🎯 Найкраща пропозиція
                                        </div>
                                    ` : ''}

                                    <h4 class="text-2xl font-bold mb-2 dark:text-white">
                                        ${plan.name[Utils.getCurrentLanguage()] || plan.name.en}
                                    </h4>

                                    <div class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        $${plan.price_usd}
                                    </div>

                                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                                        ${plan.description[Utils.getCurrentLanguage()] || plan.description.en}
                                    </p>

                                    ${plan.discount ? `
                                        <div class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200
                                                    px-3 py-2 rounded-lg text-sm mb-4">
                                            🎁 ${plan.discount}
                                        </div>
                                    ` : ''}

                                    <button onclick="app.selectSubscriptionPlan('${plan.id}')"
                                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                                        Вибрати план
                                    </button>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Методи оплати (прихований спочатку) -->
                        <div id="payment-methods" style="display: none;" class="mt-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <h3 class="text-xl font-bold mb-4 dark:text-white">Виберіть метод оплати:</h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onclick="app.paySubscription('crypto', 'BTC')"
                                        class="p-4 bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-lg">
                                    <div class="text-3xl mb-2">₿</div>
                                    <div class="font-medium">Bitcoin</div>
                                </button>
                                <button onclick="app.paySubscription('crypto', 'ETH')"
                                        class="p-4 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg">
                                    <div class="text-3xl mb-2">Ξ</div>
                                    <div class="font-medium">Ethereum</div>
                                </button>
                                <button onclick="app.paySubscription('crypto', 'USDT')"
                                        class="p-4 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg">
                                    <div class="text-3xl mb-2">₮</div>
                                    <div class="font-medium">USDT</div>
                                </button>
                                <button onclick="app.paySubscription('bonuses')"
                                        class="p-4 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg"
                                        ${auth.user && auth.user.balance >= 500 ? '' : 'disabled style="opacity: 0.5;"'}>
                                    <div class="text-3xl mb-2">🎁</div>
                                    <div class="font-medium">Бонуси</div>
                                    <div class="text-xs text-gray-600 dark:text-gray-400">
                                        ${auth.user?.balance || 0} доступно
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Load subscription plans error:', error);
            Utils.showNotification('Помилка завантаження планів підписки', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    selectSubscriptionPlan(planId) {
        this.app.selectedSubscriptionPlan = planId;
        const paymentMethods = document.getElementById('payment-methods');
        if (paymentMethods) {
            paymentMethods.style.display = 'block';
            paymentMethods.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async paySubscription(method, currency = 'USDT') {
        if (!this.selectedSubscriptionPlan) {
            Utils.showNotification('Спочатку виберіть план підписки', 'warning');
            return;
        }

        try {
            Utils.showLoader(true);

            const response = await api.post('/subscriptions/create', {
                plan_type: this.selectedSubscriptionPlan,
                payment_method: method,
                currency: currency
            });

            if (response.success) {
                if (response.payment_url) {
                    // Перенаправляємо на сторінку оплати
                    window.location.href = response.payment_url;
                } else {
                    // Підписка активована (оплата бонусами)
                    Utils.showNotification('Підписка успішно активована!', 'success');
                    document.getElementById('subscription-plans-modal')?.remove();

                    // Оновлюємо дані користувача
                    await auth.getCurrentUser();
                    this.render();
                }
            }

        } catch (error) {
            console.error('Payment error:', error);
            Utils.showNotification('Помилка оплати', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    showLanguageMenu() {
        const currentLang = Utils.getCurrentLanguage();

        const modal = document.createElement('div');
        modal.id = 'language-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🌐 ${this.t('profile.settings.language')}</h3>

                <div class="space-y-2">
                    <button onclick="app.selectLanguage('uk')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'uk' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🇺🇦</span>
                            <span class="dark:text-white">Українська</span>
                        </div>
                        ${currentLang === 'uk' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>

                    <button onclick="app.selectLanguage('en')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'en' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🇬🇧</span>
                            <span class="dark:text-white">English</span>
                        </div>
                        ${currentLang === 'en' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>

                    <button onclick="app.selectLanguage('ru')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'ru' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⚪</span>
                            <span class="dark:text-white">Русский</span>
                        </div>
                        ${currentLang === 'ru' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>
                </div>

                <button onclick="document.getElementById('language-modal').remove()"
                        class="mt-6 w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                               text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                    ${this.t('buttons.close')}
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    selectLanguage(lang) {
        Utils.setLanguage(lang);

        // Якщо користувач авторизований - зберігаємо на сервері
        if (auth.isAuthenticated()) {
            auth.updateProfile({ language: lang }).catch(error => {
                console.error('Failed to update language preference:', error);
            });
        }

        // Закриваємо модальне вікно
        document.getElementById('language-modal')?.remove();

        // Оновлюємо UI
        this.updateLanguageButton();

        // Перезавантажуємо переклади та перерендеримо сторінку
        this.loadTranslations().then(() => {
            this.render();
            Utils.showNotification('✅ Мову змінено', 'success');
        });
    }

    showPinCodeModal() {
        const modal = document.createElement('div');
        modal.id = 'pin-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🔐 Встановити PIN-код</h3>

                <form onsubmit="app.savePinCode(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Новий PIN-код (4 цифри)
                        </label>
                        <input type="password" id="new-pin" pattern="[0-9]{4}" maxlength="4" required
                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                               placeholder="• • • •">
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Підтвердіть PIN-код
                        </label>
                        <input type="password" id="confirm-pin" pattern="[0-9]{4}" maxlength="4" required
                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                               placeholder="• • • •">
                    </div>

                    <div class="flex gap-3">
                        <button type="button" onclick="document.getElementById('pin-modal').remove()"
                                class="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                       text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                            ${this.t('buttons.cancel')}
                        </button>
                        <button type="submit"
                                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                            ${this.t('buttons.save')}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    savePinCode(event) {
        event.preventDefault();

        const newPin = document.getElementById('new-pin')?.value;
        const confirmPin = document.getElementById('confirm-pin')?.value;

        if (newPin !== confirmPin) {
            Utils.showNotification('PIN-коди не співпадають', 'error');
            return;
        }

        // Тут буде відправка на сервер
        console.log('Saving PIN code');

        document.getElementById('pin-modal')?.remove();
        Utils.showNotification('PIN-код успішно встановлено', 'success');
    }

    showReferralCode(code) {
        const referralLink = `https://t.me/OhMyRevitBot?start=${code}`;

        const modal = document.createElement('div');
        modal.id = 'referral-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🤝 Ваш реферальний код</h3>

                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div class="text-center text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">
                        ${code}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Ваш унікальний код
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                        Реферальне посилання:
                    </label>
                    <div class="flex gap-2">
                        <input type="text" value="${referralLink}" readonly
                               class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      bg-white dark:bg-gray-700 dark:text-white text-sm">
                        <button onclick="Utils.copyToClipboard('${referralLink}')"
                                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                            📋
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-4">
                    <button onclick="app.shareReferral('telegram')"
                            class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800">
                        <div class="text-2xl">✈️</div>
                        <div class="text-xs">Telegram</div>
                    </button>
                    <button onclick="app.shareReferral('whatsapp')"
                            class="p-3 bg-green-100 dark:bg-green-900 rounded-lg hover:bg-green-200 dark:hover:bg-green-800">
                        <div class="text-2xl">📱</div>
                        <div class="text-xs">WhatsApp</div>
                    </button>
                    <button onclick="app.shareReferral('copy')"
                            class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <div class="text-2xl">🔗</div>
                        <div class="text-xs">Копіювати</div>
                    </button>
                </div>

                <button onclick="document.getElementById('referral-modal').remove()"
                        class="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                               text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                    ${this.t('buttons.close')}
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    shareReferral(platform) {
        const code = auth.user?.referral_code || 'NOCODE';
        const referralLink = `https://t.me/OhMyRevitBot?start=${code}`;
        const message = `Приєднуйся до OhMyRevit - найкращого маркетплейсу архівів Revit! Отримай 30 бонусів за реєстрацію: ${referralLink}`;

        switch(platform) {
            case 'telegram':
                window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                break;
            case 'copy':
                Utils.copyToClipboard(referralLink);
                break;
        }
    }

    sendSupportMessage(event) {
        event.preventDefault();

        const topic = document.getElementById('support-topic')?.value;
        const message = document.getElementById('support-message')?.value;

        if (!message) {
            Utils.showNotification('Введіть повідомлення', 'warning');
            return;
        }

        // Тут буде відправка на сервер
        console.log('Sending support message:', { topic, message });

        // Очищаємо форму
        document.getElementById('support-message').value = '';

        Utils.showNotification('Повідомлення відправлено! Ми відповімо протягом 24 годин.', 'success');
    }

    updateSetting(setting, value) {
        const updates = {};
        updates[setting] = value;

        // Оновлюємо локально
        if (setting === 'theme') {
            Utils.setTheme(value);
            this.applyTheme();
        } else if (setting === 'language') {
            Utils.setLanguage(value);
            this.loadTranslations().then(() => {
                this.render();
            });
        }

        // Якщо авторизований - зберігаємо на сервері
        if (auth.isAuthenticated()) {
            auth.updateProfile(updates).catch(error => {
                console.error('Failed to update setting:', error);
            });
        }

        Utils.showNotification('Налаштування збережено', 'success');
    }
}