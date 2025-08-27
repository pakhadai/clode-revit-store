// js/components/CartSummary.js
export class CartSummary {
    constructor(items, promoCode, bonusesAvailable) {
        this.items = items;
        this.promoCode = promoCode;
        this.bonusesAvailable = bonusesAvailable || 0;
        this.bonusesToUse = 0;
    }

    render() {
        const subtotal = this.calculateSubtotal();
        const calculation = this.calculateFinalAmount(subtotal);

        return `
            <div class="checkout-summary bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">${window.app.t('cart.summary.title')}</h3>

                ${this.renderSummaryLines(calculation)}

                ${this.renderCheckoutButton()}
            </div>
        `;
    }

    calculateSubtotal() {
        return this.items.reduce((sum, item) => {
            const price = item.current_price || item.price;
            return sum + (price * (item.quantity || 1));
        }, 0);
    }

    calculateFinalAmount(subtotal) {
        let total = subtotal;
        let discount = 0;

        // Apply promo code
        if (this.promoCode) {
            if (this.promoCode.discount_type === 'percent') {
                discount = subtotal * (this.promoCode.discount_value / 100);
            } else {
                discount = this.promoCode.discount_value;
            }
            total -= discount;
        }

        // Apply bonuses
        const maxBonuses = Math.floor(total * 0.7);
        const bonusesToUse = Math.min(this.bonusesToUse, maxBonuses, this.bonusesAvailable);
        total -= bonusesToUse;

        return {
            subtotal,
            discount,
            bonusesUsed: bonusesToUse,
            total: Math.max(0, total)
        };
    }

    renderSummaryLines(calculation) {
        return `
            <div class="space-y-2" id="checkout-summary">
                <div class="flex justify-between">
                    <span class="dark:text-gray-300">${window.app.t('cart.items')}:</span>
                    <span class="font-bold dark:text-white">${this.items.length}</span>
                </div>

                <div class="flex justify-between">
                    <span class="dark:text-gray-300">${window.app.t('cart.subtotal')}:</span>
                    <span class="font-bold dark:text-white">${Utils.formatPrice(calculation.subtotal)}</span>
                </div>

                ${calculation.discount > 0 ? `
                    <div class="flex justify-between text-green-500">
                        <span>${window.app.t('cart.discount')}:</span>
                        <span class="font-bold">-${Utils.formatPrice(calculation.discount)}</span>
                    </div>
                ` : ''}

                ${calculation.bonusesUsed > 0 ? `
                    <div class="flex justify-between text-blue-500">
                        <span>${window.app.t('cart.bonuses')}:</span>
                        <span class="font-bold">-${Utils.formatPrice(calculation.bonusesUsed)}</span>
                    </div>
                ` : ''}

                <div class="border-t pt-2 mt-2">
                    <div class="flex justify-between text-xl">
                        <span class="font-bold dark:text-white">${window.app.t('cart.total')}:</span>
                        <span class="font-bold text-blue-600 dark:text-blue-400">
                            ${Utils.formatPrice(calculation.total)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    renderCheckoutButton() {
        return `
            <button onclick="cart.checkout()"
                    class="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                           font-bold text-lg transition-colors">
                ${window.app.t('cart.checkout')}
            </button>
        `;
    }

    updateBonusesUsed(amount) {
        this.bonusesToUse = amount;
        this.updateUI();
    }

    updateUI() {
        const summaryElement = document.getElementById('checkout-summary');
        if (summaryElement) {
            const calculation = this.calculateFinalAmount(this.calculateSubtotal());
            summaryElement.innerHTML = this.renderSummaryLines(calculation);
        }
    }
}

window.CartSummary = CartSummary;
export default CartSummary;