// js/services/CartService.js
import { CartAPI } from '../api/CartAPI.js';
import { CartStore } from '../store/CartStore.js';

export class CartService {
    constructor() {
        this.api = new CartAPI();
        this.store = new CartStore();
        this.listeners = [];
    }

    async initialize() {
        // Load cart from localStorage first
        const localCart = this.store.getCart();
        if (localCart.length > 0) {
            this.notifyListeners('cart:loaded', localCart);
        }

        // Sync with server if authenticated
        if (window.auth?.isAuthenticated()) {
            try {
                const serverCart = await this.api.getCart();
                this.store.syncWithServer(serverCart);
                this.notifyListeners('cart:synced', serverCart);
            } catch (error) {
                console.error('Failed to sync cart with server:', error);
            }
        }
    }

    async addItem(productId, product = null) {
        try {
            // Check if already in cart
            if (this.store.hasItem(productId)) {
                Utils.showNotification(window.app.t('notifications.alreadyInCart'), 'warning');
                return false;
            }

            // Get product info if not provided
            if (!product) {
                product = await window.api.getProduct(productId, Utils.getCurrentLanguage());
            }

            // Add to local store
            const cartItem = this.store.addItem(product);

            // Sync with server if authenticated
            if (window.auth?.isAuthenticated()) {
                try {
                    await this.api.addToCart(productId);
                } catch (error) {
                    console.error('Failed to sync cart item with server:', error);
                }
            }

            this.notifyListeners('cart:item-added', cartItem);
            Utils.showNotification(window.app.t('notifications.addedToCart'), 'success');
            window.auth?.hapticFeedback('impact', 'light');

            return cartItem;
        } catch (error) {
            console.error('Add to cart error:', error);
            Utils.showNotification(window.app.t('notifications.addToCartError'), 'error');
            return false;
        }
    }

    async removeItem(productId) {
        const removed = this.store.removeItem(productId);
        if (removed) {
            // Sync with server if authenticated
            if (window.auth?.isAuthenticated()) {
                try {
                    await this.api.removeFromCart(productId);
                } catch (error) {
                    console.error('Failed to sync cart removal with server:', error);
                }
            }

            this.notifyListeners('cart:item-removed', productId);
            Utils.showNotification(window.app.t('notifications.removedFromCart'), 'info');
            window.auth?.hapticFeedback('impact', 'light');
        }
        return removed;
    }

    clearCart() {
        this.store.clearCart();
        this.notifyListeners('cart:cleared', null);
    }

    getItems() {
        return this.store.getCart();
    }

    getItemCount() {
        return this.store.getItemCount();
    }

    getTotal() {
        return this.store.getTotal();
    }

    hasItem(productId) {
        return this.store.hasItem(productId);
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => listener(event, data));
    }

    async applyPromoCode(code) {
        try {
            const response = await this.api.applyPromoCode(code);
            if (response.valid) {
                this.store.setPromoCode(response);
                this.notifyListeners('cart:promo-applied', response);
                return response;
            }
            return null;
        } catch (error) {
            console.error('Apply promo code error:', error);
            return null;
        }
    }

    calculateFinalAmount(useBonuses = 0) {
        return this.store.calculateFinalAmount(useBonuses);
    }
}

window.CartService = CartService;
export default CartService;