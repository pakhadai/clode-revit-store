/**
 * Модуль для роботи з продуктами
 * LEGACY: Refactored into modular architecture
 */

// NEW MODULAR IMPORTS
import { ProductsAPI } from '../api/ProductsAPI.js';
import { ProductService } from '../services/ProductService.js';
import { ProductCard } from '../components/ProductCard.js';
import { ProductFilters } from '../components/ProductFilters.js';
import { ProductDetailView } from '../views/ProductDetailView.js';
import { productHelpers } from '../utils/productHelpers.js';

class ProductsModule {
    constructor() {
        // LEGACY: Original constructor preserved
        this.products = [];
        this.currentProduct = null;

        // NEW: Modular services
        this.api = new ProductsAPI();
        this.service = new ProductService();
        this.helpers = productHelpers;
        this.currentFilters = null;

        // Initialize filters with callback
        this.productFilters = new ProductFilters((filters) => {
            this.filters = filters;
            this.loadProducts();
        });
    }

    async loadProducts(page = 1, append = false) {
        try {
            Utils.showLoader(true);

            this.currentPage = page;
            const params = {
                page: this.currentPage,
                ...this.filters
            };

            const response = await this.api.getProducts(params);

            if (append) {
                this.products.push(...response.products);
            } else {
                this.products = response.products;
            }
            this.totalPages = response.pagination.total_pages;

        } catch (error) {
            console.error('Load products error:', error);
            Utils.showNotification(window.app.t('notifications.productsLoadError'), 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Завантажити один продукт
     */
    async loadProduct(productId) {
        try {
            Utils.showLoader(true);

            const product = await api.getProduct(productId, Utils.getCurrentLanguage());
            this.currentProduct = product;

            return product;

        } catch (error) {
            console.error('Load product error:', error);
            Utils.showNotification(window.app.t('notifications.productLoadError'), 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Завантажити продукти для головної сторінки
     */
    async loadFeaturedProducts() {
        try {
            return await api.getFeaturedProducts(Utils.getCurrentLanguage());
        } catch (error) {
            console.error('Load featured products error:', error);
            return {
                new_products: [],
                featured_products: [],
                product_of_week: null
            };
        }
    }

    /**
     * Встановити фільтр
     */
    setFilter(key, value) {
        this.filters[key] = value;
        this.currentPage = 1; // Скидаємо на першу сторінку при зміні фільтрів
    }

    /**
     * Очистити фільтри
     */
    clearFilters() {
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
        this.currentPage = 1;
    }

    /**
     * Пошук продуктів
     */
    async search(query) {
        this.setFilter('search', query);
        return await this.loadProducts();
    }

    createProductCard(product) {
        const card = new ProductCard(product);
        return card.render();
    }


    /**
     * Створити зірочки рейтингу
     */
    createRatingStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '⭐';
            } else if (i - 0.5 <= rating) {
                stars += '⭐';
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    createProductPage(product) {
        const view = new ProductDetailView(product);
        window.productDetailView = view;
        return view.render();
    }

    async toggleFavorite(productId) {
        try {
            const response = await api.toggleFavorite(productId);
            Utils.showNotification(response.message, 'success');

            // Оновлюємо UI
            const btn = document.querySelector(`.favorite-btn[data-product-id="${productId}"]`);
            if (btn) {
                btn.innerHTML = response.is_favorite ? '❤️' : '🤍';
            }

            // Haptic feedback
            auth.hapticFeedback('impact', 'light');

            return response;
        } catch (error) {
            console.error('Toggle favorite error:', error);
            Utils.showNotification(window.app.t('notifications.favoriteError'), 'error');
        }
    }

    /**
     * Поділитися продуктом
     */
    async shareProduct(productId) {
        const product = this.currentProduct || this.products.find(p => p.id === productId);
        if (!product) return;

        const shareUrl = `${window.location.origin}/product/${productId}`;
        const shareText = `${product.title} - OhMyRevit`;

        // Якщо є Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareText,
                    text: product.description,
                    url: shareUrl
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Копіюємо посилання
            await Utils.copyToClipboard(shareUrl);
        }
    }

    /**
     * Завантажити продукт
     */
    async downloadProduct(productId, method = 'direct') {
        Utils.showLoader(true);
        try {
            if (method === 'bot') {
                // --- ЛОГІКА ДЛЯ КНОПКИ "НАДІСЛАТИ В TELEGRAM" ---
                const response = await api.get(`/products/${productId}/download`, {
                    language: Utils.getCurrentLanguage(),
                    via_bot: true
                });
                Utils.showNotification(response.message, 'success');
            } else {
                // --- СТАНДАРТНА ЛОГІКА ДЛЯ КНОПКИ "ЗАВАНТАЖИТИ" ---
                const product = this.currentProduct || this.products.find(p => p.id === productId) || {};
                const filename = `${product.sku || 'archive'}.zip`;
                const downloadUrl = `${api.baseURL}/products/${productId}/download?token=${api.token}`;

                // Найнадійніший спосіб для завантаження - відкрити посилання в новій вкладці
                window.open(downloadUrl, '_blank');
                Utils.showNotification(window.app.t('notifications.downloadStarted'), 'info');
            }
        } catch (error) {
            console.error('Download error:', error);
            Utils.showNotification(error.message, 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Пошук по тегу
     */
    searchByTag(tag) {
        this.setFilter('tags', tag);
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market' } }));
    }
}

// Створюємо та експортуємо єдиний екземпляр
const products = new ProductsModule();

// Експортуємо для використання в інших модулях
window.products = products;

export default products;