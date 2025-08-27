// js/services/NotificationService.js (скорочено)
export class NotificationService {
    constructor(app) {
        this.app = app;
    }

    showNotifications() {
        // Моковані сповіщення для демонстрації
        const notifications = [
            {
                id: 1,
                type: 'bonus',
                icon: '🎁',
                title: 'Щоденний бонус доступний!',
                message: 'Не забудьте отримати свій щоденний бонус',
                time: new Date().toISOString(),
                read: false
            },
            {
                id: 2,
                type: 'product',
                icon: '✅',
                title: 'Товар схвалено',
                message: 'Ваш товар "Modern Furniture Pack" було схвалено та опубліковано',
                time: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: 3,
                type: 'sale',
                icon: '💰',
                title: 'Новий продаж!',
                message: 'Користувач придбав ваш товар "Kitchen Set Pro"',
                time: new Date(Date.now() - 86400000).toISOString(),
                read: true
            },
            {
                id: 4,
                type: 'subscription',
                icon: '⭐',
                title: 'Підписка закінчується',
                message: 'Ваша підписка закінчиться через 3 дні',
                time: new Date(Date.now() - 172800000).toISOString(),
                read: true
            }
        ];

        const unreadCount = notifications.filter(n => !n.read).length;

        const modal = document.createElement('div');
        modal.id = 'notifications-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div class="p-6 border-b dark:border-gray-700">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold dark:text-white">
                            🔔 Сповіщення ${unreadCount > 0 ? `(${unreadCount})` : ''}
                        </h3>
                        <button onclick="document.getElementById('notifications-modal').remove()"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-2xl">
                            ×
                        </button>
                    </div>

                    ${unreadCount > 0 ? `
                        <button onclick="app.markAllAsRead()"
                                class="mt-3 text-sm text-blue-500 hover:text-blue-600">
                            Позначити всі як прочитані
                        </button>
                    ` : ''}
                </div>

                <div class="flex-1 overflow-y-auto">
                    ${notifications.length > 0 ? `
                        <div class="divide-y dark:divide-gray-700">
                            ${notifications.map(notif => `
                                <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
                                            ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                                     onclick="app.handleNotificationClick(${notif.id})">
                                    <div class="flex gap-3">
                                        <div class="text-2xl flex-shrink-0">${notif.icon}</div>
                                        <div class="flex-1">
                                            <div class="font-medium dark:text-white ${!notif.read ? 'font-bold' : ''}">
                                                ${notif.title}
                                            </div>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                ${notif.message}
                                            </p>
                                            <div class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                                ${this.formatNotificationTime(notif.time)}
                                            </div>
                                        </div>
                                        ${!notif.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-16">
                            <div class="text-5xl mb-4">📭</div>
                            <p class="text-gray-600 dark:text-gray-400">${this.t('notifications.noNotifications')}</p>
                        </div>
                    `}
                </div>

                <div class="p-4 border-t dark:border-gray-700">
                    <button onclick="app.clearAllNotifications()"
                            class="w-full text-center text-sm text-red-500 hover:text-red-600">
                        Очистити всі сповіщення
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    formatNotificationTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Щойно';
        if (minutes < 60) return `${minutes} хв. тому`;
        if (hours < 24) return `${hours} год. тому`;
        if (days < 7) return `${days} ${Utils.pluralize(days, ['день', 'дні', 'днів'])} тому`;

        return date.toLocaleDateString('uk-UA');
    }

    handleNotificationClick(notificationId) {
        // Позначаємо як прочитане
        console.log('Notification clicked:', notificationId);

        // Закриваємо модальне вікно
        document.getElementById('notifications-modal')?.remove();

        // Тут можна додати навігацію до відповідної сторінки
        // залежно від типу сповіщення
    }

    markAllAsRead() {
        console.log('Marking all notifications as read');
        this.showNotifications();
    }

    clearAllNotifications() {
        console.log('Clearing all notifications');
        document.getElementById('notifications-modal')?.remove();
        Utils.showNotification('Сповіщення очищено', 'info');
    }
}