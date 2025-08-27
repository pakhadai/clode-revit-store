// js/utils/cartHelpers.js
export const cartHelpers = {
    formatCartItem(product) {
        return {
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
    },

    calculateItemTotal(item) {
        const price = item.current_price || item.price;
        const quantity = item.quantity || 1;
        return price * quantity;
    },

    calculateCartTotal(items) {
        return items.reduce((sum, item) => sum + this.calculateItemTotal(item), 0);
    },

    calculateDiscount(total, promoCode) {
        if (!promoCode) return 0;

        if (promoCode.discount_type === 'percent') {
            return total * (promoCode.discount_value / 100);
        }
        return promoCode.discount_value;
    },

    calculateMaxBonuses(total) {
        return Math.floor(total * 0.7); // Max 70% can be paid with bonuses
    },

    validatePromoCode(code) {
        // Basic validation
        if (!code || code.length < 3) return false;
        return /^[A-Z0-9_-]+$/i.test(code);
    },

    groupItemsByCategory(items) {
        return items.reduce((groups, item) => {
            const category = item.category || 'other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
            return groups;
        }, {});
    },

    sortCartItems(items, sortBy = 'added_at') {
        const sorted = [...items];

        sorted.sort((a, b) => {
            switch(sortBy) {
                case 'price':
                    return (b.current_price || b.price) - (a.current_price || a.price);
               case 'title':
                   return a.title.localeCompare(b.title);
               case 'added_at':
                   return new Date(b.added_at) - new Date(a.added_at);
               default:
                   return 0;
           }
       });

       return sorted;
   },

   mergeCartItems(localItems, serverItems) {
       const merged = new Map();

       // Add server items first (they are authoritative)
       serverItems.forEach(item => {
           merged.set(item.id, item);
       });

       // Add local items that don't exist on server
       localItems.forEach(item => {
           if (!merged.has(item.id)) {
               merged.set(item.id, item);
           }
       });

       return Array.from(merged.values());
   },

   isCartEmpty(items) {
       return !items || items.length === 0;
   },

   getCartBadgeCount(items) {
       return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
   },

   canCheckout(items, paymentMethod, userBalance = 0) {
       if (this.isCartEmpty(items)) return false;

       const total = this.calculateCartTotal(items);

       if (paymentMethod === 'bonuses') {
           return total <= userBalance;
       }

       return true;
   },

   generateOrderNumber() {
       const timestamp = Date.now().toString(36);
       const random = Math.random().toString(36).substr(2, 5);
       return `ORD-${timestamp}-${random}`.toUpperCase();
   }
};

window.cartHelpers = cartHelpers;
export default cartHelpers;