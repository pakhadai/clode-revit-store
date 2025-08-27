// js/views/HomeView.js
import { BaseView } from './BaseView.js';

export class HomeView extends BaseView {
    async render() {
        const featured = await products.loadFeaturedProducts();
        const user = auth.user;

        return `
            <div class="home-page">
                <div class="subscription-banner bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
                    <h2 class="text-3xl font-bold mb-4">🎯 ${this.app.t('home.subscription.title')}</h2>
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <ul class="space-y-2">
                            <li>✅ ${this.app.t('home.subscription.benefits.newArchives')}</li>
                            <li>✅ ${this.app.t('home.subscription.benefits.bonusSpins')}</li>
                        </ul>
                        <ul class="space-y-2">
                            <li>✅ ${this.app.t('home.subscription.benefits.cashback')}</li>
                            <li>✅ ${this.app.t('home.subscription.benefits.support')}</li>
                        </ul>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            ${this.app.t('home.subscription.monthly')}
                        </button>
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            ${this.app.t('home.subscription.yearly')}
                        </button>
                    </div>
                </div>
                ${this.renderDailyBonus(user)}
                ${this.renderProductOfWeek(featured)}
                ${this.renderNewProducts(featured)}
                ${this.renderFeaturedProducts(featured)}
            </div>
        `;
    }

    renderDailyBonus(user) {
        return `
            <div class="daily-bonus bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
                <h3 class="text-2xl font-bold mb-4 dark:text-white">🎁 ${this.app.t('home.dailyBonus.title')}</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="text-center">
                        <p class="mb-4 dark:text-gray-300">
                            ${this.app.t('home.dailyBonus.streak')}: <span class="font-bold text-blue-600">${user?.daily_streak || 0} ${Utils.pluralize(user?.daily_streak || 0, [this.app.t('home.dailyBonus.day'), this.app.t('home.dailyBonus.days'), this.app.t('home.dailyBonus.daysMany')])}</span>
                        </p>
                        <button onclick="app.claimDailyBonus()"
                                class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                            🎁 ${this.app.t('home.dailyBonus.claimBonus')}
                        </button>
                    </div>
                    <div class="text-center">
                        <p class="mb-4 dark:text-gray-300">
                            ${this.app.t('home.dailyBonus.freeSpins')}: <span class="font-bold text-purple-600">${user?.free_spins_today || 1}</span>
                        </p>
                        <button onclick="wheelGame.init().then(() => wheelGame.open())"
                                class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">
                            🎰 ${this.app.t('home.dailyBonus.spinWheel')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderProductOfWeek(featured) {
        if (!featured.product_of_week) return '';

        const product = featured.product_of_week;
        return `
            <div class="product-of-week bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-8 text-white">
                <h3 class="text-2xl font-bold mb-4">🏆 ${this.app.t('home.productOfWeek.title')}</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-xl font-bold mb-2">${product.title}</h4>
                        <div class="mb-4">
                            <span class="text-3xl font-bold">${Utils.formatPrice(product.current_price)}</span>
                            ${product.discount_percent > 0 ?
                                `<span class="ml-2 bg-red-500 px-2 py-1 rounded">-${product.discount_percent}%</span>` : ''
                            }
                        </div>
                        <button onclick="app.navigateTo('product', true, {id: ${product.id}})"
                                class="bg-white text-orange-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100">
                            ${this.app.t('home.productOfWeek.details')}
                        </button>
                    </div>
                    ${product.preview_image ?
                        `<img src="${product.preview_image}" alt="${product.title}"
                              class="rounded-lg w-full h-48 object-cover">` : ''
                    }
                </div>
            </div>
        `;
    }

    renderNewProducts(featured) {
        if (!featured.new_products?.length) return '';

        return `
            <div class="new-products mb-8">
                <h3 class="text-2xl font-bold mb-4 dark:text-white">✨ ${this.app.t('home.sections.new')}</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${featured.new_products.map(product => products.createProductCard(product)).join('')}
                </div>
            </div>
        `;
    }

    renderFeaturedProducts(featured) {
        if (!featured.featured_products?.length) return '';

        return `
            <div class="featured-products">
                <h3 class="text-2xl font-bold mb-4 dark:text-white">🔥 ${this.app.t('home.sections.featured')}</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${featured.featured_products.map(product => products.createProductCard(product)).join('')}
                </div>
            </div>
        `;
    }
}