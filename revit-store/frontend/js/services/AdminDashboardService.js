// js/services/AdminDashboardService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminDashboardService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
    }

    async loadDashboard() {
        try {
            Utils.showLoader(true);
            const response = await this.api.getDashboard();
            this.store.setDashboard(response);
            return response;
        } catch (error) {
            console.error('Load dashboard error:', error);
            Utils.showNotification(window.app?.t('admin.errors.dashboardLoad') || 'Помилка завантаження дашборду', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    getDashboardData() {
        return this.store.getDashboard();
    }

    getStatistics() {
        const dashboard = this.store.getDashboard();
        if (!dashboard) return null;

        return {
            users: dashboard.users,
            orders: dashboard.orders,
            products: dashboard.products,
            subscriptions: dashboard.subscriptions
        };
    }

    getTopProducts() {
        const dashboard = this.store.getDashboard();
        return dashboard?.top_products || [];
    }

    getRevenueChart() {
        const dashboard = this.store.getDashboard();
        return dashboard?.revenue_chart || [];
    }

    calculateGrowth(current, previous) {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous * 100).toFixed(1);
    }

    formatRevenue(cents) {
        return Utils.formatPrice(cents);
    }
}

window.AdminDashboardService = AdminDashboardService;
export default AdminDashboardService;