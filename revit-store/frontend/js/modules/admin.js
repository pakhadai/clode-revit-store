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
        this.currentTab = 'dashboard';
        this.userFilters = {};
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
            await this.loadUsers(); // Перезавантажуємо список після оновлення
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
        // Запускаємо завантаження даних для першої вкладки
        if(this.currentTab === 'dashboard' && !this.dashboard) {
            this.loadDashboard();
        }

        return `
            <div class="admin-panel max-w-7xl mx-auto">
                <div class="header bg-gradient-to-r from-red-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
                    <h1 class="text-3xl font-bold mb-4">👑 Адмін панель</h1>
                    <p class="opacity-90">Повний контроль над платформою OhMyRevit</p>
                </div>

                <div class="tabs bg-white dark:bg-gray-800 rounded-lg mb-6">
                    <div class="flex flex-wrap border-b dark:border-gray-700">
                        <button onclick="admin.showTab('dashboard')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'dashboard' ? 'border-b-2 border-red-500 text-red-600' : ''}"
                                data-tab="dashboard">
                            📊 Дашборд
                        </button>
                        <button onclick="admin.showTab('users')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'users' ? 'border-b-2 border-red-500 text-red-600' : ''}"
                                data-tab="users">
                            👥 Користувачі
                        </button>
                        <button onclick="admin.showTab('moderation')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'moderation' ? 'border-b-2 border-red-500 text-red-600' : ''}"
                                data-tab="moderation">
                            🔍 Модерація
                            ${this.moderation?.length > 0 ? `<span class="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">${this.moderation.length}</span>` : ''}
                        </button>
                        <button onclick="admin.showTab('promocodes')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'promocodes' ? 'border-b-2 border-red-500 text-red-600' : ''}"
                                data-tab="promocodes">
                            🏷️ Промокоди
                        </button>
                        <button onclick="admin.showTab('broadcast')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'broadcast' ? 'border-b-2 border-red-500 text-red-600' : ''}"
                                data-tab="broadcast">
                            📢 Розсилка
                        </button>
                    </div>

                    <div class="tab-content p-6" id="admin-tab-content">
                        ${this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Показати вкладку
     */
    async showTab(tab) {
        this.currentTab = tab;

        // Оновлюємо UI вкладок
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = this.createAdminPage();
        } else {
            // fallback if page-content is not found
            this.updateActiveTabButton(tab);
        }

        // Завантажуємо дані для нової вкладки
        switch(tab) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'moderation':
                await this.loadModeration();
                break;
            case 'promocodes':
                await this.loadPromocodes();
                break;
            case 'broadcast':
                this.updateBroadcastUI();
                break;
        }
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
                                            ${user.is_creator ? '<span class="badge bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Creator</span>' : ''}
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        ${user.is_blocked ?
                                            '<span class="text-red-500">🚫 Blocked</span>' :
                                            '<span class="text-green-500">✅ Active</span>'
                                        }
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-2">
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
     * Рендер модерації
     */
    renderModeration() {
        if (this.moderation.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">✅</div>
                    <h3 class="text-xl font-bold mb-4 dark:text-white">Немає товарів на модерації</h3>
                    <p class="text-gray-600 dark:text-gray-400">Всі товари перевірені!</p>
                </div>
            `;
        }

        return `
            <div class="moderation-queue">
                <div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                    <p class="text-yellow-800 dark:text-yellow-200">
                        ⚠️ На модерації: ${this.moderation.length} товарів
                    </p>
                </div>

                <div class="space-y-6">
                    ${this.moderation.map(product => `
                        <div class="moderation-item bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="col-span-2">
                                    <div class="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 class="text-xl font-bold dark:text-white">
                                                ${product.title.en || product.title}
                                            </h3>
                                            <p class="text-sm text-gray-500">SKU: ${product.sku}</p>
                                        </div>
                                        <div class="text-2xl font-bold text-blue-600">
                                            ${Utils.formatPrice(product.price)}
                                        </div>
                                    </div>

                                    <div class="mb-4">
                                        <h4 class="font-medium mb-2 dark:text-gray-300">Опис:</h4>
                                        <p class="text-gray-700 dark:text-gray-400">
                                            ${product.description.en || product.description}
                                        </p>
                                    </div>

                                    <div class="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <span class="text-sm text-gray-500">Категорія:</span>
                                            <span class="ml-2 font-medium dark:text-white">${product.category}</span>
                                        </div>
                                        <div>
                                            <span class="text-sm text-gray-500">Тип:</span>
                                            <span class="ml-2 font-medium dark:text-white">${product.product_type}</span>
                                        </div>
                                    </div>

                                    ${product.creator ? `
                                        <div class="creator-info bg-gray-50 dark:bg-gray-700 rounded p-3 mb-4">
                                            <span class="text-sm text-gray-500">Творець:</span>
                                            <span class="ml-2 font-medium dark:text-white">
                                                ${product.creator.full_name} (@${product.creator.username})
                                            </span>
                                        </div>
                                    ` : ''}

                                    <div class="actions flex gap-3">
                                        <button onclick="admin.approveProduct(${product.id})"
                                                class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
                                            ✅ Схвалити
                                        </button>
                                        <button onclick="admin.showRejectDialog(${product.id})"
                                                class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold">
                                            ❌ Відхилити
                                        </button>
                                        <button onclick="admin.previewProduct(${product.id})"
                                                class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">
                                            👁️ Переглянути
                                        </button>
                                    </div>
                                </div>

                                <div class="preview-images">
                                    <h4 class="font-medium mb-2 dark:text-gray-300">Превʼю:</h4>
                                    <div class="grid grid-cols-2 gap-2">
                                        ${product.preview_images?.map(img => `
                                            <img src="${img}" alt="Preview"
                                                 class="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                                                 onclick="admin.showImageModal('${img}')">
                                        `).join('') || '<p class="text-gray-500">Немає превʼю</p>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
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
     * Показати діалог відхилення
     */
    showRejectDialog(productId) {
        const reason = prompt('Вкажіть причину відхилення:');
        if (reason) {
            this.rejectProduct(productId, reason);
        }
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
}

// Створюємо та експортуємо єдиний екземпляр
const admin = new AdminModule();
window.admin = admin;

export default admin;