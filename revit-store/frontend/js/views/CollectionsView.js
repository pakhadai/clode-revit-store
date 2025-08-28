// js/views/CollectionsView.js
import { BaseView } from './BaseView.js';
import products from '../modules/products.js';

export class CollectionsView extends BaseView {
    async render() {
        if (!auth.requireAuthentication()) {
            return '<div></div>';
        }

        try {
            const collectionsList = await api.get('/collections/');

            if (collectionsList.length === 0) {
                return `
                    <div class="text-center py-16">
                        <div class="text-6xl mb-4">📚</div>
                        <h3 class="text-xl font-bold mb-2 dark:text-white">Створіть свою першу колекцію</h3>
                        <p class="text-gray-600 dark:text-gray-400">Зберігайте товари, щоб не загубити їх.</p>
                    </div>
                `;
            }

            return `
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6 dark:text-white">📚 Мої Колекції</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${collectionsList.map(c => `
                            <div onclick="app.navigateTo('collection-detail', true, { id: ${c.id} })"
                                 class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                                <div class="text-4xl">${c.icon}</div>
                                <div class="flex-grow">
                                    <h4 class="font-bold dark:text-white">${c.name}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">${c.product_count} товарів</p>
                                </div>
                                <button onclick="event.stopPropagation(); collections.showEditCollectionModal(${c.id}, '${c.name}', '${c.icon}')"
                                       class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                   ⚙️
                               </button>
                               <span class="text-gray-400 text-2xl">></span>
                           </div>
                       `).join('')}
                   </div>
               </div>
           `;
       } catch (error) {
           return this.app.renderService.views.error.renderErrorPage(error);
       }
    }
}