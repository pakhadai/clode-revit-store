// js/services/AdminPromocodesService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminPromocodesService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
    }

    async loadPromocodes() {
        try {
            Utils.showLoader(true);
            const response = await this.api.getPromocodes();
            this.store.setPromocodes(response.promocodes);
            return response;
        } catch (error) {
            console.error('Load promocodes error:', error);
            Utils.showNotification(window.app?.t('admin.errors.promocodesLoad') || 'Помилка завантаження промокодів', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async createPromocode(data) {
        try {
            await this.api.createPromocode(data);
            Utils.showNotification(window.app?.t('admin.notifications.promocodeCreated') || 'Промокод створено', 'success');
            await this.loadPromocodes();
            return true;
        } catch (error) {
            console.error('Create promocode error:', error);
            Utils.showNotification(window.app?.t('admin.errors.promocodeCreate') || 'Помилка створення промокоду', 'error');
            throw error;
        }
    }

    async deletePromocode(id) {
        if (!confirm(window.app?.t('admin.confirmations.deletePromocode') || 'Видалити промокод?')) {
            return false;
        }

        try {
            await this.api.deletePromocode(id);
            Utils.showNotification(window.app?.t('admin.notifications.promocodeDeleted') || 'Промокод видалено', 'success');
            await this.loadPromocodes();
            return true;
        } catch (error) {
            console.error('Delete promocode error:', error);
            Utils.showNotification(window.app?.t('admin.errors.promocodeDelete') || 'Помилка видалення промокоду', 'error');
            throw error;
        }
    }

    getPromocodes() {
        return this.store.getPromocodes();
    }

    validatePromocode(code, value, type) {
        if (!code || code.length < 3) {
            Utils.showNotification(window.app?.t('admin.validations.promocodeLength') || 'Код має бути не менше 3 символів', 'error');
            return false;
        }

        if (!value || value <= 0) {
            Utils.showNotification(window.app?.t('admin.validations.promocodeValue') || 'Вкажіть коректне значення знижки', 'error');
            return false;
        }

        if (type === 'percent' && value > 100) {
            Utils.showNotification(window.app?.t('admin.validations.promocodePercent') || 'Відсоток не може бути більше 100', 'error');
            return false;
        }

        return true;
    }
}

window.AdminPromocodesService = AdminPromocodesService;
export default AdminPromocodesService;