// js/views/CollectionDetailView.js
import { BaseView } from './BaseView.js';
import products from '../modules/products.js';

export class CollectionDetailView extends BaseView {
    async render(collectionId) {
        if (!auth.requireAuthentication()) {
            return '<div></div>';
        }

       try {
           const collection = await api.get(`/collections/${collectionId}`);

           return `
               <div class="max-w-4xl mx-auto">
                   <div class="flex items-center gap-4 mb-6">
                       <button onclick="app.navigateTo('collections')" class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">←</button>
                       <h1 class="text-3xl font-bold dark:text-white flex items-center gap-3">
                          <span class="text-4xl">${collection.icon}</span> ${collection.name}
                       </h1>
                   </div>
                   ${collection.products.length === 0 ? `
                       <div class="text-center py-16">
                           <div class="text-6xl mb-4">📂</div>
                           <h3 class="text-xl font-bold mb-2 dark:text-white">Ця колекція порожня</h3>
                           <p class="text-gray-600 dark:text-gray-400">Додайте товари з маркету, натискаючи на сердечко.</p>
                       </div>
                   ` : `
                       <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                           ${collection.products.map(p => products.createProductCard(p)).join('')}
                       </div>
                   `}
               </div>
           `;
       } catch (error) {
           return this.app.renderService.views.error.renderErrorPage(error);
       }
    }
}