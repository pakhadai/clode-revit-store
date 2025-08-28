// js/services/BonusesService.js
import { BonusesAPI } from '../api/BonusesAPI.js';
import { BonusesStore } from '../store/BonusesStore.js';

export class BonusesService {
    constructor() {
        this.api = new BonusesAPI();
        this.store = new BonusesStore();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Load wheel config (available for all users)
            const wheelConfig = await this.api.getWheelConfig();
            this.store.setWheelConfig(wheelConfig);

            // Load user-specific data if authenticated
            if (window.auth?.isAuthenticated()) {
                await this.loadUserBonusData();
            }

            this.initialized = true;
        } catch (error) {
            console.error('BonusesService initialization error:', error);
        }
    }

    async loadUserBonusData() {
        try {
            const [dailyStatus, wheelStatus, statistics] = await Promise.all([
                this.api.getDailyBonusStatus(),
                this.api.getWheelStatus(),
                this.api.getBonusStatistics()
            ]);

            this.store.setDailyStatus(dailyStatus);
            this.store.setWheelStatus(wheelStatus);
            this.store.setStatistics(statistics);

            return { dailyStatus, wheelStatus, statistics };
        } catch (error) {
            console.error('Load user bonus data error:', error);
            throw error;
        }
    }

    async claimDailyBonus() {
        if (!this.canClaimDailyBonus()) {
            throw new Error(window.app?.t('bonuses.alreadyClaimed') || 'Already claimed today');
        }

        const response = await this.api.claimDailyBonus();

        if (response.success) {
            // Update store
            this.store.updateDailyStatus({
                can_claim: false,
                current_streak: response.data.streak_day,
                last_claimed: new Date().toISOString()
            });

            // Update user balance
            if (window.auth?.user) {
                window.auth.user.balance = response.data.new_balance;
                window.auth.user.daily_streak = response.data.streak_day;
                window.auth.user.free_spins_today = response.data.free_spins;
            }

            // Trigger haptic feedback
            window.auth?.hapticFeedback('notification', 'success');

            return response.data;
        }

        throw new Error(response.message || 'Failed to claim bonus');
    }

    async spinWheel(isFree = true) {
        const wheelStatus = this.store.getWheelStatus();
        const wheelConfig = this.store.getWheelConfig();

        // Validate spin possibility
        if (isFree && wheelStatus.free_spins_available <= 0) {
            throw new Error(window.app?.t('wheel.noFreeSpins') || 'No free spins available');
        }

        if (!isFree && window.auth?.user?.balance < wheelConfig.spin_cost) {
            throw new Error(window.app?.t('wheel.insufficientBalance') || 'Insufficient balance');
        }

        const response = await this.api.spinWheel(isFree);

        if (response.success) {
            // Update store
            this.store.updateWheelStatus({
                free_spins_available: response.data.free_spins_left,
                user_balance: response.data.new_balance,
                last_spin: new Date().toISOString()
            });

            // Update user data
            if (window.auth?.user) {
                window.auth.user.balance = response.data.new_balance;
                window.auth.user.free_spins_today = response.data.free_spins_left;
            }

            // Haptic feedback based on result
            if (response.data.is_jackpot) {
                window.auth?.hapticFeedback('notification', 'success');
            } else if (response.data.prize > 0) {
                window.auth?.hapticFeedback('impact', 'medium');
            } else {
                window.auth?.hapticFeedback('impact', 'light');
            }

            return response.data;
        }

        throw new Error(response.message || 'Spin failed');
    }

    canClaimDailyBonus() {
        const dailyStatus = this.store.getDailyStatus();
        return dailyStatus?.can_claim || false;
    }

    getStreakBonusAmount(streakDay) {
        const dailyStatus = this.store.getDailyStatus();
        return dailyStatus?.streak_bonuses?.[streakDay] || 1;
    }

    getWheelSectors() {
        const config = this.store.getWheelConfig();
        return config?.sectors || [];
    }

    async getWheelHistory(limit = 10) {
        return this.api.getWheelHistory(limit);
    }

    async getWheelLeaderboard(limit = 10) {
        return this.api.getWheelLeaderboard(limit);
    }
}

window.BonusesService = BonusesService;
export default BonusesService;