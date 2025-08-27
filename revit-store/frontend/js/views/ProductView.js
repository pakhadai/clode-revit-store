// js/views/ProductView.js
import { BaseView } from './BaseView.js';
import products from '../modules/products.js';

export class ProductView extends BaseView {
        async render(productId) {
        console.log('ProductView.render received:', productId, typeof productId);
        // Просто використовуємо передане ID
        if (!productId) {
            return this.app.renderService.views.error.render404Page();
        }

        await products.loadProduct(productId);

        if (!products.currentProduct) {
            return this.app.renderService.views.error.render404Page();
        }

        return products.createProductPage(products.currentProduct);
    }
}