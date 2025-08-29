// js/services/AdminBroadcastService.js
import { AdminAPI } from '../api/AdminAPI.js';
import { AdminStore } from '../store/AdminStore.js';

export class AdminBroadcastService {
    constructor() {
        this.api = new AdminAPI();
        this.store = new AdminStore();
    }

    async sendBroadcast(message, target) {
        if (!message) {
            Utils.showNotification(window.app?.t('admin.validations.broadcastMessage') || 'Введіть повідомлення', 'warning');
            return false;
        }

        if (!confirm(window.app?.t('admin.confirmations.sendBroadcast') || `Відправити розсилку для "${target}"?`)) {
            return false;
        }

        try {
            Utils.showLoader(true);
            const response = await this.api.sendBroadcast({ message, target });
            const successMessage = window.app?.t('admin.notifications.broadcastSent') || 'Розсилку відправлено: {sent}/{total}';
            Utils.showNotification(
                successMessage
                    .replace('{sent}', response.stats.sent)
                    .replace('{total}', response.stats.total),
                'success'
            );
            return response;
        } catch (error) {
            console.error('Broadcast error:', error);
            Utils.showNotification(window.app?.t('admin.errors.broadcastSend') || 'Помилка розсилки', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    async loadBroadcastHistory() {
        try {
            const response = await this.api.getBroadcastHistory();
            this.store.setBroadcastHistory(response);
            return response;
        } catch (error) {
            console.error('Load broadcast history error:', error);
            throw error;
        }
    }

    getBroadcastHistory() {
        return this.store.getBroadcastHistory();
    }

    getBroadcastTargets() {
        return [
            { value: 'all', label: window.app?.t('admin.broadcast.targets.all') || 'Всі користувачі' },
            { value: 'users', label: window.app?.t('admin.broadcast.targets.users') || 'Тільки користувачі' },
            { value: 'creators', label: window.app?.t('admin.broadcast.targets.creators') || 'Тільки творці' },
            { value: 'subscribers', label: window.app?.t('admin.broadcast.targets.subscribers') || 'Тільки підписники' }
        ];
    }
}

window.AdminBroadcastService = AdminBroadcastService;
export default AdminBroadcastService;