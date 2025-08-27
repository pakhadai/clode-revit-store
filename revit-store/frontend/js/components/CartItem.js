// js/components/CartItem.js
export class CartItem {
    constructor(item, onRemove, onUpdateQuantity) {
        this.item = item;
        this.onRemove = onRemove;
        this.onUpdateQuantity = onUpdateQuantity;
    }

    render() {
        return `
            <div class="cart-item bg-white dark:bg-gray-800 rounded-lg p-4 flex gap-4" data-item-id="${this.item.id}">
                ${this.renderImage()}
                ${this.renderInfo()}
                ${this.renderPrice()}
                ${this.renderActions()}
            </div>
        `;
    }

    renderImage() {
        return `
            <div class="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                ${this.item.preview_image ?
                    `<img src="${this.item.preview_image}" alt="${this.item.title}"
                          class="w-full h-full object-cover">` :
                    `<div class="flex items-center justify-center h-full text-gray-400">
                        <span class="text-3xl">📦</span>
                    </div>`
                }
            </div>
        `;
    }

    renderInfo() {
        return `
            <div class="flex-1">
                <h3 class="font-bold text-lg dark:text-white">${this.item.title}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">SKU: ${this.item.sku}</p>
                ${this.renderQuantitySelector()}
            </div>
        `;
    }

    renderQuantitySelector() {
        if (!this.onUpdateQuantity) return '';

        return `
            <div class="flex items-center gap-2 mt-2">
                <button onclick="cartItem.decreaseQuantity(${this.item.id})"
                        class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                    −
                </button>
                <span class="w-12 text-center dark:text-white">${this.item.quantity || 1}</span>
                <button onclick="cartItem.increaseQuantity(${this.item.id})"
                        class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                    +
                </button>
            </div>
        `;
    }

    renderPrice() {
        const price = this.item.current_price || this.item.price;
        const quantity = this.item.quantity || 1;
        const total = price * quantity;

        return `
            <div class="text-right">
                ${this.item.discount_percent > 0 ?
                    `<div class="text-gray-400 line-through text-sm">${Utils.formatPrice(this.item.price * quantity)}</div>` : ''
                }
                <div class="text-blue-600 dark:text-blue-400 font-bold text-xl">
                    ${Utils.formatPrice(total)}
                </div>
                ${quantity > 1 ?
                    `<div class="text-sm text-gray-500">${Utils.formatPrice(price)} × ${quantity}</div>` : ''
                }
            </div>
        `;
    }

    renderActions() {
        return `
            <button onclick="cartItem.removeItem(${this.item.id})"
                    class="text-red-500 hover:text-red-600 p-2">
                <span class="text-xl">❌</span>
            </button>
        `;
    }

    static decreaseQuantity(itemId) {
        const currentQuantity = window.cart?.items.find(i => i.id === itemId)?.quantity || 1;
        if (currentQuantity > 1) {
            window.cart?.updateQuantity(itemId, currentQuantity - 1);
        }
    }

    static increaseQuantity(itemId) {
        const currentQuantity = window.cart?.items.find(i => i.id === itemId)?.quantity || 1;
        window.cart?.updateQuantity(itemId, currentQuantity + 1);
    }

    static removeItem(itemId) {
        window.cart?.removeFromCart(itemId);
    }
}

// Global reference for event handlers
window.cartItem = CartItem;
export default CartItem;