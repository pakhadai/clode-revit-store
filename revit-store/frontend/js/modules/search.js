/**
 * Модуль пошуку та фільтрації
 */

class SearchModule {
    constructor() {
        this.searchQuery = '';
        this.suggestions = [];
        this.searchHistory = [];
        this.filters = {
            categories: [],
            types: [],
            tags: [],
            priceRange: { min: null, max: null },
            rating: null,
            freeOnly: false,
            withDiscount: false,
            newOnly: false
        };
        this.loadSearchHistory();
    }

    /**
     * Завантажити історію пошуку
     */
    loadSearchHistory() {
        this.searchHistory = Utils.storage.get('search_history', []);
    }

    /**
     * Зберегти пошуковий запит в історію
     */
    saveToHistory(query) {
        if (!query || query.length < 2) return;

        // Видаляємо дублікати
        this.searchHistory = this.searchHistory.filter(q => q !== query);

        // Додаємо на початок
        this.searchHistory.unshift(query);

        // Обмежуємо 10 записами
        this.searchHistory = this.searchHistory.slice(0, 10);

        Utils.storage.set('search_history', this.searchHistory);
    }

    /**
     * Очистити історію пошуку
     */
    clearHistory() {
        this.searchHistory = [];
        Utils.storage.remove('search_history');
    }

    /**
     * Виконати пошук
     */
    async search(query) {
        this.searchQuery = query;

        if (query && query.length >= 2) {
            this.saveToHistory(query);
        }

        // Оновлюємо фільтр в модулі продуктів
        products.setFilter('search', query);

        // Завантажуємо продукти
        await products.loadProducts();

        // Оновлюємо UI
        window.app.render();
    }

    /**
     * Отримати автодоповнення
     */
    async getSuggestions(query) {
        if (!query || query.length < 2) {
            this.suggestions = [];
            return [];
        }

        try {
            // Можна зробити окремий API ендпоінт для suggestions
            const response = await api.get('/products/suggestions', {
                q: query,
                limit: 5
            });

            this.suggestions = response.suggestions || [];
            return this.suggestions;
        } catch (error) {
            console.error('Get suggestions error:', error);

            // Fallback - пропонуємо з історії
            this.suggestions = this.searchHistory.filter(h =>
                h.toLowerCase().includes(query.toLowerCase())
            );
            return this.suggestions;
        }
    }

    /**
     * Застосувати фільтри
     */
    async applyFilters(filters) {
        Object.assign(this.filters, filters);

        // Оновлюємо фільтри в модулі продуктів
        if (filters.categories?.length > 0) {
            products.setFilter('category', filters.categories[0]);
        }

        if (filters.types?.length > 0) {
            products.setFilter('product_type', filters.types[0]);
        }

        if (filters.tags?.length > 0) {
            products.setFilter('tags', filters.tags.join(','));
        }

        if (filters.priceRange) {
            products.setFilter('min_price', filters.priceRange.min);
            products.setFilter('max_price', filters.priceRange.max);
        }

        if (filters.rating) {
            products.setFilter('min_rating', filters.rating);
        }

        products.setFilter('is_free', filters.freeOnly || null);
        products.setFilter('has_discount', filters.withDiscount || null);
        products.setFilter('is_new', filters.newOnly || null);

        // Завантажуємо продукти
        await products.loadProducts();

        // Оновлюємо UI
        window.app.render();
    }

    /**
     * Скинути фільтри
     */
    resetFilters() {
        this.filters = {
            categories: [],
            types: [],
            tags: [],
            priceRange: { min: null, max: null },
            rating: null,
            freeOnly: false,
            withDiscount: false,
            newOnly: false
        };

        products.clearFilters();
    }

    /**
     * Створити UI пошуку
     */
    createSearchUI() {
        return `
            <div class="search-container relative">
                <div class="search-box relative">
                    <input type="text"
                           id="search-input"
                           class="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600
                                  rounded-lg text-lg dark:bg-gray-700 dark:text-white
                                  focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                           placeholder="${window.app.t('search.placeholder')}"
                           value="${this.searchQuery}"
                           autocomplete="off"
                           onkeyup="search.handleSearchInput(event)"
                           onfocus="search.showSuggestions()">

                    <button onclick="search.performSearch()"
                            class="absolute right-2 top-1/2 transform -translate-y-1/2
                                   text-gray-500 hover:text-gray-700 dark:text-gray-400
                                   dark:hover:text-gray-200 p-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </button>
                </div>

                <div id="search-suggestions"
                     class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800
                            border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg
                            z-20 hidden">
                    ${this.createSuggestionsList()}
                </div>
            </div>
        `;
    }

    /**
     * Створити список пропозицій
     */
    createSuggestionsList() {
        let html = '';

        // Пропозиції
        if (this.suggestions.length > 0) {
            html += `
                <div class="p-2">
                    <div class="text-xs text-gray-500 dark:text-gray-400 px-2 mb-1">
                        ${window.app.t('search.suggestions')}
                    </div>
                    ${this.suggestions.map(s => `
                        <div onclick="search.selectSuggestion('${s}')"
                             class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700
                                    cursor-pointer rounded">
                            <span class="text-gray-700 dark:text-gray-300">${s}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Історія пошуку
        if (this.searchHistory.length > 0 && !this.searchQuery) {
            html += `
                <div class="p-2 border-t dark:border-gray-700">
                    <div class="flex justify-between items-center px-2 mb-1">
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                            ${window.app.t('search.history')}
                        </span>
                        <button onclick="search.clearHistory()"
                                class="text-xs text-red-500 hover:text-red-600">
                            ${window.app.t('buttons.clear')}
                        </button>
                    </div>
                    ${this.searchHistory.slice(0, 5).map(h => `
                        <div onclick="search.selectSuggestion('${h}')"
                             class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700
                                    cursor-pointer rounded flex items-center gap-2">
                            <span class="text-gray-400">🕐</span>
                            <span class="text-gray-600 dark:text-gray-400">${h}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (!html) {
            html = `
                <div class="p-4 text-center text-gray-500 dark:text-gray-400">
                    ${window.app.t('search.typeToSearch')}
                </div>
            `;
        }

        return html;
    }

    /**
     * Обробка вводу в пошук
     */
    async handleSearchInput(event) {
        const query = event.target.value;

        // Enter - виконати пошук
        if (event.key === 'Enter') {
            this.performSearch();
            return;
        }

        // Escape - закрити пропозиції
        if (event.key === 'Escape') {
            this.hideSuggestions();
            return;
        }

        // Отримуємо пропозиції
        if (query !== this.searchQuery) {
            this.searchQuery = query;
            await this.getSuggestions(query);
            this.updateSuggestions();
        }
    }

    /**
     * Виконати пошук
     */
    performSearch() {
        const input = document.getElementById('search-input');
        if (input) {
            this.search(input.value);
            this.hideSuggestions();
        }
    }

    /**
     * Вибрати пропозицію
     */
    selectSuggestion(suggestion) {
        const input = document.getElementById('search-input');
        if (input) {
            input.value = suggestion;
            this.searchQuery = suggestion;
            this.performSearch();
        }
    }

    /**
     * Показати пропозиції
     */
    showSuggestions() {
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions) {
            suggestions.classList.remove('hidden');
            this.updateSuggestions();
        }
    }

    /**
     * Приховати пропозиції
     */
    hideSuggestions() {
        setTimeout(() => {
            const suggestions = document.getElementById('search-suggestions');
            if (suggestions) {
                suggestions.classList.add('hidden');
            }
        }, 200);
    }

    /**
     * Оновити пропозиції
     */
    updateSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.innerHTML = this.createSuggestionsList();
        }
    }

    /**
     * Створити розширені фільтри
     */
    createAdvancedFilters() {
        return `
            <div class="advanced-filters bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold dark:text-white">
                        ${window.app.t('search.advancedFilters')}
                    </h3>
                    <button onclick="search.resetFilters()"
                            class="text-sm text-blue-500 hover:text-blue-600">
                        ${window.app.t('buttons.reset')}
                    </button>
                </div>

                <div class="grid md:grid-cols-3 gap-4">
                    <!-- Категорії -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.categories')}
                        </label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" value="free"
                                       onchange="search.toggleFilter('categories', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">🆓 ${window.app.t('filters.free')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" value="premium"
                                       onchange="search.toggleFilter('categories', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">⭐ ${window.app.t('filters.premium')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" value="creator"
                                       onchange="search.toggleFilter('categories', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">🎨 ${window.app.t('filters.fromCreators')}</span>
                            </label>
                        </div>
                    </div>

                    <!-- Типи -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.types')}
                        </label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" value="furniture"
                                       onchange="search.toggleFilter('types', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">🪑 ${window.app.t('filters.furniture')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" value="textures"
                                       onchange="search.toggleFilter('types', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">🎨 ${window.app.t('filters.textures')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" value="components"
                                       onchange="search.toggleFilter('types', this.value, this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">🔧 ${window.app.t('filters.components')}</span>
                            </label>
                        </div>
                    </div>

                    <!-- Ціновий діапазон -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.priceRange')}
                        </label>
                        <div class="flex gap-2">
                            <input type="number"
                                   id="price-min"
                                   placeholder="${window.app.t('filters.min')}"
                                   class="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600
                                          rounded dark:bg-gray-700 dark:text-white"
                                   onchange="search.setPriceRange()">
                            <input type="number"
                                   id="price-max"
                                   placeholder="${window.app.t('filters.max')}"
                                   class="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600
                                          rounded dark:bg-gray-700 dark:text-white"
                                   onchange="search.setPriceRange()">
                        </div>
                    </div>

                    <!-- Рейтинг -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.minRating')}
                        </label>
                        <div class="flex gap-1">
                            ${[1, 2, 3, 4, 5].map(rating => `
                                <button onclick="search.setRating(${rating})"
                                        class="rating-star text-2xl ${this.filters.rating >= rating ? 'text-yellow-400' : 'text-gray-300'}">
                                    ⭐
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Популярні теги -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.popularTags')}
                        </label>
                        <div class="flex flex-wrap gap-2">
                            ${['modern', 'classic', 'minimalist', 'industrial', 'luxury'].map(tag => `
                                <button onclick="search.toggleTag('${tag}')"
                                        class="tag-btn px-3 py-1 rounded-full text-sm
                                               ${this.filters.tags.includes(tag)
                                                   ? 'bg-blue-500 text-white'
                                                   : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
                                               hover:bg-blue-600">
                                    #${tag}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Додаткові опції -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('filters.additional')}
                        </label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox"
                                       checked="${this.filters.freeOnly}"
                                       onchange="search.toggleOption('freeOnly', this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">${window.app.t('filters.onlyFree')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox"
                                       checked="${this.filters.withDiscount}"
                                       onchange="search.toggleOption('withDiscount', this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">${window.app.t('filters.withDiscount')}</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox"
                                       checked="${this.filters.newOnly}"
                                       onchange="search.toggleOption('newOnly', this.checked)"
                                       class="mr-2">
                                <span class="dark:text-gray-300">${window.app.t('filters.newOnly')}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <button onclick="search.resetFilters()"
                            class="px-6 py-2 border border-gray-300 dark:border-gray-600
                                   rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        ${window.app.t('buttons.reset')}
                    </button>
                    <button onclick="search.applyCurrentFilters()"
                            class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white
                                   rounded-lg font-medium">
                        ${window.app.t('buttons.apply')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Перемкнути фільтр
     */
    toggleFilter(type, value, checked) {
        if (checked) {
            if (!this.filters[type].includes(value)) {
                this.filters[type].push(value);
            }
        } else {
            this.filters[type] = this.filters[type].filter(v => v !== value);
        }
    }

    /**
     * Встановити ціновий діапазон
     */
    setPriceRange() {
        const minInput = document.getElementById('price-min');
        const maxInput = document.getElementById('price-max');

        this.filters.priceRange = {
            min: minInput ? parseInt(minInput.value) * 100 || null : null,  // Конвертуємо в центи
            max: maxInput ? parseInt(maxInput.value) * 100 || null : null
        };
    }

    /**
     * Встановити рейтинг
     */
    setRating(rating) {
        this.filters.rating = this.filters.rating === rating ? null : rating;
        this.updateFiltersUI();
    }

    /**
     * Перемкнути тег
     */
    toggleTag(tag) {
        const index = this.filters.tags.indexOf(tag);
        if (index > -1) {
            this.filters.tags.splice(index, 1);
        } else {
            this.filters.tags.push(tag);
        }
        this.updateFiltersUI();
    }

    /**
     * Перемкнути опцію
     */
    toggleOption(option, checked) {
        this.filters[option] = checked;
    }

    /**
     * Застосувати поточні фільтри
     */
    applyCurrentFilters() {
        this.applyFilters(this.filters);
    }

    /**
     * Оновити UI фільтрів
     */
    updateFiltersUI() {
        // Оновлюємо зірки рейтингу
        document.querySelectorAll('.rating-star').forEach((star, index) => {
            if (this.filters.rating && index < this.filters.rating) {
                star.classList.add('text-yellow-400');
                star.classList.remove('text-gray-300');
            } else {
                star.classList.remove('text-yellow-400');
                star.classList.add('text-gray-300');
            }
        });

        // Оновлюємо теги
        document.querySelectorAll('.tag-btn').forEach(btn => {
            const tag = btn.textContent.replace('#', '');
            if (this.filters.tags.includes(tag)) {
                btn.classList.add('bg-blue-500', 'text-white');
                btn.classList.remove('bg-gray-200', 'dark:bg-gray-700');
            } else {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'dark:bg-gray-700');
            }
        });
    }
}

// Створюємо та експортуємо єдиний екземпляр
const search = new SearchModule();

// Експортуємо для використання в інших модулях
window.search = search;
