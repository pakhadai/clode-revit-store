// js/api/ProductsAPI.js
export class ProductsAPI {
    constructor(apiClient) {
        this.api = apiClient || window.api;
    }

    async getProducts(params = {}) {
        return this.api.getProducts(params);
    }

    async getProduct(productId, language = 'uk') {
        return this.api.getProduct(productId, language);
    }

    async getFeaturedProducts(language = 'uk') {
        return this.api.getFeaturedProducts(language);
    }

    async toggleFavorite(productId) {
        return this.api.toggleFavorite(productId);
    }

    async getFavorites(language = 'uk') {
        return this.api.getFavorites(language);
    }

    async downloadProduct(productId, params = {}) {
        return this.api.get(`/products/${productId}/download`, params);
    }
}

window.ProductsAPI = ProductsAPI;
export default ProductsAPI;