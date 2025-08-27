// LEGACY CODE MOVED TO js/app.legacy.js
// NEW MODULAR ARCHITECTURE

import { Application } from './core/Application.js';

// Create and initialize application
const app = new Application();

// Make globally available for backward compatibility
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

// Start application
app.init();

console.log('🎉 OhMyRevit Web App v1.0.0 (Modular)');
console.log('📚 Доступні об\'єкти: window.OhMyRevit');

export default app;