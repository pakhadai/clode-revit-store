/**
 * Модуль сторінки маркетплейсу
 */

class MarketPage {
    constructor(app) {
        this.app = app;
        this.currentView = 'grid'; // grid або list
        this.currentCategory = 'all';
        this.isFilterOpen = false;
        this.sortBy = 'newest';
    }

    /**
     * Рендер сторінки
     */
    async render() {
        const container = document.getElementById('page-content');

        container.innerHTML = `
            <div class="market-page animate-fadeIn">
                <!-- Заголовок та пошук -->
                <section class="market-header">
                    <h1 class="page-title">
                        🛍️ ${this.app.t('market.title')}
                    </h1>

                    <div class="search-bar">
                        <input type="text"
                               id="market-search"
                               class="search-input"
                               placeholder="${this.app.t('header.searchPlaceholder')}">
                        <button class="search-button" onclick="marketPage.performSearch()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="m21 21-4.35-4.35"/>
                            </svg>
                        </button>
                    </div>
                </section>

                <!-- Категорії -->
                <section class="categories-section">
                    <div class="categories-scroll">
                        ${this.renderCategories()}
                    </div>
                </section>

                <!-- Панель інструментів -->
                <section class="toolbar-section">
                    <div class="toolbar-left">
                        <button class="filter-btn" onclick="marketPage.toggleFilters()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                            </svg>
                            <span>${this.app.t('market.filters.title')}</span>
                            <span class="filter-badge" id="filter-count" style="display: none;">0</span>
                        </button>
                    </div>

                    <div class="toolbar-right">
                        <select class="sort-select" onchange="marketPage.setSorting(this.value)">
                            <option value="newest">${this.app.t('market.sorting.newest')}</option>
                            <option value="price-asc">${this.app.t('market.sorting.priceAsc')}</option>
                            <option value="price-desc">${this.app.t('market.sorting.priceDesc')}</option>
                            <option value="popular">${this.app.t('market.sorting.popular')}</option>
                            <option value="rating">${this.app.t('market.sorting.rating')}</option>
                        </select>

                        <div class="view-switcher">
                            <button class="view-btn ${this.currentView === 'grid' ? 'active' : ''}"
                                    onclick="marketPage.setView('grid')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="3" width="7" height="7"/>
                                    <rect x="14" y="3" width="7" height="7"/>
                                    <rect x="3" y="14" width="7" height="7"/>
                                    <rect x="14" y="14" width="7" height="7"/>
                                </svg>
                            </button>
                            <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}"
                                    onclick="marketPage.setView('list')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="4" width="18" height="2"/>
                                    <rect x="3" y="9" width="18" height="2"/>
                                    <rect x="3" y="14" width="18" height="2"/>
                                    <rect x="3" y="19" width="18" height="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Панель фільтрів -->
                <section class="filters-panel ${this.isFilterOpen ? 'open' : ''}" id="filters-panel">
                    ${this.renderFilters()}
                </section>

                <!-- Список продуктів -->
                <section class="products-section">
                    <div id="products-container" class="products-${this.currentView}">
                        ${this.renderProductsSkeleton(12)}
                    </div>
                </section>

                <!-- Завантажити більше -->
                <section class="load-more-section">
                    <button class="load-more-btn" onclick="marketPage.loadMore()" style="display: none;">
                        ${this.app.t('buttons.loadMore')}
                    </button>
                </section>
            </div>
        `;

        this.injectStyles();
        this.attachEventListeners();
        await this.loadProducts();
    }

    /**
     * Рендер категорій
     */
    renderCategories() {
        const categories = [
            { id: 'all', icon: '🏠', name: this.app.t('market.categories.all') },
            { id: 'free', icon: '🆓', name: this.app.t('market.categories.free') },
            { id: 'premium', icon: '⭐', name: this.app.t('market.categories.premium') },
            { id: 'creators', icon: '🎨', name: this.app.t('market.categories.creators') }
        ];

        return categories.map(cat => `
            <button class="category-chip ${this.currentCategory === cat.id ? 'active' : ''}"
                    onclick="marketPage.setCategory('${cat.id}')">
                <span class="category-icon">${cat.icon}</span>
                <span class="category-name">${cat.name}</span>
            </button>
        `).join('');
    }

    /**
     * Рендер фільтрів
     */
    renderFilters() {
        return `
            <div class="filters-content">
                <!-- Ціна -->
                <div class="filter-group">
                    <h3 class="filter-title">${this.app.t('market.filters.price')}</h3>
                    <div class="price-range">
                        <input type="number" id="price-min" class="price-input" placeholder="${this.app.t('buttons.min')}">
                        <span class="price-separator">—</span>
                        <input type="number" id="price-max" class="price-input" placeholder="${this.app.t('buttons.max')}">
                    </div>
                </div>

                <!-- Тип архіву -->
                <div class="filter-group">
                    <h3 class="filter-title">${this.app.t('market.filters.type')}</h3>
                    <div class="filter-options">
                        <label class="filter-checkbox">
                            <input type="checkbox" value="furniture">
                            <span>🪑 ${this.app.t('filters.furniture')}</span>
                        </label>
                        <label class="filter-checkbox">
                            <input type="checkbox" value="textures">
                            <span>🎨 ${this.app.t('filters.textures')}</span>
                        </label>
                        <label class="filter-checkbox">
                            <input type="checkbox" value="components">
                            <span>🔧 ${this.app.t('filters.components')}</span>
                        </label>
                    </div>
                </div>

                <!-- Теги -->
                <div class="filter-group">
                    <h3 class="filter-title">${this.app.t('market.filters.tags')}</h3>
                    <div class="tags-cloud">
                        ${['modern', 'classic', 'minimalist', 'industrial', 'luxury'].map(tag => `
                            <button class="tag-chip" onclick="marketPage.toggleTag('${tag}')">
                                #${tag}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Рейтинг -->
                <div class="filter-group">
                    <h3 class="filter-title">${this.app.t('market.filters.rating')}</h3>
                    <div class="rating-filter">
                        ${[5,4,3,2,1].map(rating => `
                            <button class="rating-option" onclick="marketPage.setMinRating(${rating})">
                                <span class="stars">${'⭐'.repeat(rating)}</span>
                                <span class="rating-label">${this.app.t('market.filters.andUp')}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Кнопки дій -->
                <div class="filter-actions">
                    <button class="btn-reset" onclick="marketPage.resetFilters()">
                        ${this.app.t('market.filters.reset')}
                    </button>
                    <button class="btn-apply" onclick="marketPage.applyFilters()">
                        ${this.app.t('market.filters.apply')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Рендер скелетону продуктів
     */
    renderProductsSkeleton(count = 8) {
        return Array(count).fill(null).map(() => `
            <div class="product-skeleton">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-price"></div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Рендер картки продукту
     */
    renderProductCard(product) {
        const isInCart = this.app.cart.isInCart(product.id);
        const isFavorite = product.is_favorite;

        if (this.currentView === 'list') {
            return `
                <div class="product-list-item" onclick="marketPage.openProduct(${product.id})">
                    <div class="product-list-image">
                        <img src="${product.preview_images?.[0] || '/assets/placeholder.jpg'}"
                             alt="${product.title}">
                        ${product.discount_percent > 0 ? `
                            <span class="discount-badge">-${product.discount_percent}%</span>
                        ` : ''}
                    </div>
                    <div class="product-list-info">
                        <h3 class="product-list-title">${product.title}</h3>
                        <p class="product-list-description">${product.description || ''}</p>
                        <div class="product-list-meta">
                            <span class="product-rating">⭐ ${product.rating || 0}</span>
                            <span class="product-downloads">📥 ${product.downloads_count}</span>
                        </div>
                    </div>
                    <div class="product-list-actions">
                        <div class="product-price-block">
                            ${product.is_free ?
                                `<span class="price-free">${this.app.t('market.product.free')}</span>` :
                                `<span class="price-value">$${(product.current_price / 100).toFixed(2)}</span>`
                            }
                        </div>
                        <button class="btn-favorite ${isFavorite ? 'active' : ''}"
                                onclick="event.stopPropagation(); marketPage.toggleFavorite(${product.id})">
                            ${isFavorite ? '❤️' : '🤍'}
                        </button>
                        <button class="btn-cart ${isInCart ? 'in-cart' : ''}"
                                onclick="event.stopPropagation(); marketPage.addToCart(${product.id})">
                            ${isInCart ? '✓' : '🛒'}
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="product-card" onclick="marketPage.openProduct(${product.id})">
                <div class="product-image-wrapper">
                    <img src="${product.preview_images?.[0] || '/assets/placeholder.jpg'}"
                         alt="${product.title}"
                         class="product-image">

                    ${product.discount_percent > 0 ? `
                        <span class="discount-badge">-${product.discount_percent}%</span>
                    ` : ''}

                    ${product.is_new ? `
                        <span class="new-badge">${this.app.t('market.product.new')}</span>
                    ` : ''}

                    <button class="btn-favorite-overlay ${isFavorite ? 'active' : ''}"
                            onclick="event.stopPropagation(); marketPage.toggleFavorite(${product.id})">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                </div>

                <div class="product-content">
                    <h3 class="product-title">${product.title}</h3>

                    <div class="product-meta">
                        <span class="product-rating">⭐ ${product.rating || 0}</span>
                        <span class="product-type">${product.product_type || ''}</span>
                    </div>

                    <div class="product-footer">
                        <div class="product-price">
                            ${product.is_free ?
                                `<span class="price-free">${this.app.t('market.product.free')}</span>` :
                                `
                                ${product.discount_percent > 0 ?
                                    `<span class="price-old">$${(product.price / 100).toFixed(2)}</span>` : ''
                                }
                                <span class="price-current">$${(product.current_price / 100).toFixed(2)}</span>
                                `
                            }
                        </div>

                        <button class="btn-add-cart ${isInCart ? 'in-cart' : ''}"
                                onclick="event.stopPropagation(); marketPage.addToCart(${product.id})">
                            ${isInCart ? '✓' : '+'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Завантажити продукти
     */
    async loadProducts() {
        try {
            // Збираємо фільтри
            const filters = this.collectFilters();

            // Завантажуємо через модуль products
            const response = await this.app.products.loadProducts(1, false);

            // Рендеримо продукти
            const container = document.getElementById('products-container');
            if (response.products && response.products.length > 0) {
                container.innerHTML = response.products.map(p => this.renderProductCard(p)).join('');

                // Показуємо кнопку "Завантажити більше" якщо є ще сторінки
                const loadMoreBtn = document.querySelector('.load-more-btn');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = response.pagination?.has_next ? 'block' : 'none';
                }
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h3 class="empty-title">${this.app.t('market.empty')}</h3>
                        <p class="empty-text">${this.app.t('market.emptyText')}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    /**
     * Встановити категорію
     */
    async setCategory(category) {
        this.currentCategory = category;

        // Оновлюємо UI
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.toggle('active', chip.onclick?.toString().includes(category));
        });

        // Встановлюємо фільтр
        if (category === 'all') {
            this.app.products.setFilter('category', null);
        } else {
            this.app.products.setFilter('category', category);
        }

        await this.loadProducts();
    }

    /**
     * Встановити сортування
     */
    async setSorting(value) {
        this.sortBy = value;

        const [sortBy, sortOrder] = value.split('-');
        this.app.products.setFilter('sort_by', sortBy === 'price' ? 'price' : sortBy);
        this.app.products.setFilter('sort_order', sortOrder || 'desc');

        await this.loadProducts();
    }

    /**
     * Встановити вигляд
     */
    setView(view) {
        this.currentView = view;

        // Оновлюємо кнопки
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.onclick?.toString().includes(view));
        });

        // Оновлюємо контейнер
        const container = document.getElementById('products-container');
        container.className = `products-${view}`;

        // Перерендерюємо продукти
        this.loadProducts();
    }

    /**
     * Перемкнути фільтри
     */
    toggleFilters() {
        this.isFilterOpen = !this.isFilterOpen;
        const panel = document.getElementById('filters-panel');
        panel.classList.toggle('open', this.isFilterOpen);
    }

    /**
     * Зібрати фільтри
     */
    collectFilters() {
        const filters = {};

        // Ціна
        const minPrice = document.getElementById('price-min')?.value;
        const maxPrice = document.getElementById('price-max')?.value;
        if (minPrice) filters.min_price = parseInt(minPrice) * 100;
        if (maxPrice) filters.max_price = parseInt(maxPrice) * 100;

        // Типи
        const types = Array.from(document.querySelectorAll('.filter-checkbox input:checked'))
            .map(cb => cb.value);
        if (types.length > 0) filters.product_types = types;

        // Теги
        const tags = Array.from(document.querySelectorAll('.tag-chip.active'))
            .map(tag => tag.textContent.replace('#', ''));
        if (tags.length > 0) filters.tags = tags;

        return filters;
    }

    /**
     * Застосувати фільтри
     */
    async applyFilters() {
        const filters = this.collectFilters();

        // Встановлюємо фільтри в модулі products
        Object.keys(filters).forEach(key => {
            this.app.products.setFilter(key, filters[key]);
        });

        // Оновлюємо бейдж кількості фільтрів
        const count = Object.keys(filters).length;
        const badge = document.getElementById('filter-count');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Закриваємо панель і завантажуємо продукти
        this.toggleFilters();
        await this.loadProducts();
    }

    /**
     * Скинути фільтри
     */
    resetFilters() {
        // Очищаємо всі інпути
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        document.querySelectorAll('.filter-checkbox input').forEach(cb => cb.checked = false);
        document.querySelectorAll('.tag-chip.active').forEach(tag => tag.classList.remove('active'));
        document.querySelectorAll('.rating-option.active').forEach(btn => btn.classList.remove('active'));

        // Скидаємо фільтри в модулі
        this.app.products.clearFilters();

        // Оновлюємо бейдж
        const badge = document.getElementById('filter-count');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    }

    /**
     * Перемкнути тег
     */
    toggleTag(tag) {
        event.target.classList.toggle('active');
    }

    /**
     * Встановити мінімальний рейтинг
     */
    setMinRating(rating) {
        // Оновлюємо UI
        document.querySelectorAll('.rating-option').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        // Встановлюємо фільтр
        this.app.products.setFilter('min_rating', rating);
    }

    /**
     * Пошук
     */
    async performSearch() {
        const query = document.getElementById('market-search')?.value;
        if (query) {
            this.app.products.setFilter('search', query);
            await this.loadProducts();
        }
    }

    /**
     * Додати в кошик
     */
    async addToCart(productId) {
        await this.app.cart.addToCart(productId);
        // Оновлюємо кнопку
        const btns = document.querySelectorAll(`.btn-add-cart, .btn-cart`);
        btns.forEach(btn => {
            if (btn.onclick?.toString().includes(productId)) {
                btn.classList.add('in-cart');
                btn.textContent = '✓';
            }
        });
    }

    /**
     * Перемкнути обране
     */
    async toggleFavorite(productId) {
        await this.app.products.toggleFavorite(productId);
        // Оновлюємо кнопки
        const btns = document.querySelectorAll('.btn-favorite, .btn-favorite-overlay');
        btns.forEach(btn => {
            if (btn.onclick?.toString().includes(productId)) {
                const isActive = btn.classList.toggle('active');
                btn.textContent = isActive ? '❤️' : '🤍';
            }
        });
    }

    /**
     * Відкрити продукт
     */
    openProduct(productId) {
        this.app.navigateTo('product', { id: productId });
    }

    /**
     * Завантажити більше
     */
    async loadMore() {
        const nextPage = this.app.products.currentPage + 1;
        const response = await this.app.products.loadProducts(nextPage, true);

        // Додаємо нові продукти
        const container = document.getElementById('products-container');
        const newProducts = response.products.map(p => this.renderProductCard(p)).join('');
        container.insertAdjacentHTML('beforeend', newProducts);

        // Оновлюємо кнопку
        const loadMoreBtn = document.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = response.pagination?.has_next ? 'block' : 'none';
        }
    }

    /**
     * Прикріплення обробників подій
     */
    attachEventListeners() {
        // Пошук при введенні
        const searchInput = document.getElementById('market-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch();
                }, 500);
            });
        }

        // Закриття фільтрів при кліку поза панеллю
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('filters-panel');
            const filterBtn = document.querySelector('.filter-btn');
            if (this.isFilterOpen && !panel?.contains(e.target) && !filterBtn?.contains(e.target)) {
                this.toggleFilters();
            }
        });
    }

    /**
     * Додавання стилів
     */
    injectStyles() {
        if (document.getElementById('market-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'market-styles';
        styles.innerHTML = `
            /* Основні стилі маркету */
            .market-page {
                padding-bottom: 2rem;
            }

            .page-title {
                font-size: 2rem;
                font-weight: 800;
                color: #111827;
                margin-bottom: 1.5rem;
            }

            .dark .page-title {
                color: white;
            }

            /* Пошукова панель */
            .search-bar {
                position: relative;
                max-width: 600px;
                margin: 0 auto 2rem;
            }

            .search-input {
                width: 100%;
                padding: 1rem 3rem 1rem 1.5rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .dark .search-input {
                background: #1f2937;
                border-color: #374151;
                color: white;
            }

            .search-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .search-button {
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                padding: 0.5rem;
                background: transparent;
                border: none;
                color: #6b7280;
                cursor: pointer;
                transition: color 0.2s;
            }

            .search-button:hover {
                color: #3b82f6;
            }

            /* Категорії */
            .categories-section {
                margin-bottom: 1.5rem;
                overflow: hidden;
            }

            .categories-scroll {
                display: flex;
                gap: 0.75rem;
                overflow-x: auto;
                padding: 0.25rem 0;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
            }

            .categories-scroll::-webkit-scrollbar {
                display: none;
            }

            .category-chip {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.25rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-weight: 600;
                white-space: nowrap;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .dark .category-chip {
                background: #1f2937;
                border-color: #374151;
                color: #d1d5db;
            }

            .category-chip:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .category-chip.active {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                border-color: transparent;
                color: white;
            }

            .category-icon {
                font-size: 1.25rem;
            }

            /* Панель інструментів */
            .toolbar-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .toolbar-left, .toolbar-right {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .filter-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.25rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .dark .filter-btn {
                background: #1f2937;
                border-color: #374151;
                color: white;
            }

            .filter-btn:hover {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .filter-badge {
                display: inline-block;
                min-width: 20px;
                padding: 0.125rem 0.375rem;
                background: #ef4444;
                color: white;
                border-radius: 10px;
                font-size: 0.75rem;
                text-align: center;
            }

            .sort-select {
                padding: 0.75rem 2.5rem 0.75rem 1rem;
                background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center;
                background-size: 20px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                appearance: none;
               transition: all 0.3s ease;
           }

           .dark .sort-select {
               background: #1f2937 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center;
               background-size: 20px;
               border-color: #374151;
               color: white;
           }

           .view-switcher {
               display: flex;
               gap: 0.25rem;
               padding: 0.25rem;
               background: #f3f4f6;
               border-radius: 10px;
           }

           .dark .view-switcher {
               background: #374151;
           }

           .view-btn {
               padding: 0.5rem;
               background: transparent;
               border: none;
               border-radius: 8px;
               color: #6b7280;
               cursor: pointer;
               transition: all 0.2s;
           }

           .view-btn.active {
               background: white;
               color: #3b82f6;
               box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
           }

           .dark .view-btn.active {
               background: #1f2937;
               color: #60a5fa;
           }

           /* Панель фільтрів */
           .filters-panel {
               max-height: 0;
               overflow: hidden;
               transition: max-height 0.3s ease;
               margin-bottom: 1.5rem;
           }

           .filters-panel.open {
               max-height: 600px;
           }

           .filters-content {
               padding: 1.5rem;
               background: white;
               border-radius: 16px;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
           }

           .dark .filters-content {
               background: #1f2937;
           }

           .filter-group {
               margin-bottom: 1.5rem;
           }

           .filter-title {
               font-size: 0.875rem;
               font-weight: 600;
               text-transform: uppercase;
               letter-spacing: 0.05em;
               color: #6b7280;
               margin-bottom: 0.75rem;
           }

           .dark .filter-title {
               color: #9ca3af;
           }

           .price-range {
               display: flex;
               align-items: center;
               gap: 0.75rem;
           }

           .price-input {
               flex: 1;
               padding: 0.5rem;
               background: #f3f4f6;
               border: 1px solid #e5e7eb;
               border-radius: 8px;
               font-size: 0.875rem;
           }

           .dark .price-input {
               background: #374151;
               border-color: #4b5563;
               color: white;
           }

           .price-separator {
               color: #9ca3af;
           }

           .filter-options {
               display: flex;
               flex-direction: column;
               gap: 0.5rem;
           }

           .filter-checkbox {
               display: flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.5rem;
               border-radius: 8px;
               cursor: pointer;
               transition: background 0.2s;
           }

           .filter-checkbox:hover {
               background: #f3f4f6;
           }

           .dark .filter-checkbox:hover {
               background: #374151;
           }

           .filter-checkbox input {
               width: 18px;
               height: 18px;
               cursor: pointer;
           }

           .tags-cloud {
               display: flex;
               flex-wrap: wrap;
               gap: 0.5rem;
           }

           .tag-chip {
               padding: 0.5rem 1rem;
               background: #f3f4f6;
               border: 1px solid #e5e7eb;
               border-radius: 20px;
               font-size: 0.875rem;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .tag-chip {
               background: #374151;
               border-color: #4b5563;
               color: #d1d5db;
           }

           .tag-chip:hover {
               border-color: #3b82f6;
           }

           .tag-chip.active {
               background: #3b82f6;
               border-color: #3b82f6;
               color: white;
           }

           .rating-filter {
               display: flex;
               flex-direction: column;
               gap: 0.5rem;
           }

           .rating-option {
               display: flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.5rem;
               background: transparent;
               border: 1px solid #e5e7eb;
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .rating-option {
               border-color: #374151;
               color: #d1d5db;
           }

           .rating-option:hover {
               background: #f3f4f6;
           }

           .dark .rating-option:hover {
               background: #374151;
           }

           .rating-option.active {
               background: #fef3c7;
               border-color: #fbbf24;
           }

           .dark .rating-option.active {
               background: rgba(251, 191, 36, 0.2);
           }

           .filter-actions {
               display: flex;
               gap: 1rem;
               margin-top: 1.5rem;
           }

           .btn-reset, .btn-apply {
               flex: 1;
               padding: 0.75rem;
               border-radius: 12px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-reset {
               background: #f3f4f6;
               border: 2px solid #e5e7eb;
               color: #6b7280;
           }

           .dark .btn-reset {
               background: #374151;
               border-color: #4b5563;
               color: #d1d5db;
           }

           .btn-apply {
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               border: none;
               color: white;
           }

           .btn-apply:hover {
               transform: translateY(-2px);
               box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
           }

           /* Сітка продуктів */
           .products-grid {
               display: grid;
               grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
               gap: 1.5rem;
           }

           @media (max-width: 640px) {
               .products-grid {
                   grid-template-columns: repeat(2, 1fr);
                   gap: 1rem;
               }
           }

           .products-list {
               display: flex;
               flex-direction: column;
               gap: 1rem;
           }

           /* Картка продукту (Grid) */
           .product-card {
               background: white;
               border-radius: 16px;
               overflow: hidden;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .product-card {
               background: #1f2937;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
           }

           .product-card:hover {
               transform: translateY(-8px);
               box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
           }

           .product-image-wrapper {
               position: relative;
               width: 100%;
               padding-top: 100%;
               overflow: hidden;
               background: #f3f4f6;
           }

           .dark .product-image-wrapper {
               background: #374151;
           }

           .product-image {
               position: absolute;
               top: 0;
               left: 0;
               width: 100%;
               height: 100%;
               object-fit: cover;
               transition: transform 0.3s ease;
           }

           .product-card:hover .product-image {
               transform: scale(1.1);
           }

           .discount-badge, .new-badge {
               position: absolute;
               top: 0.75rem;
               padding: 0.25rem 0.75rem;
               border-radius: 8px;
               font-size: 0.75rem;
               font-weight: 600;
           }

           .discount-badge {
               left: 0.75rem;
               background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
               color: white;
           }

           .new-badge {
               right: 0.75rem;
               background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
               color: white;
           }

           .btn-favorite-overlay {
               position: absolute;
               bottom: 0.75rem;
               right: 0.75rem;
               width: 36px;
               height: 36px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: white;
               border-radius: 50%;
               box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
               font-size: 1.25rem;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .btn-favorite-overlay {
               background: #1f2937;
           }

           .btn-favorite-overlay:hover {
               transform: scale(1.1);
           }

           .product-content {
               padding: 1rem;
           }

           .product-title {
               font-size: 0.875rem;
               font-weight: 600;
               color: #111827;
               margin-bottom: 0.5rem;
               overflow: hidden;
               text-overflow: ellipsis;
               display: -webkit-box;
               -webkit-line-clamp: 2;
               -webkit-box-orient: vertical;
           }

           .dark .product-title {
               color: white;
           }

           .product-meta {
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 0.75rem;
               font-size: 0.75rem;
               color: #6b7280;
           }

           .dark .product-meta {
               color: #9ca3af;
           }

           .product-footer {
               display: flex;
               justify-content: space-between;
               align-items: center;
           }

           .product-price {
               display: flex;
               align-items: center;
               gap: 0.5rem;
           }

           .price-old {
               font-size: 0.875rem;
               color: #9ca3af;
               text-decoration: line-through;
           }

           .price-current {
               font-size: 1.125rem;
               font-weight: 700;
               color: #3b82f6;
           }

           .price-free {
               font-size: 1rem;
               font-weight: 700;
               color: #10b981;
           }

           .btn-add-cart {
               width: 36px;
               height: 36px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 10px;
               font-size: 1.25rem;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.2s;
           }

           .btn-add-cart:hover {
               transform: scale(1.1);
           }

           .btn-add-cart.in-cart {
               background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
           }

           /* Картка продукту (List) */
           .product-list-item {
               display: flex;
               gap: 1rem;
               padding: 1rem;
               background: white;
               border-radius: 12px;
               box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .product-list-item {
               background: #1f2937;
           }

           .product-list-item:hover {
               transform: translateX(4px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
           }

           .product-list-image {
               position: relative;
               width: 120px;
               height: 120px;
               flex-shrink: 0;
               border-radius: 8px;
               overflow: hidden;
           }

           .product-list-image img {
               width: 100%;
               height: 100%;
               object-fit: cover;
           }

           .product-list-info {
               flex: 1;
               display: flex;
               flex-direction: column;
               justify-content: center;
           }

           .product-list-title {
               font-size: 1rem;
               font-weight: 600;
               color: #111827;
               margin-bottom: 0.25rem;
           }

           .dark .product-list-title {
               color: white;
           }

           .product-list-description {
               font-size: 0.875rem;
               color: #6b7280;
               margin-bottom: 0.5rem;
               overflow: hidden;
               text-overflow: ellipsis;
               display: -webkit-box;
               -webkit-line-clamp: 2;
               -webkit-box-orient: vertical;
           }

           .dark .product-list-description {
               color: #9ca3af;
           }

           .product-list-meta {
               display: flex;
               gap: 1rem;
               font-size: 0.875rem;
               color: #6b7280;
           }

           .product-list-actions {
               display: flex;
               align-items: center;
               gap: 0.75rem;
           }

           .btn-favorite, .btn-cart {
               width: 40px;
               height: 40px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 10px;
               font-size: 1.25rem;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .btn-favorite, .dark .btn-cart {
               background: #374151;
               border-color: #4b5563;
           }

           .btn-favorite:hover, .btn-cart:hover {
               border-color: #3b82f6;
               transform: scale(1.1);
           }

           .btn-cart.in-cart {
               background: #10b981;
               border-color: #10b981;
               color: white;
           }

           /* Скелетон */
           .product-skeleton {
               background: white;
               border-radius: 16px;
               overflow: hidden;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
           }

           .dark .product-skeleton {
               background: #1f2937;
           }

           .skeleton {
               background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
               background-size: 200% 100%;
               animation: skeleton 1.5s ease-in-out infinite;
           }

           .dark .skeleton {
               background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
               background-size: 200% 100%;
           }

           @keyframes skeleton {
               0% { background-position: 200% 0; }
               100% { background-position: -200% 0; }
           }

           .skeleton-image {
               width: 100%;
               padding-top: 100%;
           }

           .skeleton-content {
               padding: 1rem;
           }

           .skeleton-title {
               height: 20px;
               border-radius: 4px;
               margin-bottom: 0.5rem;
           }

           .skeleton-text {
               height: 14px;
               width: 60%;
               border-radius: 4px;
               margin-bottom: 0.75rem;
           }

           .skeleton-price {
               height: 24px;
               width: 40%;
               border-radius: 4px;
           }

           /* Empty state */
           .empty-state {
               grid-column: 1 / -1;
               text-align: center;
               padding: 4rem 2rem;
           }

           .empty-icon {
               font-size: 4rem;
               margin-bottom: 1rem;
               opacity: 0.5;
           }

           .empty-title {
               font-size: 1.5rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 0.5rem;
           }

           .dark .empty-title {
               color: white;
           }

           .empty-text {
               color: #6b7280;
           }

           .dark .empty-text {
               color: #9ca3af;
           }

           /* Кнопка завантажити більше */
           .load-more-section {
               text-align: center;
               padding: 2rem 0;
           }

           .load-more-btn {
               padding: 0.75rem 2rem;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 12px;
               font-weight: 600;
               color: #6b7280;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .load-more-btn {
               background: #1f2937;
               border-color: #374151;
               color: #d1d5db;
           }

           .load-more-btn:hover {
               border-color: #3b82f6;
               color: #3b82f6;
               transform: translateY(-2px);
           }

           /* Анімації */
           @keyframes fadeIn {
               from { opacity: 0; }
               to { opacity: 1; }
           }

           .animate-fadeIn {
               animation: fadeIn 0.3s ease;
           }

           /* Адаптивність */
           @media (max-width: 640px) {
               .page-title {
                   font-size: 1.5rem;
               }

               .toolbar-section {
                   flex-direction: column;
                   align-items: stretch;
               }

               .toolbar-left, .toolbar-right {
                   width: 100%;
                   justify-content: space-between;
               }

               .filter-actions {
                   flex-direction: column;
               }

               .products-list .product-list-item {
                   flex-direction: column;
               }

               .product-list-image {
                   width: 100%;
                   height: 200px;
               }

               .product-list-actions {
                   justify-content: space-between;
                   padding-top: 1rem;
                   border-top: 1px solid #e5e7eb;
               }

               .dark .product-list-actions {
                   border-top-color: #374151;
               }
           }
       `;
       document.head.appendChild(styles);
   }
}

window.MarketPage = MarketPage;
window.marketPage = null; // Буде ініціалізовано в app.js