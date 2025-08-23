/**
 * Модуль для роботи з продуктами
 */

class ProductsModule {
    constructor() {
        this.products = [];
        this.currentProduct = null;
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
        this.limit = 20;
        this.totalPages = 1;
    }

    /**
     * Завантажити продукти
     */
    async loadProducts(page = 1, append = false) {
        try {
            Utils.showLoader(true);

            this.currentPage = page;

            // Формуємо параметри запиту
            const params = {
                page: this.currentPage,
                limit: this.limit,
                language: Utils.getCurrentLanguage(),
                ...this.filters
            };

            // Видаляємо пусті параметри
            Object.keys(params).forEach(key => {
                if (params[key] === null || params[key] === '' || params[key] === undefined) {
                    delete params[key];
                }
            });

            const response = await api.getProducts(params);

            if (append) {
                this.products = [...this.products, ...response.products];
            } else {
                this.products = response.products;
            }

            this.totalPages = response.pagination.total_pages;

            return response;

        } catch (error) {
            console.error('Load products error:', error);
            Utils.showNotification(window.app.t('notifications.productsLoadError'), 'error');
            throw error;
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

    /**
     * Створити HTML картки продукту
     */
    createProductCard(product) {
        const isFree = product.is_free || product.price === 0;
        const hasDiscount = product.discount_percent > 0;
        const currentPrice = product.current_price || product.price;

        return `
            <div class="product-card bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                 data-product-id="${product.id}">

                <div class="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                    ${product.preview_images && product.preview_images[0] ?
                        `<img src="${product.preview_images[0]}" alt="${product.title}"
                              class="w-full h-full object-cover">` :
                        `<div class="flex items-center justify-center h-full text-gray-400">
                            <span class="text-4xl">📦</span>
                         </div>`
                    }

                    <div class="absolute top-2 left-2 flex flex-col gap-1">
                        ${isFree ? `<span class="badge bg-green-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.free')}</span>` : ''}
                        ${product.is_new ? `<span class="badge bg-blue-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.new')}</span>` : ''}
                        ${hasDiscount ? `<span class="badge bg-red-500 text-white px-2 py-1 rounded text-xs">-${product.discount_percent}%</span>` : ''}
                        ${product.is_featured ? `<span class="badge bg-purple-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.featured')}</span>` : ''}
                    </div>

                    <button class="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md
                                   hover:bg-gray-100 dark:hover:bg-gray-700 favorite-btn"
                            data-product-id="${product.id}"
                            onclick="event.stopPropagation()">
                        <span class="text-xl">❤️</span>
                    </button>
                </div>

                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2 dark:text-white line-clamp-2">
                        ${product.title}
                    </h3>

                    ${product.description ?
                        `<p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                            ${product.description}
                        </p>` : ''
                    }

                    ${product.rating > 0 ? `
                        <div class="flex items-center mb-3">
                            <div class="flex text-yellow-400">
                                ${this.createRatingStars(product.rating)}
                            </div>
                            <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                ${product.rating.toFixed(1)} (${product.ratings_count})
                            </span>
                        </div>
                    ` : ''}

                    <div class="flex items-center justify-between">
                        <div class="price">
                            ${isFree ?
                                `<span class="text-green-500 font-bold text-xl">${window.app.t('product.free')}</span>` :
                                `<div>
                                    ${hasDiscount ?
                                        `<span class="text-gray-400 line-through text-sm">
                                            ${Utils.formatPrice(product.price)}
                                        </span>` : ''
                                    }
                                    <span class="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                        ${Utils.formatPrice(currentPrice)}
                                    </span>
                                </div>`
                            }
                        </div>

                        <button class="add-to-cart-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg
                                       transition-colors flex items-center gap-2"
                                data-product-id="${product.id}"
                                onclick="event.stopPropagation()">
                            <span>🛒</span>
                            <span class="hidden sm:inline">${window.app.t('product.addToCart')}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
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
                stars += '⭐'; // Можна замінити на напівзірку
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    /**
     * Створити сторінку продукту
     */
    createProductPage(product) {
        const isFree = product.is_free || product.price === 0;
        const hasDiscount = product.discount_percent > 0;
        const currentPrice = product.current_price || product.price;

        return `
            <div class="product-page max-w-6xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="gallery">
                        <div class="main-image bg-gray-200 dark:bg-gray-700 rounded-lg h-96 mb-4">
                            ${product.preview_images && product.preview_images[0] ?
                                `<img src="${product.preview_images[0]}" alt="${product.title}"
                                      class="w-full h-full object-contain rounded-lg">` :
                                `<div class="flex items-center justify-center h-full text-gray-400">
                                    <span class="text-6xl">📦</span>
                                 </div>`
                            }
                        </div>

                        ${product.preview_images && product.preview_images.length > 1 ? `
                            <div class="thumbnails grid grid-cols-4 gap-2">
                                ${product.preview_images.map((img, index) => `
                                    <img src="${img}" alt="Preview ${index + 1}"
                                         class="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="product-info">
                        <h1 class="text-3xl font-bold mb-4 dark:text-white">${product.title}</h1>

                        <div class="flex gap-2 mb-4">
                            ${isFree ? `<span class="badge bg-green-500 text-white px-3 py-1 rounded">${window.app.t('product.free')}</span>` : ''}
                            ${product.is_new ? `<span class="badge bg-blue-500 text-white px-3 py-1 rounded">${window.app.t('product.new')}</span>` : ''}
                            ${product.is_featured ? `<span class="badge bg-purple-500 text-white px-3 py-1 rounded">${window.app.t('product.featured')}</span>` : ''}
                            ${product.requires_subscription ? `<span class="badge bg-yellow-500 text-white px-3 py-1 rounded">${window.app.t('product.requiresSubscription')}</span>` : ''}
                        </div>

                        ${product.rating > 0 ? `
                            <div class="flex items-center mb-4">
                                <div class="flex text-yellow-400 text-xl">
                                    ${this.createRatingStars(product.rating)}
                                </div>
                                <span class="ml-3 text-gray-600 dark:text-gray-400">
                                    ${product.rating.toFixed(1)} ${window.app.t('product.stats.rating')} (${product.ratings_count} ${Utils.pluralize(product.ratings_count, [window.app.t('product.stats.ratingCount'), window.app.t('product.stats.ratingsCount'), window.app.t('product.stats.ratingsCountMany')])})
                                </span>
                            </div>
                        ` : ''}

                        <div class="stats flex gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
                            <span>📥 ${product.downloads_count} ${window.app.t('product.stats.downloads')}</span>
                            <span>👁 ${product.views_count} ${window.app.t('product.stats.views')}</span>
                            ${product.file_size ? `<span>📁 ${Utils.formatFileSize(product.file_size)}</span>` : ''}
                        </div>

                        <div class="price-block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
                            ${isFree ?
                                `<div class="text-green-500 font-bold text-3xl">${window.app.t('product.free')}</div>` :
                                `<div>
                                    ${hasDiscount ?
                                        `<div class="text-gray-400 line-through text-lg">
                                            ${Utils.formatPrice(product.price)}
                                        </div>` : ''
                                    }
                                    <div class="text-blue-600 dark:text-blue-400 font-bold text-3xl">
                                        ${Utils.formatPrice(currentPrice)}
                                    </div>
                                    ${hasDiscount && product.discount_ends_at ?
                                        `<div class="text-sm text-red-500 mt-2">
                                            ${window.app.t('product.discount.endsAt')}: ${Utils.formatDate(product.discount_ends_at)}
                                        </div>` : ''
                                    }
                                </div>`
                            }
                        </div>

                        <div class="actions flex gap-4 mb-6">
                            ${product.can_download ?
                                `<button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg
                                               font-bold transition-colors flex items-center justify-center gap-2"
                                        onclick="products.downloadProduct(${product.id})">
                                    <span>📥</span> ${window.app.t('buttons.download')}
                                </button>` :
                                `<button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                                               font-bold transition-colors flex items-center justify-center gap-2"
                                        onclick="cart.addToCart(${product.id})">
                                    <span>🛒</span> ${window.app.t('product.addToCart')}
                                </button>`
                            }

                            <button class="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onclick="products.toggleFavorite(${product.id})">
                                <span class="text-2xl">❤️</span>
                            </button>

                            <button class="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onclick="products.shareProduct(${product.id})">
                                <span class="text-2xl">📤</span>
                            </button>
                        </div>

                        <div class="description mb-6">
                            <h3 class="text-xl font-bold mb-3 dark:text-white">${window.app.t('product.description')}</h3>
                            <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                ${product.description || window.app.t('product.noDescription')}
                            </div>
                        </div>

                        ${product.tags && product.tags.length > 0 ? `
                            <div class="tags mb-6">
                                <h3 class="text-xl font-bold mb-3 dark:text-white">${window.app.t('product.tags')}</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${product.tags.map(tag => `
                                        <span class="tag bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm
                                                   hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
                                              onclick="products.searchByTag('${tag}')">
                                            #${tag}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${product.creator ? `
                            <div class="creator-info bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl">👤</span>
                                    <div>
                                        <div class="font-bold dark:text-white">
                                            ${product.creator.first_name || product.creator.username}
                                            ${product.creator.verified ? `<span class="text-blue-500">✓</span>` : ''}
                                        </div>
                                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('product.creator')}</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Додати/видалити з обраного
     */
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
    async downloadProduct(productId) {
        try {
            Utils.showLoader(true);
            const response = await api.get(`/products/${productId}/download`, {
                language: Utils.getCurrentLanguage()
            });

            // Показуємо повідомлення про успіх, яке прийшло з бекенду
            Utils.showNotification(response.message, 'success');

        } catch (error) {
            console.error('Download error:', error);
            // Показуємо помилку з бекенду (напр., "Не вдалося відправити архів...")
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