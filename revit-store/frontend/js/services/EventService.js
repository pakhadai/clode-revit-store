// js/services/EventService.js
export class EventService {
    constructor(app) {
        this.app = app;
    }

    initNavigation() {
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.page;
                this.app.navigateTo(page);
            });
        });

        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.app.navigateTo(e.state.page, false);
            }
        });
    }

    initEventHandlers() {
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const currentTheme = Utils.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            Utils.setTheme(newTheme);
            this.app.applyTheme();
            this.app.updateThemeButton();
        });

        document.getElementById('language-toggle')?.addEventListener('click', () => {
            this.app.showLanguageMenu();
        });

        document.getElementById('profile-btn')?.addEventListener('click', () => {
            this.app.navigateTo('profile');
        });

        document.getElementById('notifications-btn')?.addEventListener('click', () => {
            this.app.showNotifications();
        });

        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.app.showSearch();
        });

        window.addEventListener('auth:success', (e) => {
            this.app.updateUI();
            Utils.showNotification(`${this.app.t('auth.welcome')}, ${e.detail.first_name}!`, 'success');
        });

        window.addEventListener('auth:logout', () => {
            this.app.updateUI();
            this.app.navigateTo('home');
        });

        window.addEventListener('navigate', (e) => {
            this.app.navigateTo(e.detail.page, true, e.detail.params);
        });

        window.addEventListener('language:change', async () => {
            await this.app.loadTranslations();
            this.app.render();
            this.app.updateNavigationText();
        });
    }

    initPageHandlers() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn') && !e.target.closest('.add-to-cart-btn')) {
                    const productId = card.dataset.productId;
                    this.app.navigateTo('product', true, productId);
                }
            });
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                await cart.addToCart(productId);
            });
        });

        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                await products.toggleFavorite(productId);
            });
        });
    }
}