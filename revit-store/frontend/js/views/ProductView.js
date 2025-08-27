// js/views/ProductView.js
import { BaseView } from './BaseView.js';

export class ProductView extends BaseView {
    async render(productId) {
        if (!productId) return this.render404Page();

        await products.loadProduct(productId);

        if (!products.currentProduct) return this.render404Page();

        return products.createProductPage(products.currentProduct);
    }
}