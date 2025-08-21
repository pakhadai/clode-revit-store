/**
 * Модуль для роботи з обраними товарами
 */

class FavoritesModule {
    constructor() {
        this.favorites = [];
        this.loadFavorites();
    }

    /**
     * Завантажити обрані з localStorage
     */
    loadFavorites() {
        this.favorites = Utils.storage.get('favorites', []);
    }

    /**
     * Зберегти обрані в localStorage
     */
    saveFavorites() {
        Utils.storage.set('favorites', this.favorites);
    }

    /**
     * Синхронізувати з сервером
     */
    async syncWithServer() {
        if (!auth.isAuthenticated()) return;

        try {
            const response = await api.get('/products/user/favorites', {
                language: Utils.getCurrentLanguage()
            });

            this.favorites = response.map(item => item.id);
            this.saveFavorites();
        } catch (error) {
            console.error('Sync favorites error:', error);
        }
    }

    /**
     * Додати/видалити з обраного
     */
    async toggleFavorite(productId) {
        const index = this.favorites.indexOf(productId);
        const isInFavorites = index > -1;

        // Оптимістичне оновлення UI
        if (isInFavorites) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(productId);
        }

        this.saveFavorites();
        this.updateFavoriteButtons(productId, !isInFavorites);

        // Якщо авторизований - синхронізуємо з сервером
        if (auth.isAuthenticated()) {
            try {
                const response = await products.toggleFavorite(productId);

                // Оновлюємо локальний стан згідно з сервером
                if (response.is_favorite && !this.favorites.includes(productId)) {
                    this.favorites.push(productId);
                } else if (!response.is_favorite && this.favorites.includes(productId)) {
                    const idx = this.favorites.indexOf(productId);
                    this.favorites.splice(idx, 1);
                }

                this.saveFavorites();
            } catch (error) {
                // Відкатуємо зміни при помилці
                if (isInFavorites) {
                    this.favorites.push(productId);
                } else {
                    const idx = this.favorites.indexOf(productId);
                    if (idx > -1) this.favorites.splice(idx, 1);
                }

                this.saveFavorites();
                this.updateFavoriteButtons(productId, isInFavorites);

                Utils.showNotification(window.app.t('favorites.syncError'), 'error');
            }
        } else {
            // Для неавторизованих - просто локальне збереження
            Utils.showNotification(
                !isInFavorites
                    ? window.app.t('favorites.added')
                    : window.app.t('favorites.removed'),
                'success'
            );
        }

        // Haptic feedback
        if (auth.hapticFeedback) {
            auth.hapticFeedback('impact', 'light');
        }
    }

    /**
     * Перевірити чи в обраному
     */
    isFavorite(productId) {
        return this.favorites.includes(productId);
    }

    /**
     * Отримати кількість обраних
     */
    getCount() {
        return this.favorites.length;
    }

    /**
     * Оновити кнопки обраного
     */
    updateFavoriteButtons(productId, isFavorite) {
        document.querySelectorAll(`.favorite-btn[data-product-id="${productId}"]`).forEach(btn => {
            const icon = btn.querySelector('.favorite-icon') || btn;

            if (isFavorite) {
                icon.innerHTML = '❤️';
                btn.classList.add('is-favorite');
                btn.setAttribute('title', window.app.t('favorites.removeFromFavorites'));
            } else {
                icon.innerHTML = '🤍';
                btn.classList.remove('is-favorite');
                btn.setAttribute('title', window.app.t('favorites.addToFavorites'));
            }
        });
    }

    /**
     * Створити сторінку обраного
     */
    async createFavoritesPage() {
        if (this.favorites.length === 0) {
            return `
                <div class="favorites-page">
                    <h1 class="text-3xl font-bold mb-6 dark:text-white">
                        ❤️ ${window.app.t('favorites.title')}
                    </h1>

                    <div class="empty-favorites text-center py-16">
                        <div class="text-6xl mb-4">💔</div>
                        <h2 class="text-2xl font-bold mb-4 dark:text-white">
                            ${window.app.t('favorites.empty')}
                        </h2>
                        <p class="text-gray-600 dark:text-gray-400 mb-8">
                            ${window.app.t('favorites.emptyDesc')}
                        </p>
                        <button onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market' } }))"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                            ${window.app.t('favorites.goToMarket')}
                        </button>
                    </div>
                </div>
            `;
        }

        // Завантажуємо інформацію про обрані товари
        Utils.showLoader(true);

        try {
            const favoriteProducts = [];

            // Якщо авторизований - отримуємо з сервера
            if (auth.isAuthenticated()) {
                const response = await api.get('/products/user/favorites', {
                    language: Utils.getCurrentLanguage()
                });
                favoriteProducts.push(...response);
            } else {
                // Для неавторизованих - завантажуємо по ID
                for (const productId of this.favorites) {
                    try {
                        const product = await api.getProduct(productId, Utils.getCurrentLanguage());
                        favoriteProducts.push(product);
                    } catch (error) {
                        console.error(`Failed to load product ${productId}:`, error);
                    }
                }
            }

            return `
                <div class="favorites-page">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-3xl font-bold dark:text-white">
                            ❤️ ${window.app.t('favorites.title')} (${favoriteProducts.length})
                        </h1>

                        <div class="flex gap-3">
                            <button onclick="favorites.clearAll()"
                                    class="text-red-500 hover:text-red-600 px-4 py-2 rounded-lg
                                           border border-red-500 hover:bg-red-50 dark:hover:bg-red-900">
                                ${window.app.t('favorites.clearAll')}
                            </button>

                            <button onclick="favorites.addAllToCart()"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                                ${window.app.t('favorites.addAllToCart')}
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${favoriteProducts.map(product => this.createFavoriteCard(product)).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Load favorites error:', error);
            return this.createErrorPage();
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Створити картку обраного товару
     */
    createFavoriteCard(product) {
        const isFree = product.is_free || product.price === 0;
        const hasDiscount = product.discount_percent > 0;
        const currentPrice = product.current_price || product.price;

        return `
            <div class="favorite-card bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl
                        transition-shadow cursor-pointer relative"
                 data-product-id="${product.id}">

                <button onclick="favorites.toggleFavorite(${product.id})"
                        class="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-gray-800
                               rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    <span class="text-xl">❤️</span>
                </button>

                <div onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'product', params: { id: ${product.id} } } }))"
                     class="block">
                    <div class="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                        ${product.preview_image ?
                            `<img src="${product.preview_image}" alt="${product.title}"
                                  class="w-full h-full object-cover">` :
                            `<div class="flex items-center justify-center h-full text-gray-400">
                                <span class="text-4xl">📦</span>
                             </div>`
                        }

                        <div class="absolute top-2 left-2 flex flex-col gap-1">
                            ${isFree ? `<span class="badge bg-green-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.free')}</span>` : ''}
                            ${hasDiscount ? `<span class="badge bg-red-500 text-white px-2 py-1 rounded text-xs">-${product.discount_percent}%</span>` : ''}
                        </div>
                    </div>

                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-2 dark:text-white line-clamp-2">
                            ${product.title}
                        </h3>

                        ${product.rating > 0 ? `
                            <div class="flex items-center mb-3">
                                <div class="flex text-yellow-400">
                                    ${products.createRatingStars(product.rating)}
                                </div>
                                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                    ${product.rating.toFixed(1)}
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

                            <button onclick="event.stopPropagation(); cart.addToCart(${product.id})"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded
                                           transition-colors text-sm">
                                🛒
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Очистити всі обрані
     */
    async clearAll() {
        const confirmed = await new Promise(resolve => {
            auth.showConfirm(window.app.t('favorites.clearConfirm'), resolve);
        });

        if (!confirmed) return;

        this.favorites = [];
        this.saveFavorites();

        // Якщо авторизований - очищаємо на сервері
        if (auth.isAuthenticated()) {
            try {
                // Видаляємо всі по одному (немає масового API)
                for (const productId of this.favorites) {
                    await products.toggleFavorite(productId);
                }
            } catch (error) {
                console.error('Clear favorites error:', error);
            }
        }

        Utils.showNotification(window.app.t('favorites.cleared'), 'success');
        window.app.render();
    }

    /**
     * Додати всі обрані в кошик
     */
    async addAllToCart() {
        if (this.favorites.length === 0) {
            Utils.showNotification(window.app.t('favorites.nothingToAdd'), 'warning');
            return;
        }

        let addedCount = 0;

        for (const productId of this.favorites) {
            try {
                await cart.addToCart(productId);
                addedCount++;
            } catch (error) {
                console.error(`Failed to add product ${productId} to cart:`, error);
            }
        }

        if (addedCount > 0) {
            Utils.showNotification(
                window.app.t('favorites.addedToCart').replace('{count}', addedCount),
                'success'
            );
        }
    }

    /**
     * Створити сторінку помилки
     */
    createErrorPage() {
        return `
            <div class="error-page text-center py-16">
                <div class="text-6xl mb-4">❌</div>
                <h1 class="text-3xl font-bold mb-4 dark:text-white">
                    ${window.app.t('favorites.loadError')}
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">
                    ${window.app.t('favorites.loadErrorDesc')}
                </p>
                <button onclick="location.reload()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    ${window.app.t('buttons.retry')}
                </button>
            </div>
        `;
    }
}

// Створюємо та експортуємо єдиний екземпляр
const favorites = new FavoritesModule();

// Експортуємо для використання в інших модулях
window.favorites = favorites;

export default favorites;