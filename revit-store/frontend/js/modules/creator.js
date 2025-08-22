/**
 * Модуль кабінету творця
 * Управління товарами та статистика
 */

class CreatorModule {
    constructor() {
        this.products = [];
        this.statistics = null;
        this.currentTab = 'products';
    }

    /**
     * Перевірка доступу творця
     */
    async checkAccess() {
        if (!auth.isAuthenticated() || !auth.isCreator()) {
            Utils.showNotification('Доступ тільки для творців', 'error');
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
            return false;
        }
        return true;
    }

    /**
     * Завантажити продукти творця
     */
    async loadProducts(status = null) {
        try {
            Utils.showLoader(true);

            const params = {};
            if (status) params.status = status;

            const response = await api.get('/creators/products', params);
            this.products = response.products;

            return response;
        } catch (error) {
            console.error('Load creator products error:', error);
            Utils.showNotification('Помилка завантаження товарів', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Завантажити статистику
     */
    async loadStatistics(period = 'month') {
        try {
            const response = await api.get('/creators/statistics', { period });
            this.statistics = response;
            return response;
        } catch (error) {
            console.error('Load statistics error:', error);
            Utils.showNotification('Помилка завантаження статистики', 'error');
            throw error;
        }
    }

    /**
     * Створити новий продукт
     */
    async createProduct(formData) {
        try {
            Utils.showLoader(true);

            const response = await api.request('/creators/products', {
                method: 'POST',
                body: formData,
                headers: {} // Не встановлюємо Content-Type для FormData
            });

            Utils.showNotification('Товар створено та відправлено на модерацію', 'success');
            return response;
        } catch (error) {
            console.error('Create product error:', error);
            Utils.showNotification('Помилка створення товару', 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Оновити продукт
     */
    async updateProduct(productId, data) {
        try {
            const response = await api.put(`/creators/products/${productId}`, data);
            Utils.showNotification('Товар оновлено', 'success');
            return response;
        } catch (error) {
            console.error('Update product error:', error);
            Utils.showNotification('Помилка оновлення товару', 'error');
            throw error;
        }
    }

    /**
     * Видалити продукт
     */
    async deleteProduct(productId) {
        try {
            const response = await api.delete(`/creators/products/${productId}`);
            Utils.showNotification(response.message, 'success');
            return response;
        } catch (error) {
            console.error('Delete product error:', error);
            Utils.showNotification('Помилка видалення товару', 'error');
            throw error;
        }
    }

    /**
     * Створити сторінку кабінету творця
     */
    createCreatorPage() {
        return `
            <div class="creator-dashboard max-w-7xl mx-auto">
                <div class="header bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white mb-8">
                    <h1 class="text-3xl font-bold mb-4">🎨 Кабінет творця</h1>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="stat-card bg-white/20 backdrop-blur rounded-lg p-4">
                            <div class="text-3xl font-bold">${this.statistics?.products?.total || 0}</div>
                            <div class="text-sm opacity-90">Товарів</div>
                        </div>
                        <div class="stat-card bg-white/20 backdrop-blur rounded-lg p-4">
                            <div class="text-3xl font-bold">${this.statistics?.sales?.total_sales || 0}</div>
                            <div class="text-sm opacity-90">Продажів</div>
                        </div>
                        <div class="stat-card bg-white/20 backdrop-blur rounded-lg p-4">
                            <div class="text-3xl font-bold">${Utils.formatPrice(this.statistics?.sales?.net_revenue || 0)}</div>
                            <div class="text-sm opacity-90">Заробіток</div>
                        </div>
                        <div class="stat-card bg-white/20 backdrop-blur rounded-lg p-4">
                            <div class="text-3xl font-bold">${this.statistics?.engagement?.average_rating || 0}⭐</div>
                            <div class="text-sm opacity-90">Рейтинг</div>
                        </div>
                    </div>
                </div>

                <div class="tabs bg-white dark:bg-gray-800 rounded-lg mb-6">
                    <div class="flex border-b dark:border-gray-700">
                        <button onclick="creator.showTab('products')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'products' ? 'border-b-2 border-purple-500 text-purple-600' : ''}"
                                data-tab="products">
                            📦 Мої товари
                        </button>
                        <button onclick="creator.showTab('add')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'add' ? 'border-b-2 border-purple-500 text-purple-600' : ''}"
                                data-tab="add">
                            ➕ Додати товар
                        </button>
                        <button onclick="creator.showTab('statistics')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'statistics' ? 'border-b-2 border-purple-500 text-purple-600' : ''}"
                                data-tab="statistics">
                            📊 Статистика
                        </button>
                        <button onclick="creator.showTab('withdrawals')"
                                class="tab-btn px-6 py-3 font-medium ${this.currentTab === 'withdrawals' ? 'border-b-2 border-purple-500 text-purple-600' : ''}"
                                data-tab="withdrawals">
                            💰 Виведення
                        </button>
                    </div>

                    <div class="tab-content p-6" id="creator-tab-content">
                        ${this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Показати вкладку
     */
    showTab(tab) {
        this.currentTab = tab;

        // Оновлюємо активну вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('border-b-2', 'border-purple-500', 'text-purple-600');
            } else {
                btn.classList.remove('border-b-2', 'border-purple-500', 'text-purple-600');
            }
        });

        // Рендеримо контент
        const content = document.getElementById('creator-tab-content');
        if (content) {
            content.innerHTML = this.renderTabContent();

            // Ініціалізуємо обробники для нової вкладки
            if (tab === 'add') {
                this.initProductForm();
            } else if (tab === 'statistics') {
                this.initStatisticsChart();
            }
        }
    }

    /**
     * Рендер контенту вкладки
     */
    renderTabContent() {
        switch (this.currentTab) {
            case 'products':
                return this.renderProductsList();
            case 'add':
                return this.renderAddProductForm();
            case 'statistics':
                return this.renderStatistics();
            case 'withdrawals':
                return this.renderWithdrawals();
            default:
                return '';
        }
    }

    /**
     * Рендер списку товарів
     */
    renderProductsList() {
        if (!this.products || this.products.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">📦</div>
                    <h3 class="text-xl font-bold mb-4 dark:text-white">У вас ще немає товарів</h3>
                    <button onclick="creator.showTab('add')"
                            class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-bold">
                        Додати перший товар
                    </button>
                </div>
            `;
        }

        return `
            <div class="products-list">
                <div class="filters mb-4 flex gap-2">
                    <button onclick="creator.filterProducts(null)"
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                        Всі (${this.products.length})
                    </button>
                    <button onclick="creator.filterProducts('approved')"
                            class="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                        Схвалені
                    </button>
                    <button onclick="creator.filterProducts('pending')"
                            class="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                        На модерації
                    </button>
                    <button onclick="creator.filterProducts('rejected')"
                            class="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                        Відхилені
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b dark:border-gray-700">
                                <th class="text-left py-3 px-4">SKU</th>
                                <th class="text-left py-3 px-4">Назва</th>
                                <th class="text-left py-3 px-4">Ціна</th>
                                <th class="text-left py-3 px-4">Статус</th>
                                <th class="text-left py-3 px-4">Продажі</th>
                                <th class="text-left py-3 px-4">Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.products.map(product => `
                                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="py-3 px-4">
                                        <code class="text-sm">${product.sku}</code>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="font-medium dark:text-white">
                                            ${product.title.en || product.title}
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        ${Utils.formatPrice(product.price)}
                                    </td>
                                    <td class="py-3 px-4">
                                        ${this.getStatusBadge(product)}
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="text-sm">
                                            <div>📥 ${product.downloads_count}</div>
                                            <div>👁 ${product.views_count}</div>
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="flex gap-2">
                                            <button onclick="creator.editProduct(${product.id})"
                                                    class="text-blue-500 hover:text-blue-600">
                                                ✏️
                                            </button>
                                            ${product.is_approved ? `
                                                <button onclick="creator.toggleProductStatus(${product.id}, ${!product.is_active})"
                                                        class="text-${product.is_active ? 'green' : 'gray'}-500">
                                                    ${product.is_active ? '✅' : '⏸️'}
                                                </button>
                                            ` : ''}
                                            <button onclick="creator.deleteProduct(${product.id})"
                                                    class="text-red-500 hover:text-red-600">
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
     * Рендер форми додавання товару
     */
    renderAddProductForm() {
        return `
            <div class="add-product-form max-w-4xl mx-auto">
                <h3 class="text-2xl font-bold mb-6 dark:text-white">Додати новий товар</h3>

                <form id="product-form" enctype="multipart/form-data">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Назва -->
                        <div class="col-span-2">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Назва товару *
                            </label>
                            <div class="space-y-2">
                                <input type="text" name="title_en" required
                                       class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                              dark:bg-gray-700 dark:text-white"
                                       placeholder="Title in English (обов'язково)">
                                <input type="text" name="title_ua"
                                       class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                              dark:bg-gray-700 dark:text-white"
                                       placeholder="Назва українською">
                                <input type="text" name="title_ru"
                                       class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                              dark:bg-gray-700 dark:text-white"
                                       placeholder="Название на русском">
                            </div>
                        </div>

                        <!-- Опис -->
                        <div class="col-span-2">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Опис товару *
                            </label>
                            <div class="space-y-2">
                                <textarea name="description_en" required rows="3"
                                          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                 dark:bg-gray-700 dark:text-white"
                                          placeholder="Description in English (обов'язково)"></textarea>
                                <textarea name="description_ua" rows="3"
                                          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                 dark:bg-gray-700 dark:text-white"
                                          placeholder="Опис українською"></textarea>
                                <textarea name="description_ru" rows="3"
                                          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                 dark:bg-gray-700 dark:text-white"
                                          placeholder="Описание на русском"></textarea>
                            </div>
                        </div>

                        <!-- Категорія та тип -->
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Категорія *
                            </label>
                            <select name="category" required
                                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                           dark:bg-gray-700 dark:text-white">
                                <option value="creator">🎨 Від творця</option>
                                <option value="premium">⭐ Преміум</option>
                                <option value="free">🆓 Безкоштовно</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Тип товару *
                            </label>
                            <select name="product_type" required
                                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                           dark:bg-gray-700 dark:text-white">
                                <option value="furniture">🪑 Меблі</option>
                                <option value="textures">🎨 Текстури</option>
                                <option value="components">🔧 Компоненти</option>
                            </select>
                        </div>

                        <!-- Ціна -->
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Ціна (USD) *
                            </label>
                            <input type="number" name="price" required min="0" step="0.01"
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="9.99">
                            <p class="text-xs text-gray-500 mt-1">Залиште 0 для безкоштовного товару</p>
                        </div>

                        <!-- Теги -->
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Теги
                            </label>
                            <input type="text" name="tags"
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="modern, classic, minimalism">
                            <p class="text-xs text-gray-500 mt-1">Розділяйте комами</p>
                        </div>

                        <!-- Архів -->
                        <div class="col-span-2">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Файл архіву * (ZIP, RAR, 7Z, max 500MB)
                            </label>
                            <input type="file" name="archive_file" required
                                   accept=".zip,.rar,.7z,.rvt"
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white">
                        </div>

                        <!-- Превʼю -->
                        <div class="col-span-2">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Превʼю зображення * (1-5 фото, JPG/PNG, max 10MB кожне)
                            </label>
                            <input type="file" name="preview_images" required multiple
                                   accept="image/jpeg,image/png,image/webp"
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white">
                            <div id="preview-container" class="grid grid-cols-5 gap-2 mt-2"></div>
                        </div>
                    </div>

                    <div class="mt-6 flex gap-4">
                        <button type="submit"
                                class="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-bold">
                            📤 Завантажити товар
                        </button>
                        <button type="button" onclick="creator.showTab('products')"
                                class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-8 py-3 rounded-lg font-bold">
                            Скасувати
                        </button>
                    </div>

                    <div class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                        <p class="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Після завантаження товар буде відправлено на модерацію.
                            Зазвичай перевірка займає 24-48 годин.
                        </p>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Рендер статистики
     */
    renderStatistics() {
        if (!this.statistics) {
            return '<div class="text-center">Завантаження статистики...</div>';
        }

        return `
            <div class="statistics">
                <div class="period-selector mb-6 flex gap-2">
                    <button onclick="creator.loadStatistics('day')"
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">
                        День
                    </button>
                    <button onclick="creator.loadStatistics('week')"
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">
                        Тиждень
                    </button>
                    <button onclick="creator.loadStatistics('month')"
                            class="px-4 py-2 bg-blue-500 text-white rounded">
                        Місяць
                    </button>
                    <button onclick="creator.loadStatistics('year')"
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">
                        Рік
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="stat-card bg-green-50 dark:bg-green-900 p-6 rounded-lg">
                        <div class="text-green-600 dark:text-green-300 text-sm mb-2">Продажі</div>
                        <div class="text-3xl font-bold dark:text-white">${this.statistics.sales.total_sales}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Конверсія: ${this.statistics.engagement.conversion_rate}%
                        </div>
                    </div>

                    <div class="stat-card bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                        <div class="text-blue-600 dark:text-blue-300 text-sm mb-2">Валовий дохід</div>
                        <div class="text-3xl font-bold dark:text-white">
                            ${Utils.formatPrice(this.statistics.sales.total_revenue)}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Комісія: ${this.statistics.sales.commission_rate * 100}%
                        </div>
                    </div>

                    <div class="stat-card bg-purple-50 dark:bg-purple-900 p-6 rounded-lg">
                        <div class="text-purple-600 dark:text-purple-300 text-sm mb-2">Чистий дохід</div>
                        <div class="text-3xl font-bold dark:text-white">
                            ${Utils.formatPrice(this.statistics.sales.net_revenue)}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Після комісії платформи
                        </div>
                    </div>
                </div>

                <div class="chart-container bg-white dark:bg-gray-800 rounded-lg p-6 mb-8">
                    <h4 class="font-bold mb-4 dark:text-white">Графік продажів</h4>
                    <canvas id="sales-chart" width="400" height="200"></canvas>
                </div>

                <div class="top-products bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h4 class="font-bold mb-4 dark:text-white">Топ товари</h4>
                    <div class="space-y-3">
                        ${this.statistics.top_products.map((product, idx) => `
                            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                <div class="flex items-center gap-3">
                                    <div class="text-2xl font-bold text-gray-400">
                                        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                    </div>
                                    <div>
                                        <div class="font-medium dark:text-white">${product.title}</div>
                                        <div class="text-sm text-gray-500">${product.sku}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold dark:text-white">${product.sales} продажів</div>
                                    <div class="text-sm text-green-500">${Utils.formatPrice(product.revenue)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер виведення коштів
     */
    renderWithdrawals() {
        return `
            <div class="withdrawals max-w-2xl mx-auto">
                <div class="balance-card bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg p-6 mb-6">
                    <div class="text-sm opacity-90 mb-2">Доступний баланс</div>
                    <div class="text-4xl font-bold mb-4">
                        ${Utils.formatPrice(auth.user?.creator_balance || 0)}
                    </div>
                    <div class="text-sm opacity-90">
                        Мінімальна сума для виведення: $10.00
                    </div>
                </div>

                <div class="withdrawal-form bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h4 class="font-bold mb-4 dark:text-white">Запит на виведення</h4>

                    <form id="withdrawal-form">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Сума (USD)
                            </label>
                            <input type="number" name="amount" min="10" step="0.01" required
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="10.00">
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Криптовалюта
                            </label>
                            <select name="currency" required
                                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                           dark:bg-gray-700 dark:text-white">
                                <option value="USDT">USDT (TRC20)</option>
                                <option value="BTC">Bitcoin</option>
                                <option value="ETH">Ethereum</option>
                            </select>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Адреса гаманця
                            </label>
                            <input type="text" name="wallet_address" required
                                   class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="Ваша крипто адреса">
                        </div>

                        <div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                            <p class="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ Комісія за виведення: 2%<br>
                                ⏱️ Обробка: 24-48 годин
                            </p>
                        </div>

                        <button type="submit"
                                class="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                            💰 Запросити виведення
                        </button>
                    </form>
                </div>

                <div class="history mt-8">
                    <h4 class="font-bold mb-4 dark:text-white">Історія виведень</h4>
                    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                        Історія виведень буде тут
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Отримати бейдж статусу
     */
    getStatusBadge(product) {
        if (product.is_approved) {
            if (product.is_active) {
                return '<span class="badge bg-green-100 text-green-700 px-2 py-1 rounded text-xs">✅ Активний</span>';
            } else {
                return '<span class="badge bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">⏸️ Призупинено</span>';
            }
        } else if (product.rejection_reason) {
            return '<span class="badge bg-red-100 text-red-700 px-2 py-1 rounded text-xs">❌ Відхилено</span>';
        } else {
            return '<span class="badge bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">⏳ Модерація</span>';
        }
    }

    /**
     * Ініціалізація форми продукту
     */
    initProductForm() {
        const form = document.getElementById('product-form');
        if (!form) return;

        // Превʼю зображень
        const previewInput = form.querySelector('input[name="preview_images"]');
        if (previewInput) {
            previewInput.addEventListener('change', (e) => {
                const container = document.getElementById('preview-container');
                container.innerHTML = '';

                const files = Array.from(e.target.files);
                if (files.length > 5) {
                    Utils.showNotification('Максимум 5 зображень', 'warning');
                    e.target.value = '';
                    return;
                }

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-full h-20 object-cover rounded';
                        container.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            });
        }

        // Обробка відправки форми
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);

            // Конвертуємо ціну в центи
            const price = parseFloat(formData.get('price')) * 100;
            formData.set('price', price);

            try {
                await this.createProduct(formData);
                form.reset();
                this.showTab('products');
                await this.loadProducts();
            } catch (error) {
                console.error('Form submit error:', error);
            }
        });
    }

    /**
     * Ініціалізація графіка статистики
     */
    initStatisticsChart() {
        const canvas = document.getElementById('sales-chart');
        if (!canvas || !this.statistics) return;

        const ctx = canvas.getContext('2d');
        const data = this.statistics.daily_chart || [];

        // Простий графік на canvas
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Очищаємо canvas
        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('Немає даних', width / 2, height / 2);
            return;
        }

        // Знаходимо максимальне значення
        const maxRevenue = Math.max(...data.map(d => d.revenue));

        // Малюємо графік
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - (point.revenue / maxRevenue) * (height - padding * 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Точки
            ctx.fillStyle = '#3B82F6';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.stroke();
    }

    /**
     * Фільтрувати продукти
     */
    async filterProducts(status) {
        await this.loadProducts(status);
        const content = document.getElementById('creator-tab-content');
        if (content) {
            content.innerHTML = this.renderProductsList();
        }
    }

    /**
     * Перемкнути статус продукту
     */
    async toggleProductStatus(productId, active) {
        try {
            await this.updateProduct(productId, { is_active: active });
            await this.loadProducts();
            this.showTab('products');
        } catch (error) {
            console.error('Toggle status error:', error);
        }
    }

    /**
     * Редагувати продукт
     */
    editProduct(productId) {
        // TODO: Реалізувати редагування
        Utils.showNotification('Редагування буде доступне незабаром', 'info');
    }
}

// Створюємо та експортуємо єдиний екземпляр
const creator = new CreatorModule();
window.creator = creator;

export default creator;