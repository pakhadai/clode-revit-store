// js/views/ProductDetailView.js
import products from '../modules/products.js';

export class ProductDetailView {
    constructor(product) {
        this.product = product;
    }

    render() {
        const isFree = this.product.is_free || this.product.price === 0;
        const hasDiscount = this.product.discount_percent > 0;
        const currentPrice = this.product.current_price || this.product.price;

        return `
            <div class="product-page max-w-6xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    ${this.renderGallery()}
                    ${this.renderInfo(isFree, hasDiscount, currentPrice)}
                </div>
            </div>
        `;
    }

    renderGallery() {
        return `
            <div class="gallery">
                ${this.renderMainImage()}
                ${this.renderThumbnails()}
            </div>
        `;
    }

    renderMainImage() {
        return `
            <div class="main-image bg-gray-200 dark:bg-gray-700 rounded-lg h-96 mb-4">
                ${this.product.preview_images && this.product.preview_images[0] ?
                    `<img src="${this.product.preview_images[0]}" alt="${this.product.title}"
                          class="w-full h-full object-contain rounded-lg">` :
                    `<div class="flex items-center justify-center h-full text-gray-400">
                        <span class="text-6xl">📦</span>
                     </div>`
                }
            </div>
        `;
    }

    renderThumbnails() {
        if (!this.product.preview_images || this.product.preview_images.length <= 1) return '';

        return `
            <div class="thumbnails grid grid-cols-4 gap-2">
                ${this.product.preview_images.map((img, index) => `
                    <img src="${img}" alt="Preview ${index + 1}"
                         class="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                         onclick="productDetailView.selectImage(${index})">
                `).join('')}
            </div>
        `;
    }

    renderInfo(isFree, hasDiscount, currentPrice) {
        return `
            <div class="product-info">
                ${this.renderTitle()}
                ${this.renderBadges(isFree)}
                ${this.renderRating()}
                ${this.renderStats()}
                ${this.renderPrice(isFree, hasDiscount, currentPrice)}
                ${this.renderActions()}
                ${this.renderDescription()}
                ${this.renderTags()}
                ${this.renderCreator()}
            </div>
        `;
    }

    renderTitle() {
        return `<h1 class="text-3xl font-bold mb-4 dark:text-white">${this.product.title}</h1>`;
    }

    renderBadges(isFree) {
        const badges = [];
        if (isFree) badges.push(`<span class="badge bg-green-500 text-white px-3 py-1 rounded">${window.app.t('product.free')}</span>`);
        if (this.product.is_new) badges.push(`<span class="badge bg-blue-500 text-white px-3 py-1 rounded">${window.app.t('product.new')}</span>`);
        if (this.product.is_featured) badges.push(`<span class="badge bg-purple-500 text-white px-3 py-1 rounded">${window.app.t('product.featured')}</span>`);
        if (this.product.requires_subscription) badges.push(`<span class="badge bg-yellow-500 text-white px-3 py-1 rounded">${window.app.t('product.requiresSubscription')}</span>`);

        return badges.length > 0 ? `
            <div class="flex gap-2 mb-4">
                ${badges.join('')}
            </div>
        ` : '';
    }

    renderRating() {
        if (this.product.rating <= 0) return '';

        return `
            <div class="flex items-center mb-4">
                <div class="flex text-yellow-400 text-xl">
                    ${this.createRatingStars(this.product.rating)}
                </div>
                <span class="ml-3 text-gray-600 dark:text-gray-400">
                    ${this.product.rating.toFixed(1)} ${window.app.t('product.stats.rating')}
                    (${this.product.ratings_count} ${Utils.pluralize(this.product.ratings_count, [
                        window.app.t('product.stats.ratingCount'),
                        window.app.t('product.stats.ratingsCount'),
                        window.app.t('product.stats.ratingsCountMany')
                    ])})
                </span>
            </div>
        `;
    }

    renderStats() {
        return `
            <div class="stats flex gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
                <span>📥 ${this.product.downloads_count} ${window.app.t('product.stats.downloads')}</span>
                <span>👁 ${this.product.views_count} ${window.app.t('product.stats.views')}</span>
                ${this.product.file_size ? `<span>📁 ${Utils.formatFileSize(this.product.file_size)}</span>` : ''}
            </div>
        `;
    }

    renderPrice(isFree, hasDiscount, currentPrice) {
        return `
            <div class="price-block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
                ${isFree ?
                    `<div class="text-green-500 font-bold text-3xl">${window.app.t('product.free')}</div>` :
                    `<div>
                        ${hasDiscount ?
                            `<div class="text-gray-400 line-through text-lg">
                                ${Utils.formatPrice(this.product.price)}
                            </div>` : ''
                        }
                        <div class="text-blue-600 dark:text-blue-400 font-bold text-3xl">
                            ${Utils.formatPrice(currentPrice)}
                        </div>
                        ${hasDiscount && this.product.discount_ends_at ?
                            `<div class="text-sm text-red-500 mt-2">
                                ${window.app.t('product.discount.endsAt')}: ${Utils.formatDate(this.product.discount_ends_at)}
                            </div>` : ''
                        }
                    </div>`
                }
            </div>
        `;
    }

    renderActions() {
        return `
            <div class="actions flex flex-col gap-3 mb-6">
                ${this.product.can_download ?
                    this.renderDownloadButtons() :
                    this.renderAddToCartButton()
                }
            </div>
        `;
    }

    renderDownloadButtons() {
        return `
            <div class="flex gap-3">
                <button class="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg
                               font-bold transition-colors flex items-center justify-center gap-2"
                        onclick="products.downloadProduct(${this.product.id}, 'direct')">
                    <span>📥</span> ${window.app.t('buttons.download')}
                </button>
                <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg
                               font-bold transition-colors"
                        onclick="products.downloadProduct(${this.product.id}, 'bot')"
                        title="Надіслати в Telegram">
                    ✈️
                </button>
            </div>
        `;
    }

    renderAddToCartButton() {
        return `
            <button class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                           font-bold transition-colors flex items-center justify-center gap-2"
                    onclick="cart.addToCart(${this.product.id})">
                <span>🛒</span> ${window.app.t('product.addToCart')}
            </button>
        `;
    }

    renderDescription() {
        return `
            <div class="description mb-6">
                <h3 class="text-xl font-bold mb-3 dark:text-white">${window.app.t('product.description')}</h3>
                <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    ${this.product.description || window.app.t('product.noDescription')}
                </div>
            </div>
        `;
    }

    renderTags() {
        if (!this.product.tags || this.product.tags.length === 0) return '';

        return `
            <div class="tags mb-6">
                <h3 class="text-xl font-bold mb-3 dark:text-white">${window.app.t('product.tags')}</h3>
                <div class="flex flex-wrap gap-2">
                    ${this.product.tags.map(tag => `
                        <span class="tag bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm
                                   hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
                              onclick="products.searchByTag('${tag}')">
                            #${tag}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCreator() {
        if (!this.product.creator) return '';

        return `
            <div class="creator-info bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">👤</span>
                    <div>
                        <div class="font-bold dark:text-white">
                            ${this.product.creator.first_name || this.product.creator.username}
                            ${this.product.creator.verified ? `<span class="text-blue-500">✓</span>` : ''}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('product.creator')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    createRatingStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= rating ? '⭐' : '☆';
        }
        return stars;
    }

    selectImage(index) {
        const mainImage = document.querySelector('.main-image img');
        if (mainImage && this.product.preview_images[index]) {
            mainImage.src = this.product.preview_images[index];
        }
    }
}

window.ProductDetailView = ProductDetailView;
export default ProductDetailView;