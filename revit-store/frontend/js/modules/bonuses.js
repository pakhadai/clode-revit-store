/**
 * Модуль для роботи з бонусами
 */

class BonusesModule {
    constructor() {
        this.dailyStatus = null;
        this.wheelConfig = null;
        this.wheelStatus = null;
        this.statistics = null;
    }

    /**
     * Ініціалізація модуля
     */
    async init() {
        try {
            // Завантажуємо конфігурацію колеса
            this.wheelConfig = await api.get('/bonuses/wheel/config');

            // Якщо користувач авторизований - завантажуємо статуси
            if (auth.isAuthenticated()) {
                await this.loadStatuses();
            }
        } catch (error) {
            console.error('Bonuses init error:', error);
        }
    }

    /**
     * Завантажити статуси бонусів
     */
    async loadStatuses() {
        try {
            // Паралельно завантажуємо всі статуси
            const [dailyStatus, wheelStatus, statistics] = await Promise.all([
                api.get('/bonuses/daily/status'),
                api.get('/bonuses/wheel/status'),
                api.get('/bonuses/statistics')
            ]);

            this.dailyStatus = dailyStatus;
            this.wheelStatus = wheelStatus;
            this.statistics = statistics;

            return {
                daily: this.dailyStatus,
                wheel: this.wheelStatus,
                stats: this.statistics
            };
        } catch (error) {
            console.error('Load bonuses status error:', error);
            throw error;
        }
    }

    /**
     * Отримати щоденний бонус
     */
    async claimDailyBonus() {
        try {
            Utils.showLoader(true);

            const response = await api.post('/bonuses/daily/claim');

            if (response.success) {
                // Оновлюємо дані користувача
                if (auth.user) {
                    auth.user.balance = response.data.new_balance;
                    auth.user.daily_streak = response.data.streak_day;
                    auth.user.free_spins_today = response.data.free_spins;
                }

                // Оновлюємо статус
                this.dailyStatus.can_claim = false;
                this.dailyStatus.current_streak = response.data.streak_day;

                // Показуємо анімацію
                this.showBonusAnimation(response.data.bonus_amount);

                // Haptic feedback
                auth.hapticFeedback('notification', 'success');

                Utils.showNotification(response.message, 'success');

                return response.data;
            }

        } catch (error) {
            console.error('Claim daily bonus error:', error);
            Utils.showNotification(error.message || window.app.t('notifications.bonusClaimError'), 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Відкрити колесо фортуни
     */
    async openWheel() {
        await wheelGame.init();
        wheelGame.open();
    }

    /**
     * Крутити колесо фортуни
     */
    async spinWheel(isFree = true) {
        try {
            // Перевіряємо можливість крутити
            if (isFree && this.wheelStatus.free_spins_available <= 0) {
                Utils.showNotification(window.app.t('wheel.noFreeSpins'), 'warning');
                return null;
            }

            if (!isFree && auth.user.balance < this.wheelConfig.spin_cost) {
                Utils.showNotification(window.app.t('wheel.notEnoughBonuses'), 'warning');
                return null;
            }

            const response = await api.post('/bonuses/wheel/spin', { is_free: isFree });

            if (response.success) {
                // Оновлюємо баланс та спіни
                if (auth.user) {
                    auth.user.balance = response.data.new_balance;
                    auth.user.free_spins_today = response.data.free_spins_left;
                }

                // Оновлюємо статус
                this.wheelStatus.free_spins_available = response.data.free_spins_left;
                this.wheelStatus.user_balance = response.data.new_balance;

                // Haptic feedback
                if (response.data.is_jackpot) {
                    auth.hapticFeedback('notification', 'success');
                } else if (response.data.prize > 0) {
                    auth.hapticFeedback('impact', 'medium');
                } else {
                    auth.hapticFeedback('impact', 'light');
                }

                return response.data;
            }

        } catch (error) {
            console.error('Spin wheel error:', error);
            Utils.showNotification(error.message || window.app.t('wheel.spinError'), 'error');
            throw error;
        }
    }

    /**
     * Отримати історію колеса
     */
    async getWheelHistory(limit = 10) {
        try {
            return await api.get('/bonuses/wheel/history', { limit });
        } catch (error) {
            console.error('Get wheel history error:', error);
            throw error;
        }
    }

    /**
     * Отримати лідерборд колеса
     */
    async getWheelLeaderboard(limit = 10) {
        try {
            return await api.get('/bonuses/wheel/leaderboard', { limit });
        } catch (error) {
            console.error('Get leaderboard error:', error);
            throw error;
        }
    }

    /**
     * Показати анімацію отримання бонуса
     */
    showBonusAnimation(amount) {
        // Створюємо елемент для анімації
        const animation = document.createElement('div');
        animation.className = 'bonus-animation fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
        animation.innerHTML = `
            <div class="bg-green-500 text-white text-4xl font-bold px-8 py-6 rounded-2xl shadow-2xl animate-bounce">
                +${amount} 🎁
            </div>
        `;

        document.body.appendChild(animation);

        // Видаляємо через 2 секунди
        setTimeout(() => {
            animation.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => animation.remove(), 500);
        }, 2000);
    }

    /**
     * Створити HTML для щоденного бонуса
     */
    createDailyBonusHTML() {
        if (!this.dailyStatus) {
            return `<div class="text-center">${window.app.t('notifications.loading')}</div>`;
        }

        const streakDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const currentStreak = this.dailyStatus.current_streak;
        const canClaim = this.dailyStatus.can_claim;

        return `
            <div class="daily-bonus-container">
                <h3 class="text-2xl font-bold mb-4 dark:text-white">🎁 ${window.app.t('home.dailyBonus.title')}</h3>

                <div class="streak-progress mb-6">
                    <div class="flex justify-between mb-2">
                        <span class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('home.dailyBonus.dayLabel')} ${currentStreak}</span>
                        <span class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('home.dailyBonus.streakLabel')}</span>
                    </div>

                    <div class="flex gap-1">
                        ${streakDays.map(day => `
                            <div class="flex-1 text-center">
                                <div class="day-box ${day <= currentStreak ? 'completed' : ''} ${day === currentStreak + 1 && canClaim ? 'next' : ''}
                                     bg-gray-200 dark:bg-gray-700 rounded p-2 mb-1
                                     ${day <= currentStreak ? 'bg-green-500 text-white' : ''}
                                     ${day === currentStreak + 1 && canClaim ? 'bg-blue-500 text-white animate-pulse' : ''}">
                                    <div class="text-xs">${window.app.t('home.dailyBonus.dayLabel')}</div>
                                    <div class="font-bold">${day}</div>
                                </div>
                                <div class="text-xs dark:text-gray-400">
                                    ${this.dailyStatus.streak_bonuses[day]}🎁
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="text-center">
                    ${canClaim ? `
                        <button onclick="bonuses.claimDailyBonus()"
                                class="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg
                                       transform hover:scale-105 transition-all shadow-lg">
                            <span class="text-2xl">🎁</span>
                            ${window.app.t('home.dailyBonus.claimButton').replace('{amount}', this.dailyStatus.next_bonus_amount)}
                        </button>
                    ` : `
                        <div class="text-gray-500 dark:text-gray-400">
                            <div class="text-2xl mb-2">⏰</div>
                            <p>${window.app.t('home.dailyBonus.nextBonusTomorrow')}</p>
                            <p class="text-sm mt-2">${window.app.t('home.dailyBonus.lastClaimed')}: ${Utils.formatDate(this.dailyStatus.last_claimed)}</p>
                        </div>
                    `}
                </div>

                <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        ${window.app.t('home.dailyBonus.streakTip')}
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Створити HTML для статистики
     */
    createStatisticsHTML() {
        if (!this.statistics) {
            return `<div class="text-center">${window.app.t('notifications.loading')}</div>`;
        }

        const stats = this.statistics;

        return `
            <div class="bonus-statistics">
                <h3 class="text-2xl font-bold mb-6 dark:text-white">📊 ${window.app.t('profile.statistics.title')}</h3>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            ${stats.current_balance}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.currentBalance')}</div>
                    </div>

                    <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                            ${stats.total_earned}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.totalEarned')}</div>
                    </div>

                    <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            ${stats.daily_bonuses.current_streak}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.currentStreak')}</div>
                    </div>

                    <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                            ${stats.wheel.jackpots}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.jackpots')}</div>
                    </div>
                </div>

                <div class="grid md:grid-cols-3 gap-6">
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-bold mb-3 dark:text-white">🎁 ${window.app.t('home.dailyBonus.title')}</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.claimedTimes')}:</span>
                                <span class="font-medium dark:text-white">${stats.daily_bonuses.total_claimed}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.totalBonuses')}:</span>
                                <span class="font-medium dark:text-white">${stats.daily_bonuses.total_received}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.maxStreak')}:</span>
                                <span class="font-medium dark:text-white">${stats.daily_bonuses.max_streak} ${window.app.t('time.days')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-bold mb-3 dark:text-white">🎰 ${window.app.t('wheel.title')}</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.spinsMade')}:</span>
                                <span class="font-medium dark:text-white">${stats.wheel.total_spins}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.totalWon')}:</span>
                                <span class="font-medium dark:text-white">${stats.wheel.total_won}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.winRate')}:</span>
                                <span class="font-medium dark:text-white">${stats.wheel.win_rate.toFixed(1)}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.statistics.spent')}:</span>
                                <span class="font-medium dark:text-white">${stats.wheel.bonuses_spent}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <h4 class="font-bold mb-3 dark:text-white">🤝 ${window.app.t('profile.tabs.referrals')}</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">${window.app.t('profile.referrals.earned')}:</span>
                                <span class="font-medium dark:text-white">${stats.referrals.total_earned}</span>
                            </div>
                            <div class="mb-3"></div>
                            <button onclick="app.showReferralCode('${stats.referrals.referral_code}')"
                                    class="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm">
                                ${window.app.t('profile.referrals.showCode')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Створюємо та експортуємо єдиний екземпляр
const bonuses = new BonusesModule();

// Експортуємо для використання в інших модулях
window.bonuses = bonuses;
