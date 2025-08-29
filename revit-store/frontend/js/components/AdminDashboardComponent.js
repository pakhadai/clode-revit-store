// js/components/AdminDashboardComponent.js
export class AdminDashboardComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    render() {
        if (!this.dashboard) {
            return `<div class="text-center">${window.app?.t('admin.dashboard.loading') || 'Завантаження дашборду...'}</div>`;
        }

        return `
            <div class="dashboard">
                ${this.renderStatCards()}
                ${this.renderAlerts()}
                ${this.renderCharts()}
                ${this.renderQuickStats()}
            </div>
        `;
    }

    renderStatCards() {
        const d = this.dashboard;

        return `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                ${this.renderStatCard(
                    'users',
                    window.app?.t('admin.dashboard.users') || 'Користувачі',
                    d.users.total,
                    `${window.app?.t('admin.dashboard.activeWeek') || 'Активні'}: ${d.users.active_week}`,
                    '👥',
                    'blue'
                )}
                ${this.renderStatCard(
                    'revenue',
                    window.app?.t('admin.dashboard.revenue') || 'Дохід',
                    Utils.formatPrice(d.orders.total_revenue),
                    `${window.app?.t('admin.dashboard.orders') || 'Замовлень'}: ${d.orders.completed}`,
                    '💰',
                    'green'
                )}
                ${this.renderStatCard(
                    'products',
                    window.app?.t('admin.dashboard.products') || 'Товари',
                    d.products.total,
                    `${window.app?.t('admin.dashboard.active') || 'Активні'}: ${d.products.active}`,
                    '📦',
                    'purple'
                )}
                ${this.renderStatCard(
                    'subscriptions',
                    window.app?.t('admin.dashboard.subscriptions') || 'Підписки',
                    d.subscriptions.active,
                    Utils.formatPrice(d.subscriptions.revenue),
                    '⭐',
                    'yellow'
                )}
            </div>
        `;
    }

    renderStatCard(id, title, value, subtitle, icon, color) {
        return `
            <div class="stat-card bg-${color}-50 dark:bg-${color}-900 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-${color}-600 dark:text-${color}-300 text-sm">${title}</div>
                        <div class="text-2xl font-bold dark:text-white">${value}</div>
                        <div class="text-xs text-gray-500">${subtitle}</div>
                    </div>
                    <span class="text-2xl">${icon}</span>
                </div>
            </div>
        `;
    }

    renderAlerts() {
        const d = this.dashboard;

        if (d.products.pending_moderation === 0) return '';

        return `
            <div class="alert bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⚠️</span>
                        <div>
                            <div class="font-bold text-yellow-800 dark:text-yellow-200">
                                ${window.app?.t('admin.dashboard.pendingModeration') || 'Товари на модерації'}
                            </div>
                            <div class="text-sm text-yellow-600 dark:text-yellow-300">
                                ${d.products.pending_moderation} ${window.app?.t('admin.dashboard.awaitingReview') || 'товарів очікують перевірки'}
                            </div>
                        </div>
                    </div>
                    <button onclick="admin.showTab('moderation')"
                            class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg">
                        ${window.app?.t('buttons.view') || 'Переглянути'}
                    </button>
                </div>
            </div>
        `;
    }

    renderCharts() {
        const d = this.dashboard;

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="chart-card bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h3 class="font-bold mb-4 dark:text-white">${window.app?.t('admin.dashboard.revenueWeek') || 'Дохід за останній тиждень'}</h3>
                    <canvas id="revenue-chart" width="400" height="200"></canvas>
                </div>

                <div class="top-products bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h3 class="font-bold mb-4 dark:text-white">${window.app?.t('admin.dashboard.topProductsWeek') || 'Топ товари тижня'}</h3>
                    <div class="space-y-3">
                        ${d.top_products.map((product, idx) => this.renderTopProduct(product, idx)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderTopProduct(product, index) {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[index] || `${index + 1}.`;

        return `
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${medal}</span>
                    <div>
                        <div class="font-medium dark:text-white">${product.title}</div>
                        <div class="text-xs text-gray-500">${product.sku}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bold dark:text-white">${product.sales}</div>
                    <div class="text-xs text-gray-500">${window.app?.t('admin.dashboard.sales') || 'продажів'}</div>
                </div>
            </div>
        `;
    }

    renderQuickStats() {
        const d = this.dashboard;

        return `
            <div class="quick-stats grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                ${this.renderQuickStat(d.users.creators, window.app?.t('admin.dashboard.creators') || 'Творців')}
                ${this.renderQuickStat(d.users.blocked, window.app?.t('admin.dashboard.blocked') || 'Заблоковано')}
                ${this.renderQuickStat(d.products.total_downloads, window.app?.t('admin.dashboard.downloads') || 'Завантажень')}
                ${this.renderQuickStat(d.orders.total, window.app?.t('admin.dashboard.totalOrders') || 'Замовлень')}
            </div>
        `;
    }

    renderQuickStat(value, label) {
        return `
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-2xl font-bold dark:text-white">${value}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${label}</div>
            </div>
        `;
    }
}

window.AdminDashboardComponent = AdminDashboardComponent;
export default AdminDashboardComponent;