// js/components/BonusStatisticsComponent.js
export class BonusStatisticsComponent {
    constructor(statistics) {
        this.statistics = statistics;
    }

    render() {
        if (!this.statistics) {
            return `<div class="text-center">${window.app?.t('common.loading') || 'Loading...'}</div>`;
        }

        return `
            <div class="bonus-statistics">
                ${this.renderHeader()}
                ${this.renderMainStats()}
                ${this.renderDetailedStats()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <h3 class="text-2xl font-bold mb-6 dark:text-white">
                📊 ${window.app?.t('bonuses.statistics.title') || 'Bonus Statistics'}
            </h3>
        `;
    }

    renderMainStats() {
        const stats = this.statistics;

        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${stats.current_balance || 0}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.statistics.currentBalance') || 'Current Balance'}
                    </div>
                </div>

                <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${stats.total_earned || 0}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.statistics.totalEarned') || 'Total Earned'}
                    </div>
                </div>

                <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        ${stats.daily_bonuses?.current_streak || 0}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.statistics.currentStreak') || 'Current Streak'}
                    </div>
                </div>

                <div class="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        ${stats.wheel?.jackpots || 0}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.statistics.jackpots') || 'Jackpots'}
                    </div>
                </div>
            </div>
        `;
    }

    renderDetailedStats() {
        const stats = this.statistics;

        return `
            <div class="grid md:grid-cols-3 gap-6">
                ${this.renderDailyBonusStats(stats.daily_bonuses)}
                ${this.renderWheelStats(stats.wheel)}
                ${this.renderReferralStats(stats.referrals)}
            </div>
        `;
    }

    renderDailyBonusStats(dailyStats) {
        if (!dailyStats) return '';

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 class="font-bold mb-3 dark:text-white">
                    🎁 ${window.app?.t('bonuses.daily.title') || 'Daily Bonuses'}
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.claimedTimes') || 'Claimed Times'}:
                        </span>
                        <span class="font-medium dark:text-white">${dailyStats.total_claimed || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.totalBonuses') || 'Total Bonuses'}:
                        </span>
                        <span class="font-medium dark:text-white">${dailyStats.total_received || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.maxStreak') || 'Max Streak'}:
                        </span>
                        <span class="font-medium dark:text-white">
                            ${dailyStats.max_streak || 0} ${window.app?.t('common.days') || 'days'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    renderWheelStats(wheelStats) {
        if (!wheelStats) return '';

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 class="font-bold mb-3 dark:text-white">
                    🎰 ${window.app?.t('wheel.title') || 'Wheel of Fortune'}
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.spinsMade') || 'Spins Made'}:
                        </span>
                        <span class="font-medium dark:text-white">${wheelStats.total_spins || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.totalWon') || 'Total Won'}:
                        </span>
                        <span class="font-medium dark:text-white">${wheelStats.total_won || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.winRate') || 'Win Rate'}:
                        </span>
                        <span class="font-medium dark:text-white">
                            ${(wheelStats.win_rate || 0).toFixed(1)}%
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('bonuses.statistics.spent') || 'Spent'}:
                        </span>
                        <span class="font-medium dark:text-white">${wheelStats.bonuses_spent || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderReferralStats(referralStats) {
        if (!referralStats) return '';

        const referralCode = referralStats.referral_code || 'NOCODE';

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 class="font-bold mb-3 dark:text-white">
                    🤝 ${window.app?.t('referrals.title') || 'Referrals'}
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">
                            ${window.app?.t('referrals.earned') || 'Earned'}:
                        </span>
                        <span class="font-medium dark:text-white">${referralStats.total_earned || 0}</span>
                    </div>
                    <div class="mb-3"></div>
                    <button onclick="app.showReferralCode('${referralCode}')"
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm">
                        ${window.app?.t('referrals.showCode') || 'Show Referral Code'}
                    </button>
                </div>
            </div>
        `;
    }
}

window.BonusStatisticsComponent = BonusStatisticsComponent;
export default BonusStatisticsComponent;