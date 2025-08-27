// js/views/MarketView.js
import { BaseView } from './BaseView.js';

export class MarketView extends BaseView {
    async render() {
        await products.loadProducts();

        return `
            <div class="market-page">
                <h1 class="text-3xl font-bold mb-6 dark:text-white">🛍️ ${this.app.t('market.title')}</h1>
                ${this.renderMarketFilters()}
                <div id="products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${products.products.map(product => products.createProductCard(product)).join('')}
                </div>
                ${this.renderPagination()}
            </div>
        `;
    }

    renderMarketFilters() {
        return `
            <div class="filters bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <select id="filter-category" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            onchange="products.setFilter('category', this.value); app.applyFilters()">
                        <option value="">${this.app.t('market.filters.allCategories')}</option>
                        <option value="free">🆓 ${this.app.t('market.filters.free')}</option>
                        <option value="premium">⭐ ${this.app.t('market.filters.premium')}</option>
                        <option value="creator">🎨 ${this.app.t('market.filters.fromCreators')}</option>
                    </select>
                    <select id="filter-type" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            onchange="products.setFilter('product_type', this.value); app.applyFilters()">
                        <option value="">${this.app.t('market.filters.allTypes')}</option>
                        <option value="furniture">🪑 ${this.app.t('market.filters.furniture')}</option>
                        <option value="textures">🎨 ${this.app.t('market.filters.textures')}</option>
                        <option value="components">🔧 ${this.app.t('market.filters.components')}</option>
                    </select>
                    <select id="filter-sort" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            onchange="app.applySorting(this.value)">
                        <option value="created_at-desc">${this.app.t('market.sorting.newest')}</option>
                        <option value="price-asc">${this.app.t('market.sorting.priceAsc')}</option>
                        <option value="price-desc">${this.app.t('market.sorting.priceDesc')}</option>
                        <option value="rating-desc">${this.app.t('market.sorting.rating')}</option>
                        <option value="downloads-desc">${this.app.t('market.sorting.popularity')}</option>
                    </select>
                    <div class="relative">
                        <input type="text" id="search-input" class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                               placeholder="${this.app.t('market.filters.search')}" onkeyup="app.handleSearch(event)">
                        <button onclick="app.doSearch()" class="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">🔍</button>
                    </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <label class="inline-flex items-center">
                        <input type="checkbox" onchange="products.setFilter('is_free', this.checked); app.applyFilters()" class="mr-2">
                        <span class="dark:text-gray-300">${this.app.t('market.filters.onlyFree')}</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="checkbox" onchange="products.setFilter('is_new', this.checked); app.applyFilters()" class="mr-2">
                        <span class="dark:text-gray-300">${this.app.t('market.filters.new')}</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="checkbox" onchange="products.setFilter('has_discount', this.checked); app.applyFilters()" class="mr-2">
                        <span class="dark:text-gray-300">${this.app.t('market.filters.withDiscount')}</span>
                    </label>
                </div>
            </div>
        `;
    }

    renderPagination() {
        if (products.totalPages <= 1) return '';

        return `
            <div class="pagination flex justify-center gap-2 mt-8">
                ${products.currentPage > 1 ?
                    `<button onclick="app.loadPage(${products.currentPage - 1})"
                             class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                        ← ${this.app.t('market.pagination.prev')}
                    </button>` : ''
                }
                <span class="px-4 py-2 dark:text-white">
                    ${this.app.t('market.pagination.page')} ${products.currentPage} ${this.app.t('market.pagination.of')} ${products.totalPages}
                </span>
                ${products.currentPage < products.totalPages ?
                    `<button onclick="app.loadPage(${products.currentPage + 1})"
                             class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                        ${this.app.t('market.pagination.next')} →
                    </button>` : ''
                }
            </div>
        `;
    }
}