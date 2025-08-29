// js/services/AdminModerationService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminModerationService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
    }

    // Products Moderation
    async loadModeration() {
        try {
            Utils.showLoader(true);
            const response = await this.api.getModeration();
            this.store.setModeration(response.products);
            return response;
        } catch (error) {
            console.error('Load moderation error:', error);
            Utils.showNotification(window.app?.t('admin.errors.moderationLoad') || 'Помилка завантаження модерації', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async approveProduct(productId) {
        try {
            await this.api.approveProduct(productId);
            Utils.showNotification(window.app?.t('admin.notifications.productApproved') || 'Товар схвалено', 'success');
            await this.loadModeration();
        } catch (error) {
            console.error('Approve product error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productApprove') || 'Помилка схвалення товару', 'error');
            throw error;
        }
    }

    async rejectProduct(productId, reason) {
        try {
            await this.api.rejectProduct(productId, reason);
            Utils.showNotification(window.app?.t('admin.notifications.productRejected') || 'Товар відхилено', 'info');
            await this.loadModeration();
        } catch (error) {
            console.error('Reject product error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productReject') || 'Помилка відхилення товару', 'error');
            throw error;
        }
    }

    async sendForRevision(productId, notes) {
        try {
            await this.api.sendForRevision(productId, notes);
            Utils.showNotification(window.app?.t('admin.notifications.sentForRevision') || 'Відправлено на доопрацювання', 'info');
            await this.loadModeration();
        } catch (error) {
            console.error('Send for revision error:', error);
            Utils.showNotification(window.app?.t('admin.errors.revisionSend') || 'Помилка відправки на доопрацювання', 'error');
            throw error;
        }
    }

    // Creator Applications
    async loadCreatorApplications() {
        try {
            Utils.showLoader(true);
            const response = await this.api.getCreatorApplications({ status: 'pending' });
            this.store.setCreatorApplications(response);
            return response;
        } catch (error) {
            console.error('Load creator applications error:', error);
            Utils.showNotification(window.app?.t('admin.errors.applicationsLoad') || 'Помилка завантаження заявок', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async approveCreatorApplication(appId) {
        if (!confirm(window.app?.t('admin.confirmations.approveCreator') || 'Підтвердити заявку і надати статус творця?')) {
            return false;
        }

        try {
            await this.api.approveCreatorApplication(appId);
            Utils.showNotification(window.app?.t('admin.notifications.creatorApproved') || 'Заявку схвалено', 'success');
            await this.loadCreatorApplications();
            return true;
        } catch (error) {
            console.error('Approve creator application error:', error);
            Utils.showNotification(window.app?.t('admin.errors.creatorApprove') || 'Помилка схвалення заявки', 'error');
            throw error;
        }
    }

    async rejectCreatorApplication(appId, reason) {
        try {
            const response = await this.api.rejectCreatorApplication(appId, reason);
            if (response.success) {
                Utils.showNotification(window.app?.t('admin.notifications.creatorRejected') || 'Заявку відхилено', 'info');
                await this.loadCreatorApplications();
            }
            return response;
        } catch (error) {
            console.error('Reject creator application error:', error);
            Utils.showNotification(window.app?.t('admin.errors.creatorReject') || 'Помилка відхилення заявки', 'error');
            throw error;
        }
    }

    getModeration() {
        return this.store.getModeration();
    }

    getCreatorApplications() {
        return this.store.getCreatorApplications();
    }

    getTotalPendingCount() {
        const products = this.store.getModeration()?.length || 0;
        const applications = this.store.getCreatorApplications()?.length || 0;
        return products + applications;
    }
}

window.AdminModerationService = AdminModerationService;
export default AdminModerationService;