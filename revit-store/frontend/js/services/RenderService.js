// js/services/RenderService.js
import { HomeView } from '../views/HomeView.js';
import { MarketView } from '../views/MarketView.js';
import { CartView } from '../views/CartView.js';
import { ProfileView } from '../views/ProfileView.js';
import { ProductView } from '../views/ProductView.js';
import { CollectionsView } from '../views/CollectionsView.js';
import { CollectionDetailView } from '../views/CollectionDetailView.js';
import { DownloadsView } from '../views/DownloadsView.js';
import { ErrorView } from '../views/ErrorView.js';

export class RenderService {
    constructor(app) {
        this.app = app;
        this.views = {
            home: new HomeView(app),
            market: new MarketView(app),
            cart: new CartView(app),
            profile: new ProfileView(app),
            product: new ProductView(app),
            collections: new CollectionsView(app),
            'collection-detail': new CollectionDetailView(app),
            downloads: new DownloadsView(app),
            error: new ErrorView(app),
        };
    }

    async renderPage(page, params = {}) {
        const view = this.views[page];
        if (view) {
            if (page === 'product' || page === 'collection-detail') {
                const id = (typeof params === 'object' && params !== null) ? params.id : params;
                console.log('RenderService passing to ProductView:', id, typeof id, 'from params:', params);
                return await view.render(id);
            }
            return await view.render(params);
        }

        switch (page) {
            case 'creator':
                return auth.isCreator() ? creator.createCreatorPage() : this.views.error.render404Page();
            case 'admin':
                return auth.isAdmin() ? admin.createAdminPage() : this.views.error.render404Page();
            case 'orders':
            case 'referrals':
            case 'settings':
            case 'support':
            case 'faq':
                return await this.views.profile.render({ defaultTab: page });
            default:
                return this.views.error.render404Page();
        }
    }

    // Допоміжні методи залишаються тут, оскільки вони керують логікою, а не рендерингом
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