// js/app.js
import { Application } from './core/Application.js';

// Створюємо екземпляр додатку
const app = new Application();

// Робимо його глобально доступним для зворотної сумісності та віджетів
window.app = app;
window.OhMyRevit = {
    app,
    api: window.api,
    auth: window.auth,
    products: window.products,
    cart: window.cart,
    utils: window.Utils,
    version: '1.0.0'
};

// Запускаємо асинхронну ініціалізацію
app.init();

console.log('🎉 OhMyRevit Web App v1.0.0 (Modular)');
console.log('📚 Доступні об\'єкти: window.OhMyRevit');

export default app;