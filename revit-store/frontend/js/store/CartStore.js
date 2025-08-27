// js/store/CartStore.js
export class CartStore {
    constructor() {
        this.storageKey = 'cart_items';
        this.promoKey = 'cart_promo';
        this.items = [];
        this.promoCode = null;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const savedCart = localStorage.getItem(this.storageKey);
            this.items = savedCart ? JSON.parse(savedCart) : [];

            const savedPromo = localStorage.getItem(this.promoKey);
            this.promoCode = savedPromo ? JSON.parse(savedPromo) : null;
        } catch (error) {
            console.error('Failed to load cart from storage:', error);
            this.items = [];
            this.promoCode = null;
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
            if (this.promoCode) {
                localStorage.setItem(this.promoKey, JSON.stringify(this.promoCode));
            } else {
                localStorage.removeItem(this.promoKey);
            }
        } catch (error) {
            console.error('Failed to save cart to storage:', error);
        }
    }

    addItem(product) {
        const cartItem = {
            id: product.id,
            sku: product.sku,
            title: product.title,
            price: product.price,
            current_price: product.current_price,
            discount_percent: product.discount_percent,
            preview_image: product.preview_images?.[0] || null,
            quantity: 1,
            added_at: new Date().toISOString()
        };

        this.items.push(cartItem);
        this.saveToStorage();
        return cartItem;
    }

    removeItem(productId) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== productId);

        if (this.items.length !== initialLength) {
            this.saveToStorage();
            return true;
        }
        return false;
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(i => i.id === productId);
        if (item && quantity > 0) {
            item.quantity = quantity;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    clearCart() {
        this.items = [];
        this.promoCode = null;
        this.saveToStorage();
    }

    getCart() {
        return [...this.items];
    }

    getItemCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    getTotal() {
        return this.items.reduce((sum, item) => {
            const price = item.current_price || item.price;
            return sum + (price * item.quantity);
        }, 0);
    }

    hasItem(productId) {
        return this.items.some(item => item.id === productId);
    }

    setPromoCode(promoData) {
        this.promoCode = promoData;
        this.saveToStorage();
    }

    getPromoCode() {
        return this.promoCode;
    }

    calculateFinalAmount(useBonuses = 0) {
        let amount = this.getTotal();

        // Apply promo code
        if (this.promoCode) {
            if (this.promoCode.discount_type === 'percent') {
                amount = amount * (1 - this.promoCode.discount_value / 100);
            } else {
                amount = amount - this.promoCode.discount_value;
            }
        }

        // Apply bonuses (max 70% of total)
        const maxBonuses = Math.floor(amount * 0.7);
        const bonusesToUse = Math.min(useBonuses, maxBonuses);
        amount = amount - bonusesToUse;

        return {
            subtotal: this.getTotal(),
            discount: this.getTotal() - amount + bonusesToUse,
            bonusesUsed: bonusesToUse,
            total: Math.max(0, amount)
        };
    }

    syncWithServer(serverCart) {
        // Merge local and server carts
        if (serverCart && serverCart.items) {
            // Keep local items that aren't on server
            const serverIds = serverCart.items.map(i => i.product_id);
            const localOnly = this.items.filter(i => !serverIds.includes(i.id));

            // Merge with server items
            this.items = [...serverCart.items.map(item => ({
                id: item.product_id,
                sku: item.sku,
                title: item.title,
                price: item.price,
                current_price: item.current_price,
                discount_percent: item.discount_percent,
                preview_image: item.preview_image,
                quantity: item.quantity,
                added_at: item.added_at
            })), ...localOnly];

            this.saveToStorage();
        }
    }
}

window.CartStore = CartStore;
export default CartStore;