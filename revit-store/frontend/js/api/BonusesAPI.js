// js/api/BonusesAPI.js
export class BonusesAPI {
    constructor(apiClient) {
        this.api = apiClient || window.api;
    }

    // Daily Bonus endpoints
    async getDailyBonusStatus() {
        return this.api.get('/bonuses/daily/status');
    }

    async claimDailyBonus() {
        return this.api.post('/bonuses/daily/claim');
    }

    // Wheel of Fortune endpoints
    async getWheelConfig() {
        return this.api.get('/bonuses/wheel/config');
    }

    async getWheelStatus() {
        return this.api.get('/bonuses/wheel/status');
    }

    async spinWheel(isFree = true) {
        return this.api.post('/bonuses/wheel/spin', { is_free: isFree });
    }

    async getWheelHistory(limit = 10) {
        return this.api.get('/bonuses/wheel/history', { limit });
    }

    async getWheelLeaderboard(limit = 10) {
        return this.api.get('/bonuses/wheel/leaderboard', { limit });
    }

    // Statistics endpoints
    async getBonusStatistics() {
        return this.api.get('/bonuses/statistics');
    }

    // Referral bonuses
    async getReferralBonuses() {
        return this.api.get('/bonuses/referral');
    }
}

window.BonusesAPI = BonusesAPI;
export default BonusesAPI;