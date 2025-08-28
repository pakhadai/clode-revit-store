// js/store/BonusesStore.js
export class BonusesStore {
    constructor() {
        this.storageKeys = {
            dailyStatus: 'bonus_daily_status',
            wheelConfig: 'bonus_wheel_config',
            wheelStatus: 'bonus_wheel_status',
            statistics: 'bonus_statistics'
        };

        this.dailyStatus = null;
        this.wheelConfig = null;
        this.wheelStatus = null;
        this.statistics = null;

        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            this.dailyStatus = this.getFromStorage(this.storageKeys.dailyStatus);
            this.wheelConfig = this.getFromStorage(this.storageKeys.wheelConfig);
            this.wheelStatus = this.getFromStorage(this.storageKeys.wheelStatus);
            this.statistics = this.getFromStorage(this.storageKeys.statistics);
        } catch (error) {
            console.error('Failed to load bonuses from storage:', error);
        }
    }

    getFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    setToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to save ${key} to storage:`, error);
        }
    }

    // Daily Bonus methods
    setDailyStatus(status) {
        this.dailyStatus = status;
        this.setToStorage(this.storageKeys.dailyStatus, status);
    }

    getDailyStatus() {
        return this.dailyStatus;
    }

    updateDailyStatus(updates) {
        this.dailyStatus = { ...this.dailyStatus, ...updates };
        this.setToStorage(this.storageKeys.dailyStatus, this.dailyStatus);
    }

    // Wheel config methods
    setWheelConfig(config) {
        this.wheelConfig = config;
        this.setToStorage(this.storageKeys.wheelConfig, config);
    }

    getWheelConfig() {
        return this.wheelConfig;
    }

    // Wheel status methods
    setWheelStatus(status) {
        this.wheelStatus = status;
        this.setToStorage(this.storageKeys.wheelStatus, status);
    }

    getWheelStatus() {
        return this.wheelStatus;
    }

    updateWheelStatus(updates) {
        this.wheelStatus = { ...this.wheelStatus, ...updates };
        this.setToStorage(this.storageKeys.wheelStatus, this.wheelStatus);
    }

    // Statistics methods
    setStatistics(stats) {
        this.statistics = stats;
        this.setToStorage(this.storageKeys.statistics, stats);
    }

    getStatistics() {
        return this.statistics;
    }

    // Utility methods
    clearAll() {
        this.dailyStatus = null;
        this.wheelConfig = null;
        this.wheelStatus = null;
        this.statistics = null;

        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    getTotalBonusesEarned() {
        return this.statistics?.total_earned || 0;
    }

    getCurrentStreak() {
        return this.dailyStatus?.current_streak || 0;
    }

    getMaxStreak() {
        return this.statistics?.daily_bonuses?.max_streak || 0;
    }

    getJackpotCount() {
        return this.statistics?.wheel?.jackpots || 0;
    }
}

window.BonusesStore = BonusesStore;
export default BonusesStore;