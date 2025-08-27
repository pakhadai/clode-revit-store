// js/views/CartView.js
import { BaseView } from './BaseView.js';
import products from '../modules/products.js';

export class CartView extends BaseView {
    render() {
        return cart.createCartPage();
    }
}