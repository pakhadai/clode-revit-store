// js/components/ProductFilters.js
export class ProductFilters {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.filters = {
            category: null,
            product_type: null,
            min_price: null,
            max_price: null,
            is_free: null,
            is_featured: null,
            is_new: null,
            has_discount: null,
            search: '',
            tags: '',
            sort_by: 'created_at',
            sort_order: 'desc'
        };
    }

    render() {
        return `
            <div class="filters bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
                ${this.renderMainFilters()}
                ${this.renderCheckboxFilters()}
            </div>
        `;
    }

    renderMainFilters() {
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${this.renderCategorySelect()}
                ${this.renderTypeSelect()}
                ${this.renderSortSelect()}
                ${this.renderSearchInput()}
            </div>
        `;
    }

    renderCategorySelect() {
        return `
            <select id="filter-category" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onchange="productFilters.updateFilter('category', this.value)">
                <option value="">${window.app.t('market.filters.allCategories')}</option>
                <option value="free">🆓 ${window.app.t('market.filters.free')}</option>
                <option value="premium">⭐ ${window.app.t('market.filters.premium')}</option>
                <option value="creator">🎨 ${window.app.t('market.filters.fromCreators')}</option>
            </select>
        `;
    }

    renderTypeSelect() {
        return `
            <select id="filter-type" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onchange="productFilters.updateFilter('product_type', this.value)">
                <option value="">${window.app.t('market.filters.allTypes')}</option>
                <option value="furniture">🪑 ${window.app.t('market.filters.furniture')}</option>
                <option value="textures">🎨 ${window.app.t('market.filters.textures')}</option>
                <option value="components">🔧 ${window.app.t('market.filters.components')}</option>
            </select>
        `;
    }

    renderSortSelect() {
        return `
            <select id="filter-sort" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onchange="productFilters.applySorting(this.value)">
                <option value="created_at-desc">${window.app.t('market.sorting.newest')}</option>
                <option value="price-asc">${window.app.t('market.sorting.priceAsc')}</option>
                <option value="price-desc">${window.app.t('market.sorting.priceDesc')}</option>
                <option value="rating-desc">${window.app.t('market.sorting.rating')}</option>
                <option value="downloads-desc">${window.app.t('market.sorting.popularity')}</option>
            </select>
        `;
    }

    renderSearchInput() {
        return `
            <div class="relative">
                <input type="text" id="search-input" class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                       placeholder="${window.app.t('market.filters.search')}" onkeyup="productFilters.handleSearch(event)">
                <button onclick="productFilters.doSearch()" class="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">🔍</button>
            </div>
        `;
    }

    renderCheckboxFilters() {
        return `
            <div class="mt-4 flex flex-wrap gap-2">
                <label class="inline-flex items-center">
                    <input type="checkbox" onchange="productFilters.updateFilter('is_free', this.checked)" class="mr-2">
                    <span class="dark:text-gray-300">${window.app.t('market.filters.onlyFree')}</span>
                </label>
                <label class="inline-flex items-center">
                    <input type="checkbox" onchange="productFilters.updateFilter('is_new', this.checked)" class="mr-2">
                    <span class="dark:text-gray-300">${window.app.t('market.filters.new')}</span>
                </label>
                <label class="inline-flex items-center">
                    <input type="checkbox" onchange="productFilters.updateFilter('has_discount', this.checked)" class="mr-2">
                    <span class="dark:text-gray-300">${window.app.t('market.filters.withDiscount')}</span>
                </label>
            </div>
        `;
    }

    updateFilter(key, value) {
        this.filters[key] = value;
        if (this.onFilterChange) {
            this.onFilterChange(this.filters);
        }
    }

    applySorting(value) {
        const [sortBy, sortOrder] = value.split('-');
        this.filters.sort_by = sortBy;
        this.filters.sort_order = sortOrder;
        if (this.onFilterChange) {
            this.onFilterChange(this.filters);
        }
    }

    handleSearch(event) {
        if (event.key === 'Enter') {
            this.doSearch();
        }
    }

    doSearch() {
        const input = document.getElementById('search-input');
        if (input) {
            this.filters.search = input.value;
            if (this.onFilterChange) {
                this.onFilterChange(this.filters);
            }
        }
    }

    reset() {
        this.filters = {
            category: null,
            product_type: null,
            min_price: null,
            max_price: null,
            is_free: null,
            is_featured: null,
            is_new: null,
            has_discount: null,
            search: '',
            tags: '',
            sort_by: 'created_at',
            sort_order: 'desc'
        };
        if (this.onFilterChange) {
            this.onFilterChange(this.filters);
        }
    }
}

window.ProductFilters = ProductFilters;
export default ProductFilters;