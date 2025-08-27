// js/services/RenderService.js
export class RenderService {
    constructor(app) {
        this.app = app;
    }

    async renderPage(page) {
        switch (page) {
            case 'home': return await this.renderHomePage();
            case 'market': return await this.renderMarketPage();
            case 'cart': return this.renderCartPage();
            case 'profile': return await this.renderProfilePage();
            case 'product': return await this.renderProductPage(Utils.getUrlParams().id);
            case 'collections': return await this.renderCollectionsPage();
            case 'collection-detail': return await this.renderCollectionDetailPage(Utils.getUrlParams().id);
            case 'downloads': return await this.renderDownloadsTab();
            case 'orders': return this.renderOrdersTab();
            case 'referrals': return this.renderReferralsTab();
            case 'settings': return this.renderSettingsTab();
            case 'support': return this.renderSupportTab();
            case 'faq': return this.renderFaqTab();
            case 'creator': return auth.isCreator() ? creator.createCreatorPage() : this.render404Page();
            case 'admin': return auth.isAdmin() ? admin.createAdminPage() : this.render404Page();
            default: return this.render404Page();
        }
    }

    async renderHomePage() {
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

    async renderMarketPage() {
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

    renderCartPage() {
        return cart.createCartPage();
    }

    async renderProfilePage() {
        if (!auth.isAuthenticated()) {
            return this.renderAuthRequiredPage();
        }

        const user = auth.user;

        const createTile = (page, icon, titleKey) => `
            <button onclick="app.navigateTo('${page}')" class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition-shadow text-center">
                <div class="text-4xl mb-2">${icon}</div>
                <div class="font-semibold dark:text-white">${this.app.t(titleKey)}</div>
            </button>
        `;

        return `
            <div class="profile-page max-w-4xl mx-auto">
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
                    <div class="flex items-center gap-4">
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
                            ${user.first_name?.[0] || '👤'}
                        </div>
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">${user.first_name} ${user.last_name || ''}</h1>
                            <p class="text-gray-600 dark:text-gray-400">@${user.username || `user_${user.telegram_id}`}</p>
                            <div class="flex flex-wrap gap-4 mt-2">
                                <span class="text-sm font-medium ${user.vip_level > 0 ? 'text-yellow-500' : 'text-gray-500'}">${user.vip_level_name || this.app.t('profile.noVip')}</span>
                                ${user.is_creator ? `<span class="text-sm font-medium text-purple-500">🎨 ${this.app.t('profile.creator')}</span>` : ''}
                                ${user.is_admin ? `<span class="text-sm font-medium text-red-500">👑 ${this.app.t('profile.admin')}</span>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">${user.balance}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">${this.app.t('profile.balance')}</div>
                        </div>
                    </div>
                </div>
                ${user.is_admin ? `
                    <div class="mb-4">
                        <button onclick="app.navigateTo('admin')" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg">
                            👑 Адмін панель
                        </button>
                    </div>
                ` : ''}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${createTile('downloads', '📥', 'profile.tabs.downloads')}
                    ${createTile('orders', '📋', 'profile.tabs.orders')}
                    ${createTile('collections', '📚', 'profile.tabs.collections')}
                    ${createTile('referrals', '🤝', 'profile.tabs.referrals')}
                    ${createTile('settings', '⚙️', 'profile.tabs.settings')}
                    ${createTile('support', '💬', 'profile.tabs.support')}
                    ${createTile('faq', '❓', 'profile.tabs.faq')}
                    ${user.is_creator ?
                        `<button onclick="app.navigateTo('creator')" class="bg-purple-100 dark:bg-purple-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🎨</div>
                            <div class="text-sm font-semibold text-purple-700 dark:text-purple-300">Кабінет творця</div>
                        </button>`
                    :
                        `<button onclick="admin.showCreatorApplicationModal()" class="bg-green-100 dark:bg-green-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🚀</div>
                            <div class="text-sm font-semibold text-green-700 dark:text-green-300">Стати творцем</div>
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    async renderProductPage(productId) {
        if (!productId) return this.render404Page();

        await products.loadProduct(productId);

        if (!products.currentProduct) return this.render404Page();

        return products.createProductPage(products.currentProduct);
    }

    async renderCollectionsPage() {
        if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

        try {
            const collectionsList = await api.get('/collections/');

            if (collectionsList.length === 0) {
                return `
                    <div class="text-center py-16">
                        <div class="text-6xl mb-4">📚</div>
                        <h3 class="text-xl font-bold mb-2 dark:text-white">Створіть свою першу колекцію</h3>
                        <p class="text-gray-600 dark:text-gray-400">Зберігайте товари, щоб не загубити їх.</p>
                    </div>
                `;
            }

            return `
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6 dark:text-white">📚 Мої Колекції</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${collectionsList.map(c => `
                            <div onclick="app.navigateTo('collection-detail', true, { id: ${c.id} })"
                                 class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                                <div class="text-4xl">${c.icon}</div>
                                <div class="flex-grow" onclick="app.navigateTo('collection-detail', true, { id: ${c.id} })">
                                    <h4 class="font-bold dark:text-white">${c.name}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">${c.product_count} товарів</p>
                                </div>
                                <button onclick="event.stopPropagation(); collections.showEditCollectionModal(${c.id}, '${c.name}', '${c.icon}')"
                                        // js/services/RenderService.js (продовження)
                                       class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                   ⚙️
                               </button>
                               <span class="text-gray-400 text-2xl">></span>
                           </div>
                       `).join('')}
                   </div>
               </div>
           `;
       } catch (error) {
           return this.renderErrorPage(error);
       }
   }

   async renderCollectionDetailPage(collectionId) {
       if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

       try {
           const collection = await api.get(`/collections/${collectionId}`);

           return `
               <div class="max-w-4xl mx-auto">
                   <div class="flex items-center gap-4 mb-6">
                       <button onclick="app.navigateTo('collections')" class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">←</button>
                       <h1 class="text-3xl font-bold dark:text-white flex items-center gap-3">
                          <span class="text-4xl">${collection.icon}</span> ${collection.name}
                       </h1>
                   </div>
                   ${collection.products.length === 0 ? `
                       <div class="text-center py-16">
                           <div class="text-6xl mb-4">📂</div>
                           <h3 class="text-xl font-bold mb-2 dark:text-white">Ця колекція порожня</h3>
                           <p class="text-gray-600 dark:text-gray-400">Додайте товари з маркету, натискаючи на сердечко.</p>
                       </div>
                   ` : `
                       <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                           ${collection.products.map(p => products.createProductCard(p)).join('')}
                       </div>
                   `}
               </div>
           `;
       } catch (error) {
           return this.renderErrorPage(error);
       }
   }

   async renderDownloadsTab() {
       if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

       try {
           Utils.showLoader(true);
           const downloads = await api.get('/products/user/downloads', { language: Utils.getCurrentLanguage() });

           const createProductRow = (product) => `
               <div class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg transition-shadow cursor-pointer" onclick="app.navigateTo('product', true, { id: ${product.id} })">
                   <img src="${product.preview_image || '/assets/icons/favicon-96x96.png'}" alt="${product.title}" class="w-20 h-20 rounded-md object-cover flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                   <div class="flex-grow">
                       <h4 class="font-bold dark:text-white">${product.title}</h4>
                       <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${product.description}</p>
                   </div>
                   <button onclick="event.stopPropagation(); products.downloadProduct(${product.id})" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">
                       Завантажити
                   </button>
               </div>
           `;

           const createSection = (title, productList) => {
               if (!productList || productList.length === 0) return '';
               return `
                   <div class="mb-8">
                       <h2 class="text-2xl font-bold mb-4 dark:text-white">${title}</h2>
                       <div class="space-y-4">
                           ${productList.map(createProductRow).join('')}
                       </div>
                   </div>
               `;
           };

           return `
               <div class="downloads-page max-w-4xl mx-auto">
                   <h1 class="text-3xl font-bold mb-8 dark:text-white">📥 Мої Завантаження</h1>
                   ${createSection('🆓 Безкоштовні архіви', downloads.free)}
                   ${createSection('🛒 Придбані архіви', downloads.purchased)}
                   ${createSection('⭐ Архіви по підписці', downloads.subscription)}
                   ${(downloads.free.length === 0 && downloads.purchased.length === 0 && downloads.subscription.length === 0) ? `
                       <div class="text-center py-16">
                           <div class="text-6xl mb-4">📂</div>
                           <h3 class="text-xl font-bold mb-2 dark:text-white">Тут поки що порожньо</h3>
                           <p class="text-gray-600 dark:text-gray-400">Безкоштовні та куплені архіви з'являться на цій сторінці.</p>
                       </div>
                   ` : ''}
               </div>
           `;
       } catch (error) {
           console.error('Render downloads page error:', error);
           return this.renderErrorPage(error);
       } finally {
           Utils.showLoader(false);
       }
   }

   renderOrdersTab() {
       const orders = Utils.storage.get('user_orders', []);

       if (orders.length === 0) {
           return `
               <div class="text-center py-16">
                   <div class="text-6xl mb-4">📋</div>
                   <h3 class="text-xl font-bold mb-2 dark:text-white">Немає замовлень</h3>
                   <p class="text-gray-600 dark:text-gray-400">Ваші замовлення з'являться тут</p>
               </div>
           `;
       }

       return `
           <div class="orders-list">
               <h3 class="text-xl font-bold mb-4 dark:text-white">📋 Історія замовлень</h3>
               <div class="space-y-4">
                   ${orders.map(order => `
                       <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
                           <div class="flex justify-between items-start mb-2">
                               <div>
                                   <h4 class="font-bold dark:text-white">Замовлення #${order.order_number}</h4>
                                   <p class="text-sm text-gray-600 dark:text-gray-400">
                                       ${Utils.formatDate(order.created_at)}
                                   </p>
                               </div>
                               <span class="px-3 py-1 rounded-full text-sm ${
                                   order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                   order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                   'bg-red-100 text-red-800'
                               }">
                                   ${order.status === 'completed' ? '✅ Завершено' :
                                     order.status === 'pending' ? '⏳ В обробці' :
                                     '❌ Скасовано'}
                               </span>
                           </div>
                           <div class="text-sm text-gray-600 dark:text-gray-400">
                               Товарів: ${order.items_count} | Сума: ${Utils.formatPrice(order.total)}
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       `;
   }

   renderReferralsTab() {
       const user = auth.user;
       const referralCode = user?.referral_code || 'NOCODE';
       const referralLink = `https://t.me/OhMyRevitBot?start=${referralCode}`;

       return `
           <div class="referrals-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">🤝 ${this.app.t('profile.referrals.title')}</h3>
               <div class="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
                   <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Ваше реферальне посилання:</p>
                   <div class="flex gap-2">
                       <input type="text" value="${referralLink}" readonly
                              class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white">
                       <button onclick="Utils.copyToClipboard('${referralLink}')"
                               class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                           📋 Копіювати
                       </button>
                   </div>
               </div>
               <div class="grid grid-cols-2 gap-4 mb-6">
                   <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                       <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                           ${user?.referral_count || 0}
                       </div>
                       <div class="text-sm text-gray-600 dark:text-gray-400">Запрошено друзів</div>
                   </div>
                   <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                       <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                           ${user?.referral_earnings || 0}
                       </div>
                       <div class="text-sm text-gray-600 dark:text-gray-400">Зароблено бонусів</div>
                   </div>
               </div>
               <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                   <h4 class="font-bold mb-2 dark:text-white">Як це працює:</h4>
                   <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                       <li>✅ Друг реєструється за вашим посиланням</li>
                       <li>✅ Ви отримуєте 30 бонусів за реєстрацію</li>
                       <li>✅ Отримуєте 5% від кожної покупки друга</li>
                       <li>✅ Бонуси нараховуються автоматично</li>
                   </ul>
               </div>
           </div>
       `;
   }

   renderSettingsTab() {
       const user = auth.user;

       return `
           <div class="settings-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">⚙️ ${this.app.t('profile.tabs.settings')}</h3>
               <div class="space-y-6">
                   <div>
                       <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                           ${this.app.t('profile.settings.language')}
                       </label>
                       <select id="settings-language" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                               onchange="app.updateSetting('language', this.value)">
                           <option value="uk" ${user?.language === 'uk' ? 'selected' : ''}>🇺🇦 Українська</option>
                           <option value="en" ${user?.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                           <option value="ru" ${user?.language === 'ru' ? 'selected' : ''}>🏳 Русский</option>
                       </select>
                   </div>
                   <div>
                       <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                           ${this.app.t('profile.settings.theme')}
                       </label>
                       <div class="grid grid-cols-2 gap-4">
                           <button onclick="app.updateSetting('theme', 'light')"
                                   class="p-4 border-2 ${user?.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg hover:border-blue-500">
                               <div class="text-3xl mb-2">☀️</div>
                               <div>${this.app.t('profile.settings.light')}</div>
                           </button>
                           <button onclick="app.updateSetting('theme', 'dark')"
                                   class="p-4 border-2 ${user?.theme === 'dark' ? 'border-blue-500 bg-blue-900' : 'border-gray-300 dark:border-gray-600'} rounded-lg hover:border-blue-500">
                               <div class="text-3xl mb-2">🌙</div>
                               <div>${this.app.t('profile.settings.dark')}</div>
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       `;
   }

   renderSupportTab() {
       return `
           <div class="support-content">
               <h3 class="text-xl font-bold mb-4 dark:text-white">💬 Підтримка</h3>
               <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
                   <form onsubmit="app.sendSupportMessage(event)">
                       <div class="mb-4">
                           <label class="block text-sm font-medium mb-2 dark:text-gray-300">Тема звернення</label>
                           <select id="support-topic" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                               <option value="general">Загальне питання</option>
                               <option value="payment">Проблема з оплатою</option>
                               <option value="download">Проблема з завантаженням</option>
                               <option value="creator">Питання творця</option>
                               <option value="other">Інше</option>
                           </select>
                       </div>
                       <div class="mb-4">
                           <label class="block text-sm font-medium mb-2 dark:text-gray-300">Повідомлення</label>
                           <textarea id="support-message" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                     placeholder="Опишіть вашу проблему або питання..." required></textarea>
                       </div>
                       <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                           📤 Відправити
                       </button>
                   </form>
               </div>
           </div>
       `;
   }

   renderFaqTab() {
       const faqItems = [
           { question: 'Як отримати безкоштовні архіви?', answer: 'Безкоштовні архіви доступні всім користувачам у розділі "Безкоштовні" маркетплейсу.' },
           { question: 'Що дає підписка?', answer: 'Підписка надає доступ до всіх преміум архівів, +2 прокрутки колеса щодня, 5% кешбек бонусами.' },
           { question: 'Як працює реферальна програма?', answer: 'Запрошуйте друзів за вашим посиланням. Ви отримаєте 30 бонусів за кожну реєстрацію.' },
       ];

       return `
           <div class="faq-content">
               <h3 class="text-xl font-bold mb-6 dark:text-white">❓ Часті питання</h3>
               <div class="space-y-4">
                   ${faqItems.map((item, index) => `
                       <div class="faq-item bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                           <button onclick="app.toggleFaqItem(${index})"
                                   class="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700">
                               <span class="font-medium dark:text-white">${item.question}</span>
                               <span class="text-gray-400 transform transition-transform" id="faq-icon-${index}">▼</span>
                           </button>
                           <div id="faq-answer-${index}" class="hidden px-6 pb-4">
                               <p class="text-gray-600 dark:text-gray-400">${item.answer}</p>
                           </div>
                       </div>
                   `).join('')}
               </div>
           </div>
       `;
   }

   render404Page() {
       return `
           <div class="error-page text-center py-16">
               <div class="text-6xl mb-4">😕</div>
               <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('errors.404')}</h1>
               <p class="text-gray-600 dark:text-gray-400 mb-8">${this.app.t('errors.404Desc')}</p>
               <button onclick="app.navigateTo('home')" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                   ${this.app.t('errors.backHome')}
               </button>
           </div>
       `;
   }

   renderErrorPage(error) {
       return `
           <div class="error-page text-center py-16">
               <div class="text-6xl mb-4">❌</div>
               <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('errors.500')}</h1>
               <p class="text-gray-600 dark:text-gray-400 mb-8">${error.message || this.app.t('errors.500Desc')}</p>
               <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                   ${this.app.t('errors.reload')}
               </button>
           </div>
       `;
   }

   renderAuthRequiredPage() {
       return `
           <div class="auth-required text-center py-16">
               <div class="text-6xl mb-4">🔒</div>
               <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('auth.authRequired')}</h1>
               <p class="text-gray-600 dark:text-gray-400 mb-8">${this.app.t('auth.authRequiredDesc')}</p>
               <button onclick="auth.authenticate()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                   ${this.app.t('auth.loginWithTelegram')}
               </button>
           </div>
       `;
   }

   // Helper methods
   async applyFilters() {
       await products.loadProducts();
       const grid = document.getElementById('products-grid');
       if (grid) {
           grid.innerHTML = products.products.map(product => products.createProductCard(product)).join('');
           this.app.initPageHandlers();
       }
   }

   applySorting(value) {
       const [sortBy, sortOrder] = value.split('-');
       products.setFilter('sort_by', sortBy);
       products.setFilter('sort_order', sortOrder);
       this.applyFilters();
   }

   handleSearch(event) {
       if (event.key === 'Enter') {
           this.doSearch();
       }
   }

   doSearch() {
       const input = document.getElementById('search-input');
       if (input) {
           products.setFilter('search', input.value);
           this.applyFilters();
       }
   }

   async loadPage(page) {
       await products.loadProducts(page);
       this.app.render();
   }

   toggleFaqItem(index) {
       const answer = document.getElementById(`faq-answer-${index}`);
       const icon = document.getElementById(`faq-icon-${index}`);
       if (answer) {
           answer.classList.toggle('hidden');
           if (icon) {
               icon.style.transform = answer.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
           }
       }
   }
}