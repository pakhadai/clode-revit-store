// js/services/ProductService.js
import { ProductsAPI } from '../api/ProductsAPI.js';

export class ProductService {
    constructor() {
        this.api = new ProductsAPI();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getProductWithCache(productId, language) {
        const cacheKey = `product_${productId}_${language}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const product = await this.api.getProduct(productId, language);
        this.cache.set(cacheKey, { data: product, timestamp: Date.now() });
        return product;
    }

    clearCache() {
        this.cache.clear();
    }

    async searchProducts(query, filters = {}) {
        const params = {
            search: query,
            ...filters,
            language: Utils.getCurrentLanguage()
        };
        return this.api.getProducts(params);
    }

    async getProductsByCategory(category, page = 1) {
        return this.api.getProducts({
            category,
            page,
            language: Utils.getCurrentLanguage()
        });
    }

    async getProductsByType(productType, page = 1) {
        return this.api.getProducts({
            product_type: productType,
            page,
            language: Utils.getCurrentLanguage()
        });
    }
}

window.ProductService = ProductService;
export default ProductService;