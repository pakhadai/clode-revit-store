// js/components/DailyBonusComponent.js
export class DailyBonusComponent {
    constructor(dailyStatus, onClaim) {
        this.dailyStatus = dailyStatus;
        this.onClaim = onClaim;
        this.streakDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }

    render() {
        if (!this.dailyStatus) {
            return `<div class="text-center">${window.app?.t('common.loading') || 'Loading...'}</div>`;
        }

        return `
            <div class="daily-bonus-container">
                ${this.renderHeader()}
                ${this.renderStreakProgress()}
                ${this.renderClaimSection()}
                ${this.renderTip()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <h3 class="text-2xl font-bold mb-4 dark:text-white">
                🎁 ${window.app?.t('bonuses.daily.title') || 'Daily Bonus'}
            </h3>
        `;
    }

    renderStreakProgress() {
        const currentStreak = this.dailyStatus.current_streak;
        const canClaim = this.dailyStatus.can_claim;

        return `
            <div class="streak-progress mb-6">
                <div class="flex justify-between mb-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.daily.day') || 'Day'} ${currentStreak}
                    </span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        ${window.app?.t('bonuses.daily.streak') || 'Streak'}
                    </span>
                </div>

                <div class="flex gap-1">
                    ${this.streakDays.map(day => this.renderStreakDay(day, currentStreak, canClaim)).join('')}
                </div>
            </div>
        `;
    }

    renderStreakDay(day, currentStreak, canClaim) {
        const isCompleted = day <= currentStreak;
        const isNext = day === currentStreak + 1 && canClaim;
        const bonusAmount = this.dailyStatus.streak_bonuses?.[day] || day;

        let classes = 'flex-1 text-center';
        let boxClasses = 'day-box bg-gray-200 dark:bg-gray-700 rounded p-2 mb-1';

        if (isCompleted) {
            boxClasses += ' bg-green-500 text-white';
        } else if (isNext) {
            boxClasses += ' bg-blue-500 text-white animate-pulse';
        }

        return `
            <div class="${classes}">
                <div class="${boxClasses}">
                    <div class="text-xs">${window.app?.t('bonuses.daily.day') || 'Day'}</div>
                    <div class="font-bold">${day}</div>
                </div>
                <div class="text-xs dark:text-gray-400">
                    ${bonusAmount}🎁
                </div>
            </div>
        `;
    }

    renderClaimSection() {
        const canClaim = this.dailyStatus.can_claim;

        if (canClaim) {
            const nextBonus = this.dailyStatus.next_bonus_amount;
            return `
                <div class="text-center">
                    <button onclick="dailyBonusComponent.handleClaim()"
                            class="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl
                                   font-bold text-lg transform hover:scale-105 transition-all shadow-lg">
                        <span class="text-2xl">🎁</span>
                        ${window.app?.t('bonuses.daily.claimButton') || `Claim ${nextBonus} bonuses`}
                    </button>
                </div>
            `;
        }

        return `
            <div class="text-center text-gray-500 dark:text-gray-400">
                <div class="text-2xl mb-2">⏰</div>
                <p>${window.app?.t('bonuses.daily.nextTomorrow') || 'Next bonus available tomorrow'}</p>
                ${this.dailyStatus.last_claimed ? `
                    <p class="text-sm mt-2">
                        ${window.app?.t('bonuses.daily.lastClaimed') || 'Last claimed'}:
                        ${new Date(this.dailyStatus.last_claimed).toLocaleString()}
                    </p>
                ` : ''}
            </div>
        `;
    }

    renderTip() {
        return `
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p class="text-sm text-blue-800 dark:text-blue-200">
                    💡 ${window.app?.t('bonuses.daily.tip') || "Don't miss days to get more bonuses! Max bonus on day 10 - 10 bonuses daily!"}
                </p>
            </div>
        `;
    }

    async handleClaim() {
        if (this.onClaim) {
            await this.onClaim();
        }
    }
}

// Global reference for event handlers
window.dailyBonusComponent = null;
export default DailyBonusComponent;