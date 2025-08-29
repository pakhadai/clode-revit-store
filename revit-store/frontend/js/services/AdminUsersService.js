// js/services/AdminUsersService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminUsersService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
        this.currentFilters = {};
    }

    async loadUsers(filters = {}) {
        try {
            Utils.showLoader(true);
            this.currentFilters = { ...this.currentFilters, ...filters };
            const response = await this.api.getUsers(this.currentFilters);
            this.store.setUsers(response.users);
            return response;
        } catch (error) {
            console.error('Load users error:', error);
            Utils.showNotification(window.app?.t('admin.errors.usersLoad') || 'Помилка завантаження користувачів', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async updateUser(userId, data) {
        try {
            Utils.showLoader(true);
            const response = await this.api.updateUser(userId, data);
            Utils.showNotification(window.app?.t('admin.notifications.userUpdated') || 'Користувача оновлено', 'success');
            await this.loadUsers(this.currentFilters);
            return response;
        } catch (error) {
            console.error('Update user error:', error);
            Utils.showNotification(window.app?.t('admin.errors.userUpdate') || 'Помилка оновлення користувача', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async deleteUser(userId) {
        if (!confirm(window.app?.t('admin.confirmations.deleteUser') || 'УВАГА! Ця дія повністю видалить користувача та всі пов\'язані дані без можливості відновлення. Продовжити?')) {
            return false;
        }

        try {
            Utils.showLoader(true);
            const response = await this.api.deleteUser(userId);
            Utils.showNotification(response.message || window.app?.t('admin.notifications.userDeleted') || 'Користувача видалено', 'success');
            await this.loadUsers(this.currentFilters);
            return response;
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showNotification(window.app?.t('admin.errors.userDelete') || 'Помилка видалення користувача', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async toggleUserBlock(userId, block) {
        return this.updateUser(userId, { is_blocked: block });
    }

    async toggleCreatorStatus(userId, isCreator) {
        if (!confirm(window.app?.t('admin.confirmations.toggleCreator') || `Ви впевнені, що хочете ${isCreator ? 'надати' : 'забрати'} статус творця?`)) {
            return false;
        }
        return this.updateUser(userId, { is_creator: isCreator });
    }

    async grantSubscription(userId, planType, days = null) {
        try {
            const data = days ? { plan_type: 'custom', days } : { plan_type: planType };
            await this.api.grantSubscription(userId, data);
            Utils.showNotification(window.app?.t('admin.notifications.subscriptionGranted') || 'Підписку видано', 'success');
            return true;
        } catch (error) {
            console.error('Grant subscription error:', error);
            Utils.showNotification(window.app?.t('admin.errors.subscriptionGrant') || 'Помилка видачі підписки', 'error');
            throw error;
        }
    }

    getUsers() {
        return this.store.getUsers();
    }

    searchUsers(query) {
        return this.loadUsers({ search: query, page: 1 });
    }

    filterUsers(key, value) {
        return this.loadUsers({ [key]: value, page: 1 });
    }
}

window.AdminUsersService = AdminUsersService;
export default AdminUsersService;