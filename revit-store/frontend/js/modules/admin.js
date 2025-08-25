/**
 * Модуль адмін панелі
 * Повний контроль над платформою
 */

class AdminModule {
    constructor() {
        this.dashboard = null;
        this.users = [];
        this.moderation = [];
        this.promocodes = [];
        this.products = [];
        this.currentTab = 'main';
        this.userFilters = {};
        this.currentModerationTab = 'applications';
        this.creatorApplications = [];
    }

    /**
     * Перевірка доступу адміна
     */
    async checkAccess() {
        if (!auth.isAuthenticated() || !auth.isAdmin()) {
            Utils.showNotification('Доступ тільки для адміністраторів', 'error');
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
            return false;
        }
        return true;
    }

    /**
     * Завантажити дашборд
     */
    async loadDashboard() {
        try {
            Utils.showLoader(true);
            const response = await api.get('/admin/dashboard');
            this.dashboard = response;
            this.updateDashboardUI(); // Оновлюємо UI після завантаження
        } catch (error) {
            console.error('Load dashboard error:', error);
            Utils.showNotification('Помилка завантаження дашборду', 'error');
            // throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Завантажити користувачів
     */
    async loadUsers(filters = {}) {
        try {
            Utils.showLoader(true);
            this.userFilters = { ...this.userFilters, ...filters };
            const response = await api.get('/admin/users', this.userFilters);
            this.users = response.users;
            this.updateUsersTable(); // Оновлюємо UI після завантаження
        } catch (error) {
            console.error('Load users error:', error);
            Utils.showNotification('Помилка завантаження користувачів', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Оновити користувача
     */
    async updateUser(userId, data) {
        try {
            Utils.showLoader(true);
            const response = await api.put(`/admin/users/${userId}`, data);
            Utils.showNotification('Користувача оновлено', 'success');
            await this.loadUsers();
            return response;
        } catch (error) {
            console.error('Update user error:', error);
            Utils.showNotification('Помилка оновлення користувача', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Завантажити чергу модерації
     */
    async loadModeration() {
        try {
            Utils.showLoader(true);
            const response = await api.get('/admin/moderation');
            this.moderation = response.products;
            this.updateModerationUI(); // Оновлюємо UI після завантаження
        } catch (error) {
            console.error('Load moderation error:', error);
            Utils.showNotification('Помилка завантаження модерації', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Схвалити товар
     */
    async approveProduct(productId) {
        try {
            await api.post(`/admin/moderation/${productId}/approve`);
            Utils.showNotification('Товар схвалено', 'success');
            await this.loadModeration();
        } catch (error) {
            console.error('Approve product error:', error);
            Utils.showNotification('Помилка схвалення товару', 'error');
        }
    }

    /**
     * Відхилити товар
     */
    async rejectProduct(productId, reason) {
        try {
            await api.post(`/admin/moderation/${productId}/reject`, { reason });
            Utils.showNotification('Товар відхилено', 'info');
            await this.loadModeration();
        } catch (error) {
            console.error('Reject product error:', error);
            Utils.showNotification('Помилка відхилення товару', 'error');
        }
    }

    /**
     * Створити сторінку адмін панелі
     */
    createAdminPage() {
        // Запускаємо завантаження даних, якщо це потрібно
        if (this.currentTab === 'dashboard' && !this.dashboard) {
            this.loadDashboard();
        }

        const mainContent = this.currentTab === 'main'
            ? this.renderMainMenu()
            : this.renderTabContent();

        const backButton = this.currentTab !== 'main'
            ? `<button onclick="admin.showTab('main')"
                        class="absolute top-6 left-6 flex items-center gap-2 text-white hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    Назад
                </button>`
            : '';

        return `
            <div class="admin-panel max-w-7xl mx-auto">
                <div class="header bg-gradient-to-r from-red-500 to-purple-600 rounded-2xl p-8 text-white mb-8 relative">
                    ${backButton}
                    <div class="text-center">
                        <h1 class="text-3xl font-bold mb-2">👑 Адмін Панель</h1>
                        <p class="opacity-90">Повний контроль над платформою OhMyRevit</p>
                    </div>
                </div>

                <div class="admin-content p-4" id="admin-tab-content">
                    ${mainContent}
                </div>
            </div>
        `;
    }

    renderMainMenu() {
        const pendingProductsCount = this.moderation?.length || 0;
        const pendingAppsCount = this.creatorApplications?.length || 0;
        const totalPending = pendingProductsCount + pendingAppsCount;

        const createMenuButton = (tab, icon, title, notificationCount = 0) => {
            const notificationBadge = notificationCount > 0
                ? `<span class="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">${notificationCount}</span>`
                : '';

            return `
                <button onclick="admin.showTab('${tab}')" class="admin-menu-button relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg hover:-translate-y-1 transition-transform text-center">
                    <div class="text-5xl mb-3">${icon}</div>
                    <div class="font-semibold text-lg dark:text-white">${title}</div>
                    ${notificationBadge}
                </button>
            `;
        };

        return `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                ${createMenuButton('dashboard', '📊', 'Дашборд')}
                ${createMenuButton('users', '👥', 'Користувачі')}
                ${createMenuButton('products', '🛍️', 'Товари')}
                ${createMenuButton('moderation', '🔍', 'Модерація', totalPending)}
                ${createMenuButton('promocodes', '🏷️', 'Промокоди')}
                ${createMenuButton('broadcast', '📢', 'Розсилка')}
            </div>
        `;
    }

    /**
     * Показати вкладку
     */
    async showTab(tab) {
        this.currentTab = tab;

        // 1. Повністю перемальовуємо структуру адмін-панелі.
        // Функція createAdminPage сама визначить, чи показати головне меню (для tab='main'),
        // чи контейнер для вмісту вкладки.
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = this.createAdminPage();
        }

        // 2. Якщо ми перейшли на головне меню, нічого більше робити не потрібно.
        if (tab === 'main') {
            // Завантажимо актуальні дані для бейджів модерації в фоні
            this.loadCreatorApplications();
            this.loadModeration();
            return;
        }

        // 3. Якщо ми перейшли на конкретну вкладку, завантажуємо для неї дані.
        const contentContainer = document.getElementById('admin-tab-content');
        if (!contentContainer) return;

        // Показуємо індикатор завантаження, поки дані вантажаться
        contentContainer.innerHTML = '<div class="text-center p-8">Завантаження...</div>';

        // 4. Завантажуємо дані в залежності від вкладки
        switch (tab) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'products':
                await this.loadAdminProducts();
                break;
            case 'moderation':
                this.initModeration();
                // Послідовно завантажуємо дані для обох підвкладок
                await this.loadCreatorApplications();
                await this.loadModeration();
                // Відображаємо першу підвкладку
                this.showModerationSubTab(this.currentModerationTab);
                break;
            case 'promocodes':
                await this.loadPromocodes();
                break;
            case 'broadcast':
                // Ця вкладка не потребує завантаження даних, просто оновлюємо UI
                this.updateBroadcastUI();
                break;
        }

        // 5. Функції завантаження (loadDashboard, loadUsers і т.д.) тепер самі оновлюють свій контент.
        // Наприклад, updateDashboardUI() викликається всередині loadDashboard().
        // Це робить код чистішим і надійнішим.
    }

    updateActiveTabButton(activeTab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === activeTab) {
                btn.classList.add('border-b-2', 'border-red-500', 'text-red-600');
            } else {
                btn.classList.remove('border-b-2', 'border-red-500', 'text-red-600');
            }
        });
    }

    /**
     * Рендер контенту вкладки
     */
     renderTabContent() {
        switch (this.currentTab) {
            case 'dashboard':
                return this.renderDashboard();
            case 'users':
                return this.renderUsers();
            case 'products':
                return this.renderAdminProducts();
            case 'moderation':
                return this.renderModeration();
            case 'promocodes':
                return this.renderPromocodes();
            case 'broadcast':
                return this.renderBroadcast();
            default:
                return '<div class="text-center">Завантаження...</div>';
        }
    }

    /**
     * Рендер дашборду
     */
     renderDashboard() {
        if (!this.dashboard) {
            return '<div class="text-center">Завантаження дашборду...</div>';
        }

        const d = this.dashboard;

        return `
            <div class="dashboard">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div class="stat-card bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-blue-600 dark:text-blue-300 text-sm">Користувачі</div>
                                <div class="text-2xl font-bold dark:text-white">${d.users.total}</div>
                                <div class="text-xs text-gray-500">
                                    Активні: ${d.users.active_week}
                                </div>
                            </div>
                            <span class="text-2xl">👥</span>
                        </div>
                    </div>

                    <div class="stat-card bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-green-600 dark:text-green-300 text-sm">Дохід</div>
                                <div class="text-2xl font-bold dark:text-white">
                                    ${Utils.formatPrice(d.orders.total_revenue)}
                                </div>
                                <div class="text-xs text-gray-500">
                                    Замовлень: ${d.orders.completed}
                                </div>
                            </div>
                            <span class="text-2xl">💰</span>
                        </div>
                    </div>

                    <div class="stat-card bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-purple-600 dark:text-purple-300 text-sm">Товари</div>
                                <div class="text-2xl font-bold dark:text-white">${d.products.total}</div>
                                <div class="text-xs text-gray-500">
                                    Активні: ${d.products.active}
                                </div>
                            </div>
                            <span class="text-2xl">📦</span>
                        </div>
                    </div>

                    <div class="stat-card bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-yellow-600 dark:text-yellow-300 text-sm">Підписки</div>
                                <div class="text-2xl font-bold dark:text-white">${d.subscriptions.active}</div>
                                <div class="text-xs text-gray-500">
                                    ${Utils.formatPrice(d.subscriptions.revenue)}
                                </div>
                            </div>
                            <span class="text-2xl">⭐</span>
                        </div>
                    </div>
                </div>

                ${d.products.pending_moderation > 0 ? `
                    <div class="alert bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">⚠️</span>
                                <div>
                                    <div class="font-bold text-yellow-800 dark:text-yellow-200">
                                        Товари на модерації
                                    </div>
                                    <div class="text-sm text-yellow-600 dark:text-yellow-300">
                                        ${d.products.pending_moderation} товарів очікують перевірки
                                    </div>
                                </div>
                            </div>
                            <button onclick="admin.showTab('moderation')"
                                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg">
                                Переглянути
                            </button>
                        </div>
                    </div>
                ` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="chart-card bg-white dark:bg-gray-800 rounded-lg p-6">
                        <h3 class="font-bold mb-4 dark:text-white">Дохід за останній тиждень</h3>
                        <canvas id="revenue-chart" width="400" height="200"></canvas>
                    </div>

                    <div class="top-products bg-white dark:bg-gray-800 rounded-lg p-6">
                        <h3 class="font-bold mb-4 dark:text-white">Топ товари тижня</h3>
                        <div class="space-y-3">
                            ${d.top_products.map((product, idx) => `
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-2">
                                        <span class="text-lg">
                                            ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                                        </span>
                                        <div>
                                            <div class="font-medium dark:text-white">${product.title}</div>
                                            <div class="text-xs text-gray-500">${product.sku}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-bold dark:text-white">${product.sales}</div>
                                        <div class="text-xs text-gray-500">продажів</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="quick-stats grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold dark:text-white">${d.users.creators}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Творців</div>
                    </div>
                    <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold dark:text-white">${d.users.blocked}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Заблоковано</div>
                    </div>
                    <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold dark:text-white">${d.products.total_downloads}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Завантажень</div>
                    </div>
                    <div class="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold dark:text-white">${d.orders.total}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Замовлень</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер користувачів
     */
     renderUsers() {
        return `
            <div class="users-management">
                <div class="filters bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" id="user-search" placeholder="Пошук користувача..."
                               class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-800 dark:text-white"
                               onkeyup="admin.searchUsers(this.value)" value="${this.userFilters.search || ''}">

                        <select id="role-filter" onchange="admin.filterUsers('role', this.value)"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       dark:bg-gray-800 dark:text-white">
                            <option value="" ${!this.userFilters.role ? 'selected' : ''}>Всі ролі</option>
                            <option value="users" ${this.userFilters.role === 'users' ? 'selected' : ''}>Користувачі</option>
                            <option value="creators" ${this.userFilters.role === 'creators' ? 'selected' : ''}>Творці</option>
                            <option value="admins" ${this.userFilters.role === 'admins' ? 'selected' : ''}>Адміни</option>
                        </select>

                        <select id="status-filter" onchange="admin.filterUsers('status', this.value)"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       dark:bg-gray-800 dark:text-white">
                            <option value="" ${!this.userFilters.status ? 'selected' : ''}>Всі статуси</option>
                            <option value="active" ${this.userFilters.status === 'active' ? 'selected' : ''}>Активні</option>
                            <option value="blocked" ${this.userFilters.status === 'blocked' ? 'selected' : ''}>Заблоковані</option>
                        </select>

                        <button onclick="admin.loadUsers()"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                            🔄 Оновити
                        </button>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b dark:border-gray-700">
                                <th class="text-left py-3 px-4">ID</th>
                                <th class="text-left py-3 px-4">Користувач</th>
                                <th class="text-left py-3 px-4">Баланс</th>
                                <th class="text-left py-3 px-4">VIP</th>
                                <th class="text-left py-3 px-4">Ролі</th>
                                <th class="text-left py-3 px-4">Статус</th>
                                <th class="text-left py-3 px-4">Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.map(user => `
                                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="py-3 px-4">${user.id}</td>
                                    <td class="py-3 px-4">
                                        <div>
                                            <div class="font-medium dark:text-white">${user.full_name}</div>
                                            <div class="text-xs text-gray-500">@${user.username || `id${user.telegram_id}`}</div>
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        <input type="number" value="${user.balance}"
                                               id="balance-${user.id}"
                                               class="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:text-white">
                                    </td>
                                    <td class="py-3 px-4">
                                        <select id="vip-${user.id}"
                                                class="px-2 py-1 border rounded dark:bg-gray-800 dark:text-white">
                                            <option value="0" ${user.vip_level === 0 ? 'selected' : ''}>None</option>
                                            <option value="1" ${user.vip_level === 1 ? 'selected' : ''}>🥉 Bronze</option>
                                            <option value="2" ${user.vip_level === 2 ? 'selected' : ''}>🥈 Silver</option>
                                            <option value="3" ${user.vip_level === 3 ? 'selected' : ''}>🥇 Gold</option>
                                            <option value="4" ${user.vip_level === 4 ? 'selected' : ''}>💎 Diamond</option>
                                        </select>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-1">
                                            ${user.is_admin ? '<span class="badge bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Admin</span>' : ''}
                                            <button onclick="admin.toggleCreatorStatus(${user.id}, ${!user.is_creator})"
                                                    class="badge ${user.is_creator ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}
                                                           px-2 py-1 rounded text-xs hover:opacity-80"
                                                    title="Змінити статус творця">
                                                ${user.is_creator ? '🎨 Creator' : '👤 User'}
                                            </button>
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        ${user.is_blocked ?
                                            '<span class="text-red-500">🚫 Blocked</span>' :
                                            '<span class="text-green-500">✅ Active</span>'
                                        }
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-2 text-xl">
                                            <button onclick="admin.saveUserChanges(${user.id})"
                                                    class="text-blue-500 hover:text-blue-600" title="Зберегти">
                                                💾
                                            </button>
                                            <button onclick="admin.toggleUserBlock(${user.id}, ${!user.is_blocked})"
                                                    class="text-${user.is_blocked ? 'green' : 'red'}-500" title="${user.is_blocked ? 'Розблокувати' : 'Заблокувати'}">
                                                ${user.is_blocked ? '🔓' : '🔒'}
                                            </button>
                                            <button onclick="admin.grantSubscription(${user.id})"
                                                    class="text-purple-500" title="Видати підписку">
                                                ⭐
                                            </button>
                                            <button onclick="admin.deleteUser(${user.id})"
                                                    class="text-red-600 hover:text-red-800" title="Видалити з БД">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Рендер модерації з двома вкладками
     */
    renderModeration() {
        return `
            <div class="moderation-section">
                <!-- Підвкладки модерації -->
                <div class="sub-tabs flex border-b dark:border-gray-700 mb-6">
                    <button onclick="admin.showModerationSubTab('applications')"
                            class="sub-tab-btn px-6 py-3 font-medium ${this.currentModerationTab === 'applications' ? 'border-b-2 border-orange-500 text-orange-600' : ''}"
                            data-subtab="applications">
                        👥 Заявки творців
                        ${this.creatorApplications?.length > 0 ?
                            `<span class="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">${this.creatorApplications.length}</span>` : ''}
                    </button>
                    <button onclick="admin.showModerationSubTab('products')"
                            class="sub-tab-btn px-6 py-3 font-medium ${this.currentModerationTab === 'products' ? 'border-b-2 border-orange-500 text-orange-600' : ''}"
                            data-subtab="products">
                        📦 Модерація товарів
                        ${this.moderation?.length > 0 ?
                            `<span class="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">${this.moderation.length}</span>` : ''}
                    </button>
                </div>

                <!-- Контент підвкладки -->
                <div id="moderation-subtab-content">
                    ${this.currentModerationTab === 'applications' ?
                        this.renderCreatorApplications() :
                        this.renderProductModeration()}
                </div>
            </div>
        `;
    }

    /**
     * Рендер заявок творців
     */
    renderCreatorApplications() {
        if (!this.creatorApplications || this.creatorApplications.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">👥</div>
                    <h3 class="text-xl font-bold mb-4 dark:text-white">Немає заявок на розгляд</h3>
                    <p class="text-gray-600 dark:text-gray-400">Нові заявки творців з'являться тут</p>
                </div>
            `;
        }

        return `
            <div class="applications-list space-y-4">
                ${this.creatorApplications.map(app => {
                    // Безпечне отримання даних користувача
                    const user = app.user || {};
                    const firstName = user.first_name || '';
                    const lastName = user.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || 'Невідомий користувач';
                    const username = user.username || `user_${user.telegram_id || app.user_id}`;
                    const telegramId = user.telegram_id || 'Не вказано';
                    const photoUrl = user.photo_url;

                    return `
                    <div class="application-card bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div class="flex gap-6">
                            <!-- Інформація про користувача -->
                            <div class="user-info flex-shrink-0">
                                ${photoUrl ?
                                    `<img src="${photoUrl}" alt="${firstName}"
                                          class="w-20 h-20 rounded-full object-cover">` :
                                    `<div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
                                        ${firstName?.[0] || '👤'}
                                    </div>`
                                }
                            </div>

                            <!-- Основна інформація -->
                            <div class="flex-1">
                                <div class="mb-4">
                                    <h3 class="text-xl font-bold dark:text-white">
                                        ${fullName}
                                    </h3>
                                    <p class="text-sm text-gray-500">
                                        @${username}
                                    </p>
                                    <p class="text-xs text-gray-400">
                                        Telegram ID: ${telegramId}
                                    </p>
                                </div>

                                <!-- Текст заявки -->
                                <div class="mb-4">
                                    <h4 class="font-medium mb-2 dark:text-gray-300">Про себе:</h4>
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded p-3">
                                        <p class="text-gray-700 dark:text-gray-300">${app.about_me || 'Не вказано'}</p>
                                    </div>
                                </div>

                                ${app.portfolio_url ? `
                                    <div class="mb-4">
                                        <h4 class="font-medium mb-2 dark:text-gray-300">Портфоліо:</h4>
                                        <a href="${app.portfolio_url}" target="_blank"
                                           class="text-blue-500 hover:text-blue-600 underline">
                                            ${app.portfolio_url}
                                        </a>
                                    </div>
                                ` : ''}

                                <!-- Дата подачі -->
                                <div class="text-sm text-gray-500 mb-4">
                                    Подано: ${app.created_at ? new Date(app.created_at).toLocaleDateString('uk-UA') : 'Невідома дата'}
                                </div>

                                <!-- Кнопки дій -->
                                <div class="flex gap-3">
                                    <button onclick="admin.approveCreatorApplication(${app.id})"
                                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
                                        ✅ Підтвердити
                                    </button>
                                    <button onclick="admin.showRejectCreatorDialog(${app.id})"
                                            class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold">
                                        ❌ Відхилити
                                    </button>
                                    <a href="https://t.me/${username !== `user_${telegramId}` ? username : telegramId}" target="_blank"
                                       class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold inline-flex items-center">
                                        ✈️ Написати
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Рендер модерації товарів
     */
    renderProductModeration() {
        if (!this.moderation || this.moderation.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">✅</div>
                    <h3 class="text-xl font-bold mb-4 dark:text-white">Немає товарів на модерації</h3>
                    <p class="text-gray-600 dark:text-gray-400">Всі товари перевірені!</p>
                </div>
            `;
        }

        return `
            <div class="products-moderation space-y-6">
                ${this.moderation.map(product => `
                    <div class="moderation-item bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Основна інформація -->
                            <div class="col-span-2">
                                <div class="mb-4">
                                    <h3 class="text-2xl font-bold dark:text-white mb-2">
                                        ${product.title.en || product.title}
                                    </h3>
                                    <div class="flex gap-4 text-sm text-gray-500">
                                        <span>SKU: ${product.sku}</span>
                                        <span>Категорія: ${product.category}</span>
                                        <span>Тип: ${product.product_type}</span>
                                    </div>
                                </div>

                                <!-- Опис -->
                                <div class="mb-4">
                                    <h4 class="font-medium mb-2 dark:text-gray-300">Опис:</h4>
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded p-4">
                                        <p class="text-gray-700 dark:text-gray-300">
                                            ${product.description.en || product.description}
                                        </p>
                                    </div>
                                </div>

                                <!-- Ціна та деталі -->
                                <div class="grid grid-cols-2 gap-4 mb-4">
                                    <div class="bg-blue-50 dark:bg-blue-900 rounded p-3">
                                        <span class="text-sm text-gray-600 dark:text-gray-400">Ціна:</span>
                                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            ${Utils.formatPrice(product.price)}
                                        </div>
                                    </div>
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded p-3">
                                        <span class="text-sm text-gray-600 dark:text-gray-400">Теги:</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            ${(product.tags || []).map(tag =>
                                                `<span class="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">#${tag}</span>`
                                            ).join('')}
                                        </div>
                                    </div>
                                </div>

                                <!-- Інформація про творця -->
                                ${product.creator ? `
                                    <div class="creator-info bg-purple-50 dark:bg-purple-900 rounded p-3 mb-4">
                                        <span class="text-sm text-gray-600 dark:text-gray-400">Творець:</span>
                                        <div class="font-medium dark:text-white">
                                            ${product.creator.full_name}
                                            <span class="text-gray-500">(@${product.creator.username})</span>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Кнопки дій -->
                                <div class="flex flex-wrap gap-3">
                                    <button onclick="admin.downloadArchiveForReview(${product.id})"
                                            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold">
                                        📥 Завантажити архів
                                    </button>
                                    <button onclick="admin.approveProduct(${product.id})"
                                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
                                        ✅ Розмістити на маркетплейсі
                                    </button>
                                    <button onclick="admin.showRevisionDialog(${product.id})"
                                            class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold">
                                        ✏️ На доопрацювання
                                    </button>
                                    <button onclick="admin.showRejectDialog(${product.id})"
                                            class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold">
                                        ❌ Відхилити
                                    </button>
                                </div>
                            </div>

                            <!-- Превʼю зображення -->
                            <div>
                                <h4 class="font-medium mb-3 dark:text-gray-300">Превʼю зображення:</h4>
                                <div class="space-y-2">
                                    ${product.preview_images?.map(img => `
                                        <img src="${img}" alt="Preview"
                                             class="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                             onclick="admin.showImageModal('${img}')">
                                    `).join('') || '<p class="text-gray-500">Немає превʼю</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Рендер промокодів
     */
    renderPromocodes() {
        return `
            <div class="promocodes-management">
                <div class="mb-6">
                    <button onclick="admin.showCreatePromoDialog()"
                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                        ➕ Створити промокод
                    </button>
                </div>

                <div class="promocodes-list">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b dark:border-gray-700">
                                <th class="text-left py-3 px-4">Код</th>
                                <th class="text-left py-3 px-4">Знижка</th>
                                <th class="text-left py-3 px-4">Використань</th>
                                <th class="text-left py-3 px-4">Мін. сума</th>
                                <th class="text-left py-3 px-4">Дійсний до</th>
                                <th class="text-left py-3 px-4">Статус</th>
                                <th class="text-left py-3 px-4">Дії</th>
                            </tr>
                        </thead>
                        <tbody id="promocodes-tbody">
                            <tr>
                                <td colspan="7" class="text-center py-8 text-gray-500">
                                    Завантаження промокодів...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Рендер розсилки
     */
     renderBroadcast() {
        return `
            <div class="broadcast max-w-2xl mx-auto">
                <h3 class="text-2xl font-bold mb-6 dark:text-white">📢 Масова розсилка через Telegram</h3>

                <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Цільова аудиторія
                        </label>
                        <select id="broadcast-target"
                                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       dark:bg-gray-700 dark:text-white">
                            <option value="all">Всі користувачі</option>
                            <option value="users">Тільки користувачі</option>
                            <option value="creators">Тільки творці</option>
                            <option value="subscribers">Тільки підписники</option>
                        </select>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Повідомлення
                        </label>
                        <textarea id="broadcast-message" rows="6"
                                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                         dark:bg-gray-700 dark:text-white"
                                  placeholder="Введіть текст повідомлення..."></textarea>
                        <p class="text-xs text-gray-500 mt-1">
                            Можна використовувати Telegram markdown: *bold*, _italic_, \`code\`
                        </p>
                    </div>

                    <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                        <p class="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Увага! Розсилка буде відправлена всім користувачам вибраної категорії.
                            Переконайтесь у правильності повідомлення.
                        </p>
                    </div>

                    <button onclick="admin.sendBroadcast()"
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                        📤 Відправити розсилку
                    </button>
                </div>

                <div class="history mt-8">
                    <h4 class="font-bold mb-4 dark:text-white">Історія розсилок</h4>
                    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                        Історія розсилок буде тут
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Ініціалізація графіків дашборду
     */
    initDashboardCharts() {
        const canvas = document.getElementById('revenue-chart');
        if (!canvas || !this.dashboard) return;

        const ctx = canvas.getContext('2d');
        const data = this.dashboard.revenue_chart || [];

        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('Немає даних', width / 2, height / 2);
            return;
        }

        const maxRevenue = Math.max(...data.map(d => d.revenue || 0));

        // Малюємо лінійний графік
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((point.revenue || 0) / maxRevenue) * (height - padding * 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Малюємо точки
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Підписи дат
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const date = new Date(point.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
            ctx.fillText(date, x, height - 10);
        });

        ctx.stroke();
    }

     updateDashboardUI() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'dashboard') {
            content.innerHTML = this.renderDashboard();
            this.initDashboardCharts();
        }
    }

    /**
     * Зберегти зміни користувача
     */
    async saveUserChanges(userId) {
        const balanceInput = document.getElementById(`balance-${userId}`);
        const vipInput = document.getElementById(`vip-${userId}`);

        const data = {
            balance: parseInt(balanceInput.value),
            vip_level: parseInt(vipInput.value)
        };

        await this.updateUser(userId, data);
    }

    /**
     * Блокування/розблокування користувача
     */
    async toggleUserBlock(userId, block) {
        await this.updateUser(userId, { is_blocked: block });
    }

    /**
     * Видати підписку
     */
    async grantSubscription(userId) {
        const plan = prompt('Виберіть план:\n1. monthly (30 днів)\n2. yearly (365 днів)\n3. Або введіть кількість днів');

        if (!plan) return;

        let data = {};
        if (plan === '1' || plan.toLowerCase() === 'monthly') {
            data = { plan_type: 'monthly' };
        } else if (plan === '2' || plan.toLowerCase() === 'yearly') {
            data = { plan_type: 'yearly' };
        } else {
            const days = parseInt(plan);
            if (isNaN(days) || days <= 0) {
                Utils.showNotification('Невірна кількість днів', 'error');
                return;
            }
            data = { plan_type: 'custom', days: days };
        }

        try {
            await api.post(`/admin/users/${userId}/subscription`, data);
            Utils.showNotification('Підписку видано', 'success');
        } catch (error) {
            console.error('Grant subscription error:', error);
            Utils.showNotification('Помилка видачі підписки', 'error');
        }
    }

    /**
     * Змінити статус творця
     */
    async toggleCreatorStatus(userId, isCreator) {
        if (!confirm(`Ви впевнені, що хочете ${isCreator ? 'надати' : 'забрати'} статус творця?`)) return;
        await this.updateUser(userId, { is_creator: isCreator });
    }

    /**
     * Видалити користувача
     */
    async deleteUser(userId) {
        if (!confirm('УВАГА! Ця дія повністю видалить користувача та всі пов\'язані дані без можливості відновлення. Продовжити?')) return;

        try {
            Utils.showLoader(true);
            const response = await api.delete(`/admin/users/${userId}`);
            Utils.showNotification(response.message, 'success');
            await this.loadUsers(); // Перезавантажуємо список
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showNotification('Помилка видалення користувача', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Показати діалог відхилення
     */
    showRejectDialog(productId) {
        const reason = prompt('Вкажіть причину відхилення:');
        if (reason) {
            this.rejectProduct(productId, reason);
        }
    }

    /**
     * Ініціалізація модерації
     */
    initModeration() {
        this.currentModerationTab = 'applications';
        this.creatorApplications = [];
        this.loadCreatorApplications();
    }

    /**
     * Показати підвкладку модерації
     */
    showModerationSubTab(tab) {
        this.currentModerationTab = tab;

        // Оновлюємо активну кнопку
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            if (btn.dataset.subtab === tab) {
                btn.classList.add('border-b-2', 'border-orange-500', 'text-orange-600');
            } else {
                btn.classList.remove('border-b-2', 'border-orange-500', 'text-orange-600');
            }
        });

        // Оновлюємо контент
        const content = document.getElementById('moderation-subtab-content');
        if (content) {
            if (tab === 'applications') {
                this.loadCreatorApplications().then(() => {
                    content.innerHTML = this.renderCreatorApplications();
                });
            } else {
                this.loadModeration().then(() => {
                    content.innerHTML = this.renderProductModeration();
                });
            }
        }
    }

    /**
     * Завантажити заявки творців
     */
    async loadCreatorApplications() {
        try {
            Utils.showLoader(true);
            const response = await api.get('/admin/creator-applications', { status: 'pending' });
            this.creatorApplications = response;
            return response;
        } catch (error) {
            console.error('Load creator applications error:', error);
            Utils.showNotification('Помилка завантаження заявок', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Схвалити заявку творця
     */
    async approveCreatorApplication(appId) {
        if (!confirm('Підтвердити заявку і надати статус творця?')) return;

        try {
            await api.post(`/admin/creator-applications/${appId}/approve`);
            Utils.showNotification('Заявку схвалено', 'success');
            await this.loadCreatorApplications();
            this.showModerationSubTab('applications');
        } catch (error) {
            console.error('Approve creator application error:', error);
            Utils.showNotification('Помилка схвалення заявки', 'error');
        }
    }

    /**
     * Показати діалог відхилення заявки творця
     */
    showRejectCreatorDialog(appId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 class="text-xl font-bold mb-4 dark:text-white">Відхилити заявку</h3>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                        Причина відхилення
                    </label>
                    <textarea id="reject-reason" rows="4"
                              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     dark:bg-gray-700 dark:text-white"
                              placeholder="Вкажіть причину відхилення заявки..."
                              required></textarea>
                </div>

                <div class="flex gap-3">
                    <button onclick="admin.rejectCreatorApplication(${appId})"
                            class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                        Відхилити
                    </button>
                    <button onclick="this.closest('.fixed').remove()"
                            class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
                        Скасувати
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

   /**
    * Відхилити заявку творця
    */
    async rejectCreatorApplication(appId) {
        const reason = document.getElementById('reject-reason')?.value;
        if (!reason) {
            Utils.showNotification('Вкажіть причину відхилення', 'warning');
            return;
        }

        try {
            // Відправляємо як JSON об'єкт
            const response = await api.post(`/admin/creator-applications/${appId}/reject`, {
                reason: reason  // Правильний формат даних
            });

            if (response.success) {
                Utils.showNotification('Заявку відхилено', 'info');
                document.querySelector('.fixed').remove();
                await this.loadCreatorApplications();
                this.showModerationSubTab('applications');
            }
        } catch (error) {
            console.error('Reject creator application error:', error);
            Utils.showNotification('Помилка відхилення заявки', 'error');
        }
    }

    /**
     * Показати діалог відправки на доопрацювання
     */
    showRevisionDialog(productId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 class="text-xl font-bold mb-4 dark:text-white">Відправити на доопрацювання</h3>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                        Що потрібно виправити?
                    </label>
                    <textarea id="revision-notes" rows="6"
                              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     dark:bg-gray-700 dark:text-white"
                              placeholder="Опишіть детально, що потрібно виправити або доопрацювати..."
                              required></textarea>
                </div>

                <div class="flex gap-3">
                    <button onclick="admin.sendForRevision(${productId})"
                            class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg">
                        Відправити
                    </button>
                    <button onclick="this.closest('.fixed').remove()"
                            class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
                        Скасувати
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Відправити товар на доопрацювання
     */
    async sendForRevision(productId) {
        const notes = document.getElementById('revision-notes')?.value;
        if (!notes) {
            Utils.showNotification('Вкажіть що потрібно виправити', 'warning');
            return;
        }

        try {
            await api.post(`/admin/moderation/${productId}/revision`, { notes });
            Utils.showNotification('Відправлено на доопрацювання', 'info');
            document.querySelector('.fixed').remove();
            await this.loadModeration();
            this.showModerationSubTab('products');
        } catch (error) {
            console.error('Send for revision error:', error);
            Utils.showNotification('Помилка відправки на доопрацювання', 'error');
        }
    }

    /**
     * Завантажити архів для перевірки
     */
    async downloadArchiveForReview(productId) {
        try {
            const product = this.moderation.find(p => p.id === productId);
            if (!product) return;

            // Використовуємо той самий механізм завантаження, що й для звичайних користувачів
            const downloadUrl = `${api.baseURL}/products/${productId}/download?token=${api.token}&admin_review=true`;
            window.open(downloadUrl, '_blank');
            Utils.showNotification('Завантаження архіву для перевірки', 'info');
        } catch (error) {
            console.error('Download for review error:', error);
            Utils.showNotification('Помилка завантаження архіву', 'error');
        }
    }

    showCreatorApplicationModal() {
        const modal = document.createElement('div');
        modal.id = 'creator-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full relative">
                <button onclick="document.getElementById('creator-modal').remove()" class="absolute top-3 right-3 text-2xl">&times;</button>
                <h2 class="text-2xl font-bold mb-4">Стати творцем OhMyRevit</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Поділіться своїми роботами та почніть заробляти. Розкажіть нам про себе та свій досвід.
                </p>
                <form id="creator-application-form">
                    <div class="mb-4">
                        <label for="about-me" class="block text-sm font-medium mb-1">Розкажіть про себе *</label>
                        <textarea id="about-me" name="about_me" rows="4" required class="w-full p-2 border rounded dark:bg-gray-700" placeholder="Ваш досвід у Revit..."></textarea>
                    </div>
                    <div class="mb-6">
                        <label for="portfolio-url" class="block text-sm font-medium mb-1">Посилання на портфоліо (необов'язково)</label>
                        <input type="url" id="portfolio-url" name="portfolio_url" class="w-full p-2 border rounded dark:bg-gray-700" placeholder="https://behance.net/yourname">
                    </div>
                    <div class="flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('creator-modal').remove()" class="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Скасувати</button>
                        <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">Відправити</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('creator-application-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await api.request('/creators/apply', {
                    method: 'POST',
                    body: formData
                });
                Utils.showNotification('Заявку успішно відправлено!', 'success');
                modal.remove();
            } catch (error) {
                Utils.showNotification(error.message, 'error');
            }
        });
    }

    /**
     * Показати модальне вікно зображення
     */
    showImageModal(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
        modal.onclick = () => modal.remove();
        modal.innerHTML = `
            <img src="${imageUrl}" alt="Preview" class="max-w-full max-h-full rounded-lg">
        `;
        document.body.appendChild(modal);
    }

    /**
     * Показати діалог створення промокоду
     */
    async showCreatePromoDialog() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 class="text-xl font-bold mb-4 dark:text-white">Створити промокод</h3>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1 dark:text-gray-300">Код</label>
                        <input type="text" id="promo-code" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1 dark:text-gray-300">Тип знижки</label>
                        <select id="promo-type" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                            <option value="percent">Відсоток</option>
                            <option value="fixed">Фіксована сума</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1 dark:text-gray-300">Значення</label>
                        <input type="number" id="promo-value" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1 dark:text-gray-300">Макс. використань</label>
                        <input type="number" id="promo-max-uses" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1 dark:text-gray-300">Дійсний (днів)</label>
                        <input type="number" id="promo-days" value="30" class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white">
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button onclick="admin.createPromocode()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                        Створити
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                        Скасувати
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Створити промокод
     */
    async createPromocode() {
        const code = document.getElementById('promo-code').value;
        const type = document.getElementById('promo-type').value;
        const value = parseInt(document.getElementById('promo-value').value);
        const maxUses = parseInt(document.getElementById('promo-max-uses').value) || null;
        const days = parseInt(document.getElementById('promo-days').value) || null;

        if (!code || !value) {
            Utils.showNotification('Заповніть всі поля', 'error');
            return;
        }

        try {
            await api.post('/admin/promocodes', {
                code: code,
                discount_type: type,
                discount_value: value,
                max_uses: maxUses,
                valid_days: days,
                min_order_amount: 0
            });

            Utils.showNotification('Промокод створено', 'success');
            document.querySelector('.fixed').remove();
            await this.loadPromocodes();
        } catch (error) {
            console.error('Create promocode error:', error);
        }
    }

    /**
     * Завантажити промокоди
     */
    async loadPromocodes() {
        try {
            Utils.showLoader(true);
            const response = await api.get('/admin/promocodes');
            this.promocodes = response.promocodes;
            this.updatePromocodesTable();
        } catch (error) {
            console.error('Load promocodes error:', error);
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Оновити таблицю промокодів
     */
    updatePromocodesTable() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'promocodes') {
            content.innerHTML = this.renderPromocodes(); // Спочатку рендеримо структуру
            const tbody = document.getElementById('promocodes-tbody');
            if (!tbody) return;

            if (this.promocodes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Немає промокодів</td></tr>`;
                return;
            }
            tbody.innerHTML = this.promocodes.map(promo => `
                <tr class="border-b dark:border-gray-700">
                    <td class="py-3 px-4 font-mono">${promo.code}</td>
                    <td class="py-3 px-4">
                        ${promo.discount_type === 'percent' ? `${promo.discount_value}%` : Utils.formatPrice(promo.discount_value)}
                    </td>
                    <td class="py-3 px-4">${promo.uses_count}/${promo.max_uses || '∞'}</td>
                    <td class="py-3 px-4">${Utils.formatPrice(promo.min_order_amount)}</td>
                    <td class="py-3 px-4">${promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Безстроково'}</td>
                    <td class="py-3 px-4">
                        ${promo.is_valid ? '<span class="text-green-500">✅ Активний</span>' : '<span class="text-red-500">❌ Неактивний</span>'}
                    </td>
                    <td class="py-3 px-4">
                        <button onclick="admin.deletePromocode(${promo.id})" class="text-red-500 hover:text-red-600">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    /**
     * Видалити промокод
     */
    async deletePromocode(id) {
        if (!confirm('Видалити промокод?')) return;

        try {
            await api.delete(`/admin/promocodes/${id}`);
            Utils.showNotification('Промокод видалено', 'success');
            await this.loadPromocodes();
        } catch (error) {
            console.error('Delete promocode error:', error);
        }
    }

    /**
     * Відправити розсилку
     */
    async sendBroadcast() {
        const target = document.getElementById('broadcast-target').value;
        const message = document.getElementById('broadcast-message').value;

        if (!message) {
            Utils.showNotification('Введіть повідомлення', 'warning');
            return;
        }

        if (!confirm(`Відправити розсилку для "${target}"?`)) return;

        try {
            Utils.showLoader(true);
            const response = await api.post('/admin/broadcast', { message, target });
            Utils.showNotification(`Розсилку відправлено: ${response.stats.sent}/${response.stats.total}`, 'success');
            document.getElementById('broadcast-message').value = '';
        } catch (error) {
            console.error('Broadcast error:', error);
            Utils.showNotification('Помилка розсилки', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    updateBroadcastUI() {
        const content = document.getElementById('admin-tab-content');
        if(content && this.currentTab === 'broadcast') {
            content.innerHTML = this.renderBroadcast();
        }
    }

    /**
     * Оновити UI модерації
     */
    updateModerationUI() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'moderation') {
            content.innerHTML = this.renderModeration();
        }
    }

    /**
     * Пошук користувачів
     */
    searchUsers = Utils.debounce(async (query) => {
        await this.loadUsers({ search: query, page: 1 });
    }, 500);

    /**
     * Фільтрувати користувачів
     */
    async filterUsers(key, value) {
        await this.loadUsers({ [key]: value, page: 1 });
    }

    /**
     * Оновити таблицю користувачів
     */
    updateUsersTable() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'users') {
            content.innerHTML = this.renderUsers();
        }
    }

    /**
     * Завантажити список всіх товарів
     */
    async loadAdminProducts(page = 1, search = '') {
        try {
            Utils.showLoader(true);
            const response = await api.get('/admin/products', { page, search });
            this.products = response.products;
            // Поки що не реалізовано пагінацію, але API її підтримує
            this.updateProductsUI();
        } catch (error) {
            console.error('Load admin products error:', error);
            Utils.showNotification('Помилка завантаження товарів', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Оновити UI для вкладки товарів
     */
    updateProductsUI() {
        const content = document.getElementById('admin-tab-content');
        if (content && this.currentTab === 'products') {
            content.innerHTML = this.renderAdminProducts();
        }
    }

    /**
     * Рендер вкладки "Товари"
     */
    renderAdminProducts() {
        return `
            <div class="admin-products-management">
                <h3 class="text-2xl font-bold mb-4 dark:text-white">Керування товарами</h3>
                <button onclick="admin.showProductFormModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold">
                    ➕ Додати товар
                </button>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b dark:border-gray-700">
                                <th class="text-left py-3 px-4">ID</th>
                                <th class="text-left py-3 px-4">Назва</th>
                                <th class="text-left py-3 px-4">Ціна</th>
                                <th class="text-left py-3 px-4">Статус</th>
                                <th class="text-left py-3 px-4">Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.products.map(product => `
                                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="py-3 px-4">${product.id}</td>
                                    <td class="py-3 px-4 font-medium dark:text-white">${product.title}</td>
                                    <td class="py-3 px-4">${Utils.formatPrice(product.price)}</td>
                                    <td class="py-3 px-4">
                                        <span class="px-2 py-1 rounded text-xs ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                                            ${product.is_active ? 'Активний' : 'Неактивний'}
                                        </span>
                                        <span class="px-2 py-1 rounded text-xs ${product.is_approved ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}">
                                            ${product.is_approved ? 'Схвалено' : 'На модерації'}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-2">
                                            <button onclick="admin.showEditProductDialog(${product.id})" class="text-blue-500 hover:text-blue-600" title="Редагувати">✏️</button>
                                            <button onclick="admin.deleteAdminProduct(${product.id})" class="text-red-500 hover:text-red-600" title="Видалити">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Показати діалог редагування товару
     */
    async showEditProductDialog(productId) {
        try {
            const product = await api.get(`/admin/products/${productId}`);
            this.showProductFormModal(product);
        } catch (error) {
            Utils.showNotification('Не вдалося завантажити дані товару', 'error');
        }
    }

    /**
     * Видалити товар з адмін-панелі
     */
    async deleteAdminProduct(productId) {
        if (!confirm('Ви впевнені, що хочете видалити цей товар? Цю дію неможливо скасувати.')) {
            return;
        }

        try {
            await api.delete(`/admin/products/${productId}`);
            Utils.showNotification('Товар видалено', 'success');
            await this.loadAdminProducts();
        } catch(error) {
            Utils.showNotification('Помилка видалення', 'error');
        }
    }

    /**
     * Показати модальне вікно форми товару (для створення/редагування)
     */
    showProductFormModal(product = null) {
        const isEdit = product !== null;
        const modalTitle = isEdit ? 'Редагувати товар' : 'Створити новий товар';
        const submitButtonText = isEdit ? 'Зберегти зміни' : 'Створити товар';

        const modal = document.createElement('div');
        modal.id = 'product-form-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold dark:text-white">${modalTitle}</h3>
                <button onclick="document.getElementById('product-form-modal').remove()" class="text-2xl">&times;</button>
            </div>

            <form id="admin-product-form">
                <input type="hidden" name="product_id" value="${isEdit ? product.id : ''}">

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Назва (EN)</label>
                        <input type="text" name="title_en" required class="w-full p-2 border rounded dark:bg-gray-700" value="${isEdit ? (product.title.en || '') : ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Опис (EN)</label>
                        <textarea name="description_en" required rows="3" class="w-full p-2 border rounded dark:bg-gray-700">${isEdit ? (product.description.en || '') : ''}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Ціна (в центах)</label>
                            <input type="number" name="price" required class="w-full p-2 border rounded dark:bg-gray-700" value="${isEdit ? product.price : '0'}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Категорія</label>
                            <select name="category" required class="w-full p-2 border rounded dark:bg-gray-700">
                                <option value="creator" ${isEdit && product.category === 'creator' ? 'selected' : ''}>Від творця</option>
                                <option value="premium" ${isEdit && product.category === 'premium' ? 'selected' : ''}>Преміум</option>
                                <option value="free" ${isEdit && product.category === 'free' ? 'selected' : ''}>Безкоштовно</option>
                            </select>
                        </div>
                    </div>
                     <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Тип товару</label>
                            <select name="product_type" required class="w-full p-2 border rounded dark:bg-gray-700">
                                <option value="furniture" ${isEdit && product.product_type === 'furniture' ? 'selected' : ''}>Меблі</option>
                                <option value="textures" ${isEdit && product.product_type === 'textures' ? 'selected' : ''}>Текстури</option>
                                <option value="components" ${isEdit && product.product_type === 'components' ? 'selected' : ''}>Компоненти</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Теги (через кому)</label>
                            <input type="text" name="tags" class="w-full p-2 border rounded dark:bg-gray-700" value="${isEdit ? (product.tags || []).join(', ') : ''}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Файл архіву ${isEdit ? '(залиште пустим, щоб не змінювати)' : ''}</label>
                        <input type="file" name="archive_file" ${!isEdit ? 'required' : ''} class="w-full p-2 border rounded dark:bg-gray-700">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Прев'ю зображення ${isEdit ? '(залиште пустим, щоб не змінювати)' : ''}</label>
                        <input type="file" name="preview_images" ${!isEdit ? 'required' : ''} multiple class="w-full p-2 border rounded dark:bg-gray-700">
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <button type="button" onclick="document.getElementById('product-form-modal').remove()" class="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Скасувати</button>
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">${submitButtonText}</button>
                </div>
            </form>
        </div>
        `;
        document.body.appendChild(modal);

        // Додаємо обробник відправки форми
        document.getElementById('admin-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductFormSubmit(e.target);
        });
    }

    /**
     * Обробка відправки форми товару
     */
    async handleProductFormSubmit(form) {
        const formData = new FormData(form);
        const productId = formData.get('product_id');

        // Видаляємо пусті файлові інпути, щоб не надсилати їх
        if (formData.get('archive_file') && formData.get('archive_file').size === 0) {
            formData.delete('archive_file');
        }
        if (formData.get('preview_images') && formData.get('preview_images').size === 0) {
            formData.delete('preview_images');
        }

        try {
            Utils.showLoader(true);
            if (productId) {
                // Редагування
                // API для оновлення з файлами - складніше, поки що оновимо тільки дані
                const dataToUpdate = {};
                for (let [key, value] of formData.entries()) {
                    if (key !== 'product_id' && key !== 'archive_file' && key !== 'preview_images') {
                       if (key === 'title_en') dataToUpdate['title'] = { en: value, ua: value, ru: value };
                       else if (key === 'description_en') dataToUpdate['description'] = { en: value, ua: value, ru: value };
                       else if (key === 'tags') dataToUpdate['tags'] = value.split(',').map(t => t.trim());
                       else dataToUpdate[key] = value;
                    }
                }
                await api.put(`/admin/products/${productId}`, dataToUpdate);
                Utils.showNotification('Товар оновлено', 'success');
            } else {
                // Створення
                await api.request('/admin/products', {
                    method: 'POST',
                    body: formData,
                    headers: {} // Скидаємо Content-Type для FormData
                });
                Utils.showNotification('Товар створено', 'success');
            }
            document.getElementById('product-form-modal').remove();
            await this.loadAdminProducts();
        } catch (error) {
            console.error('Product form submit error:', error);
            Utils.showNotification('Помилка збереження товару', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }
}

// Створюємо та експортуємо єдиний екземпляр
const admin = new AdminModule();
window.admin = admin;
