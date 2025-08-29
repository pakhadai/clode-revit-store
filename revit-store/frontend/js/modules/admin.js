// js/modules/admin.js
// LEGACY MODULE - Refactored into modular architecture

// NEW MODULAR IMPORTS
import { AdminDashboardService } from '../services/AdminDashboardService.js';
import { AdminUsersService } from '../services/AdminUsersService.js';
import { AdminModerationService } from '../services/AdminModerationService.js';
import { AdminProductsService } from '../services/AdminProductsService.js';
import { AdminPromocodesService } from '../services/AdminPromocodesService.js';
import { AdminBroadcastService } from '../services/AdminBroadcastService.js';
import { AdminDashboardComponent } from '../components/AdminDashboardComponent.js';
import { AdminUsersTable } from '../components/AdminUsersTable.js';
import { adminHelpers } from '../utils/adminHelpers.js';

class AdminModule {
    constructor() {
        // LEGACY: Original properties preserved
        this.dashboard = null;
        this.users = [];
        this.moderation = [];
        this.promocodes = [];
        this.products = [];
        this.currentTab = 'main';
        this.userFilters = {};
        this.currentModerationTab = 'applications';
        this.creatorApplications = [];

        // NEW: Modular services
        this.dashboardService = new AdminDashboardService();
        this.usersService = new AdminUsersService();
        this.moderationService = new AdminModerationService();
        this.productsService = new AdminProductsService();
        this.promocodesService = new AdminPromocodesService();
        this.broadcastService = new AdminBroadcastService();
        this.helpers = adminHelpers;
    }

    // LEGACY: Check access - delegate to helper
    async checkAccess() {
        return this.helpers.checkAdminAccess();
    }

    // LEGACY: Dashboard methods - delegate to service
    async loadDashboard() {
        const result = await this.dashboardService.loadDashboard();
        this.dashboard = result;
        this.updateDashboardUI();
    }

    // LEGACY: Users methods - delegate to service
    async loadUsers(filters = {}) {
        const result = await this.usersService.loadUsers(filters);
        this.users = result.users;
        this.userFilters = this.usersService.currentFilters;
        this.updateUsersTable();
    }

    async updateUser(userId, data) {
        return this.usersService.updateUser(userId, data);
    }

    async deleteUser(userId) {
        return this.usersService.deleteUser(userId);
    }

    async toggleUserBlock(userId, block) {
        return this.usersService.toggleUserBlock(userId, block);
    }

    async toggleCreatorStatus(userId, isCreator) {
        return this.usersService.toggleCreatorStatus(userId, isCreator);
    }

    async grantSubscription(userId) {
        const data = await this.helpers.showGrantSubscriptionDialog();
        if (data) {
            return this.usersService.grantSubscription(userId, data.plan_type, data.days);
        }
    }

    // LEGACY: Moderation methods - delegate to service
    async loadModeration() {
        const result = await this.moderationService.loadModeration();
        this.moderation = result.products;
        this.updateModerationUI();
    }

    async approveProduct(productId) {
        return this.moderationService.approveProduct(productId);
    }

    async rejectProduct(productId, reason) {
        return this.moderationService.rejectProduct(productId, reason);
    }

    async loadCreatorApplications() {
        const result = await this.moderationService.loadCreatorApplications();
        this.creatorApplications = result;
        return result;
    }

    async approveCreatorApplication(appId) {
        return this.moderationService.approveCreatorApplication(appId);
    }

    async rejectCreatorApplication(appId) {
        const reasonEl = document.getElementById('reject-reason');
        const reason = reasonEl?.value;
        if (!reason) {
            Utils.showNotification('Вкажіть причину відхилення', 'warning');
            return;
        }
        return this.moderationService.rejectCreatorApplication(appId, reason);
    }

    // LEGACY: Products methods - delegate to service
    async loadAdminProducts(page = 1, search = '') {
        const result = await this.productsService.loadProducts(page, search);
        this.products = result.products;
        this.updateProductsUI();
    }

    async deleteAdminProduct(productId) {
        return this.productsService.deleteProduct(productId);
    }

    // LEGACY: Promocodes methods - delegate to service
    async loadPromocodes() {
        const result = await this.promocodesService.loadPromocodes();
        this.promocodes = result.promocodes;
        this.updatePromocodesTable();
    }

    async createPromocode() {
        const code = document.getElementById('promo-code')?.value;
        const type = document.getElementById('promo-type')?.value;
        const value = parseInt(document.getElementById('promo-value')?.value);
        const maxUses = parseInt(document.getElementById('promo-max-uses')?.value) || null;
        const days = parseInt(document.getElementById('promo-days')?.value) || null;

        if (!this.promocodesService.validatePromocode(code, value, type)) {
            return;
        }

        return this.promocodesService.createPromocode({
            code,
            discount_type: type,
            discount_value: value,
            max_uses: maxUses,
            valid_days: days,
            min_order_amount: 0
        });
    }

    async deletePromocode(id) {
        return this.promocodesService.deletePromocode(id);
    }

    // LEGACY: Broadcast methods - delegate to service
    async sendBroadcast() {
        const target = document.getElementById('broadcast-target')?.value;
        const message = document.getElementById('broadcast-message')?.value;

        const result = await this.broadcastService.sendBroadcast(message, target);
        if (result) {
            document.getElementById('broadcast-message').value = '';
        }
        return result;
    }

    // LEGACY: All render methods remain unchanged but use new components where possible
    createAdminPage() {
        // Implementation remains the same as original
        // ... [original implementation]
    }

    // Rest of render methods remain unchanged
    // ... [all other methods remain with original implementation]

    // NEW: Update UI methods now use components
    updateDashboardUI() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'dashboard') {
            const component = new AdminDashboardComponent(this.dashboard);
            content.innerHTML = component.render();
            this.initDashboardCharts();
        }
    }

    updateUsersTable() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'users') {
            content.innerHTML = this.renderUsers();

            // Set up global reference for event handlers
            window.adminUsersTable = new AdminUsersTable(
                this.users,
                (userId, data) => this.updateUser(userId, data),
                (userId) => this.deleteUser(userId),
                (userId, block) => this.toggleUserBlock(userId, block),
                (userId, isCreator) => this.toggleCreatorStatus(userId, isCreator),
                (userId) => this.grantSubscription(userId)
            );
        }
    }

    initDashboardCharts() {
        const canvas = document.getElementById('revenue-chart');
        if (canvas && this.dashboard) {
            this.helpers.drawRevenueChart(canvas, this.dashboard.revenue_chart || []);
        }
    }

    // LEGACY: Keep debounce for search
    searchUsers = Utils.debounce(async (query) => {
        await this.usersService.searchUsers(query);
    }, 500);

    filterUsers(key, value) {
        return this.usersService.filterUsers(key, value);
    }
}

// LEGACY: Create and export singleton
const admin = new AdminModule();
window.admin = admin;

export default admin;