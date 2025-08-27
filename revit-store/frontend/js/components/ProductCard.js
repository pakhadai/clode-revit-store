// js/components/ProductCard.js
export class ProductCard {
    constructor(product, options = {}) {
        this.product = product;
        this.options = {
            showRating: true,
            showPrice: true,
            showActions: true,
            ...options
        };
    }

    render() {
        const { product } = this;
        const isFree = product.is_free || product.price === 0;
        const hasDiscount = product.discount_percent > 0;
        const currentPrice = product.current_price || product.price;

        return `
            <div class="product-card bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                 data-product-id="${product.id}">
                ${this.renderImage()}
                ${this.renderContent(isFree, hasDiscount, currentPrice)}
            </div>
        `;
    }

    renderImage() {
        const { product } = this;
        const isFree = product.is_free || product.price === 0;
        const hasDiscount = product.discount_percent > 0;

        return `
            <div class="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                ${product.preview_images && product.preview_images[0] ?
                    `<img src="${product.preview_images[0]}" alt="${product.title}"
                          class="w-full h-full object-cover">` :
                    `<div class="flex items-center justify-center h-full text-gray-400">
                        <span class="text-4xl">📦</span>
                     </div>`
                }
                ${this.renderBadges(isFree, hasDiscount)}
                ${this.renderFavoriteButton()}
            </div>
        `;
    }

    renderBadges(isFree, hasDiscount) {
        const badges = [];
        if (isFree) badges.push(`<span class="badge bg-green-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.free')}</span>`);
        if (this.product.is_new) badges.push(`<span class="badge bg-blue-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.new')}</span>`);
        if (hasDiscount) badges.push(`<span class="badge bg-red-500 text-white px-2 py-1 rounded text-xs">-${this.product.discount_percent}%</span>`);
        if (this.product.is_featured) badges.push(`<span class="badge bg-purple-500 text-white px-2 py-1 rounded text-xs">${window.app.t('product.featured')}</span>`);

        return badges.length > 0 ? `
            <div class="absolute top-2 left-2 flex flex-col gap-1">
                ${badges.join('')}
            </div>
        ` : '';
    }

    renderFavoriteButton() {
        return `
            <button class="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md
                           hover:bg-gray-100 dark:hover:bg-gray-700 collection-btn"
                    data-product-id="${this.product.id}"
                    onclick="event.stopPropagation(); collections.showAddToCollectionModal(${this.product.id})">
                <span class="text-xl">${this.product.collection_icon || '🤍'}</span>
            </button>
        `;
    }

    renderContent(isFree, hasDiscount, currentPrice) {
        return `
            <div class="p-4">
                <h3 class="font-bold text-lg mb-2 dark:text-white line-clamp-2">
                    ${this.product.title}
                </h3>
                ${this.renderDescription()}
                ${this.options.showRating ? this.renderRating() : ''}
                ${this.options.showActions ? this.renderActions(isFree, hasDiscount, currentPrice) : ''}
            </div>
        `;
    }

    renderDescription() {
        return this.product.description ? `
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                ${this.product.description}
            </p>
        ` : '';
    }

    renderRating() {
        if (this.product.rating <= 0) return '';

        return `
            <div class="flex items-center mb-3">
                <div class="flex text-yellow-400">
                    ${this.createRatingStars(this.product.rating)}
                </div>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    ${this.product.rating.toFixed(1)} (${this.product.ratings_count})
                </span>
            </div>
        `;
    }

    renderActions(isFree, hasDiscount, currentPrice) {
        return `
            <div class="flex items-center justify-between">
                ${this.renderPrice(isFree, hasDiscount, currentPrice)}
                ${this.renderAddToCartButton()}
            </div>
        `;
    }

    renderPrice(isFree, hasDiscount, currentPrice) {
        if (!this.options.showPrice) return '';

        return `
            <div class="price">
                ${isFree ?
                    `<span class="text-green-500 font-bold text-xl">${window.app.t('product.free')}</span>` :
                    `<div>
                        ${hasDiscount ?
                            `<span class="text-gray-400 line-through text-sm">
                                ${Utils.formatPrice(this.product.price)}
                            </span>` : ''
                        }
                        <span class="text-blue-600 dark:text-blue-400 font-bold text-xl">
                            ${Utils.formatPrice(currentPrice)}
                        </span>
                    </div>`
                }
            </div>
        `;
    }

    renderAddToCartButton() {
        return `
            <button class="add-to-cart-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg
                           transition-colors flex items-center gap-2"
                    data-product-id="${this.product.id}"
                    onclick="event.stopPropagation()">
                <span>🛒</span>
                <span class="hidden sm:inline">${window.app.t('product.addToCart')}</span>
            </button>
        `;
    }

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
}

window.ProductCard = ProductCard;
export default ProductCard;