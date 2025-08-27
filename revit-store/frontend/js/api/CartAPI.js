// js/api/CartAPI.js
export class CartAPI {
    constructor(apiClient) {
        this.api = apiClient || window.api;
    }

    async addToCart(productId) {
        return this.api.post('/cart/add', { product_id: productId });
    }

    async getCart() {
        return this.api.get('/cart');
    }

    async removeFromCart(itemId) {
        return this.api.delete(`/cart/${itemId}`);
    }

    async updateCartItem(itemId, quantity) {
        return this.api.put(`/cart/${itemId}`, { quantity });
    }

    async clearCart() {
        return this.api.delete('/cart');
    }

    async applyPromoCode(code) {
        return this.api.post('/promo/validate', { code });
    }

    async createOrder(orderData) {
        return this.api.createOrder(orderData);
    }

    async calculateShipping(addressData) {
        return this.api.post('/cart/shipping', addressData);
    }
}

window.CartAPI = CartAPI;
export default CartAPI;