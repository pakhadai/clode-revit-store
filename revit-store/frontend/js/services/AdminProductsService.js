// js/services/AdminProductsService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminProductsService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
    }

    async loadProducts(page = 1, search = '') {
        try {
            Utils.showLoader(true);
            const response = await this.api.getAdminProducts({ page, search });
            this.store.setProducts(response.products);
            return response;
        } catch (error) {
            console.error('Load admin products error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productsLoad') || 'Помилка завантаження товарів', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async createProduct(formData) {
        try {
            Utils.showLoader(true);
            await this.api.createProduct(formData);
            Utils.showNotification(window.app?.t('admin.notifications.productCreated') || 'Товар створено', 'success');
            await this.loadProducts();
            return true;
        } catch (error) {
            console.error('Create product error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productCreate') || 'Помилка створення товару', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async updateProduct(productId, data) {
        try {
            Utils.showLoader(true);
            await this.api.updateProduct(productId, data);
            Utils.showNotification(window.app?.t('admin.notifications.productUpdated') || 'Товар оновлено', 'success');
            await this.loadProducts();
            return true;
        } catch (error) {
            console.error('Update product error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productUpdate') || 'Помилка оновлення товару', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async deleteProduct(productId) {
        if (!confirm(window.app?.t('admin.confirmations.deleteProduct') || 'Ви впевнені, що хочете видалити цей товар? Цю дію неможливо скасувати.')) {
            return false;
        }

        try {
            await this.api.deleteProduct(productId);
            Utils.showNotification(window.app?.t('admin.notifications.productDeleted') || 'Товар видалено', 'success');
            await this.loadProducts();
            return true;
        } catch (error) {
            console.error('Delete product error:', error);
            Utils.showNotification(window.app?.t('admin.errors.productDelete') || 'Помилка видалення товару', 'error');
            throw error;
        }
    }

    getProducts() {
        return this.store.getProducts();
    }

    async getProductById(productId) {
        try {
            return await this.api.get(`/admin/products/${productId}`);
        } catch (error) {
            Utils.showNotification(window.app?.t('admin.errors.productLoadById') || 'Не вдалося завантажити дані товару', 'error');
            throw error;
        }
    }

    formatProductData(formData) {
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'title_en') data['title'] = { en: value, ua: value, ru: value };
            else if (key === 'description_en') data['description'] = { en: value, ua: value, ru: value };
            else if (key === 'tags') data['tags'] = value.split(',').map(t => t.trim());
            else if (key !== 'product_id' && key !== 'archive_file' && key !== 'preview_images') {
                data[key] = value;
            }
        }
        return data;
    }
}

window.AdminProductsService = AdminProductsService;
export default AdminProductsService;