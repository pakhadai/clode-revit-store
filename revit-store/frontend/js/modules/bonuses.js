// js/modules/bonuses.js
// LEGACY: Refactored into modular architecture

// NEW: Import modular components
import { BonusesAPI } from '../api/BonusesAPI.js';
import { BonusesService } from '../services/BonusesService.js';
import { BonusesStore } from '../store/BonusesStore.js';
import { DailyBonusComponent } from '../components/DailyBonusComponent.js';
import { BonusStatisticsComponent } from '../components/BonusStatisticsComponent.js';
import { bonusHelpers } from '../utils/bonusHelpers.js';

class BonusesModule {
    constructor() {
        // NEW: Use modular services
        this.api = new BonusesAPI();
        this.service = new BonusesService();
        this.store = new BonusesStore();
        this.helpers = bonusHelpers;

        // LEGACY: Preserved properties for backward compatibility
        this.dailyStatus = null;
        this.wheelConfig = null;
        this.wheelStatus = null;
        this.statistics = null;
    }

    // LEGACY: Delegate to service
    async init() {
        await this.service.initialize();

        // Sync legacy properties
        this.dailyStatus = this.service.store.getDailyStatus();
        this.wheelConfig = this.service.store.getWheelConfig();
        this.wheelStatus = this.service.store.getWheelStatus();
        this.statistics = this.service.store.getStatistics();

        return {
            daily: this.dailyStatus,
            wheel: this.wheelConfig,
            stats: this.statistics
        };
    }

    // LEGACY: Delegate to service
    async loadStatuses() {
        const result = await this.service.loadUserBonusData();

        // Sync legacy properties
        this.dailyStatus = result.dailyStatus;
        this.wheelStatus = result.wheelStatus;
        this.statistics = result.statistics;

        return result;
    }

    // LEGACY: Delegate to service with animation
    async claimDailyBonus() {
        try {
            Utils.showLoader(true);
            const result = await this.service.claimDailyBonus();

            // Show animation using helper
            this.helpers.showBonusAnimation(result.bonus_amount, 'bonus');

            Utils.showNotification(
                window.app.t('bonuses.claimed').replace('{amount}', result.bonus_amount),
                'success'
            );

            return result;
        } catch (error) {
            console.error('Claim daily bonus error:', error);
            Utils.showNotification(
                error.message || window.app.t('bonuses.claimError'),
                'error'
            );
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    // LEGACY: Delegate to wheel game
    async openWheel() {
        await wheelGame.init();
        wheelGame.open();
    }

    // LEGACY: Delegate to service
    async spinWheel(isFree = true) {
        return this.service.spinWheel(isFree);
    }

    // LEGACY: Delegate to API
    async getWheelHistory(limit = 10) {
        return this.api.getWheelHistory(limit);
    }

    // LEGACY: Delegate to API
    async getWheelLeaderboard(limit = 10) {
        return this.api.getWheelLeaderboard(limit);
    }

    // LEGACY: Show bonus animation - delegate to helper
    showBonusAnimation(amount) {
        this.helpers.showBonusAnimation(amount, 'bonus');
    }

    // LEGACY: Create daily bonus HTML using component
    createDailyBonusHTML() {
        const dailyStatus = this.service.store.getDailyStatus();

        const component = new DailyBonusComponent(
            dailyStatus,
            () => this.claimDailyBonus()
        );

        // Set global reference for event handlers
        window.dailyBonusComponent = component;

        return component.render();
    }

    // LEGACY: Create statistics HTML using component
    createStatisticsHTML() {
        const statistics = this.service.store.getStatistics();
        const component = new BonusStatisticsComponent(statistics);
        return component.render();
    }
}

// LEGACY: Create and export singleton
const bonuses = new BonusesModule();

// LEGACY: Maintain backward compatibility
window.bonuses = bonuses;

export default bonuses;