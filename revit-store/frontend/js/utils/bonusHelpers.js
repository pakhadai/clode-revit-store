// js/utils/bonusHelpers.js
export const bonusHelpers = {
    /**
     * Calculate streak bonus amount based on day
     */
    getStreakBonusAmount(day) {
        // Default progression: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
        const defaultProgression = {
            1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
            6: 6, 7: 7, 8: 8, 9: 9, 10: 10
        };
        return defaultProgression[day] || 1;
    },

    /**
     * Calculate next bonus time
     */
    getNextBonusTime(lastClaimed) {
        if (!lastClaimed) return new Date();

        const lastDate = new Date(lastClaimed);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);

        return nextDate;
    },

    /**
     * Check if bonus can be claimed
     */
    canClaimBonus(lastClaimed) {
        if (!lastClaimed) return true;

        const now = new Date();
        const nextTime = this.getNextBonusTime(lastClaimed);

        return now >= nextTime;
    },

    /**
     * Format time until next bonus
     */
    formatTimeUntilNextBonus(lastClaimed) {
        const now = new Date();
        const next = this.getNextBonusTime(lastClaimed);
        const diff = next - now;

        if (diff <= 0) {
            return window.app?.t('bonuses.available') || 'Available now!';
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    },

    /**
     * Calculate wheel spin angle for sector
     */
    calculateWheelAngle(sectorIndex, totalSectors) {
        const anglePerSector = 360 / totalSectors;
        return sectorIndex * anglePerSector;
    },

    /**
     * Get wheel sector color
     */
    getWheelSectorColor(sector) {
        if (sector.type === 'mega') return '#FFD700'; // Gold
        if (sector.type === 'empty') return '#9CA3AF'; // Gray
        if (sector.value >= 50) return '#10B981'; // Green
        if (sector.value >= 20) return '#3B82F6'; // Blue
        if (sector.value >= 10) return '#8B5CF6'; // Purple
        return '#F59E0B'; // Yellow
    },

    /**
     * Create wheel animation CSS
     */
    createWheelSpinAnimation(targetSector, totalSectors, duration = 3000) {
        const anglePerSector = 360 / totalSectors;
        const targetAngle = targetSector * anglePerSector;
        const spins = 5; // Number of full rotations
        const totalAngle = (360 * spins) + (360 - targetAngle);

        return {
            transform: `rotate(${totalAngle}deg)`,
            transition: `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
        };
    },

    /**
     * Show bonus animation
     */
    showBonusAnimation(amount, type = 'bonus') {
        const animation = document.createElement('div');
        animation.className = 'bonus-animation fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';

        const colors = {
            bonus: 'bg-green-500',
            jackpot: 'bg-yellow-500',
            referral: 'bg-blue-500',
            achievement: 'bg-purple-500'
        };

        animation.innerHTML = `
            <div class="${colors[type] || colors.bonus} text-white text-4xl font-bold px-8 py-6 rounded-2xl shadow-2xl animate-bounce">
                +${amount} 🎁
            </div>
        `;

        document.body.appendChild(animation);

        // Remove after animation
        setTimeout(() => {
            animation.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => animation.remove(), 500);
        }, 2000);
    },

    /**
     * Calculate referral bonus
     */
    calculateReferralBonus(purchaseAmount, level = 1) {
        const rates = {
            1: 0.05,  // 5% for level 1
            2: 0.07,  // 7% for level 2
            3: 0.10   // 10% for level 3
        };

        const rate = rates[level] || rates[1];
        return Math.floor(purchaseAmount * rate);
    },

    /**
     * Check if user has streak bonus
     */
    hasStreakBonus(currentStreak, targetStreak = 7) {
        return currentStreak >= targetStreak;
    },

    /**
     * Format bonus amount with icon
     */
    formatBonusAmount(amount) {
        return `${amount} 🎁`;
    },

    /**
     * Get achievement for streak
     */
    getStreakAchievement(streak) {
        if (streak >= 30) return { icon: '🏆', title: 'Legend', bonus: 100 };
        if (streak >= 14) return { icon: '⭐', title: 'Master', bonus: 50 };
        if (streak >= 7) return { icon: '🌟', title: 'Expert', bonus: 25 };
        if (streak >= 3) return { icon: '✨', title: 'Regular', bonus: 10 };
        return null;
    }
};

window.bonusHelpers = bonusHelpers;
export default bonusHelpers;