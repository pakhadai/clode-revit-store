// js/views/DownloadsView.js
import { BaseView } from './BaseView.js';

export class DownloadsView extends BaseView {
    async render() {
        if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

       try {
           Utils.showLoader(true);
           const downloads = await api.get('/products/user/downloads', { language: Utils.getCurrentLanguage() });

           const createProductRow = (product) => `
               <div class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg transition-shadow cursor-pointer" onclick="app.navigateTo('product', true, { id: ${product.id} })">
                   <img src="${product.preview_image || '/assets/icons/favicon-96x96.png'}" alt="${product.title}" class="w-20 h-20 rounded-md object-cover flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                   <div class="flex-grow">
                       <h4 class="font-bold dark:text-white">${product.title}</h4>
                       <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${product.description}</p>
                   </div>
                   <button onclick="event.stopPropagation(); products.downloadProduct(${product.id})" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">
                       Завантажити
                   </button>
               </div>
           `;

           const createSection = (title, productList) => {
               if (!productList || productList.length === 0) return '';
               return `
                   <div class="mb-8">
                       <h2 class="text-2xl font-bold mb-4 dark:text-white">${title}</h2>
                       <div class="space-y-4">
                           ${productList.map(createProductRow).join('')}
                       </div>
                   </div>
               `;
           };

           return `
               <div class="downloads-page max-w-4xl mx-auto">
                   <h1 class="text-3xl font-bold mb-8 dark:text-white">📥 Мої Завантаження</h1>
                   ${createSection('🆓 Безкоштовні архіви', downloads.free)}
                   ${createSection('🛒 Придбані архіви', downloads.purchased)}
                   ${createSection('⭐ Архіви по підписці', downloads.subscription)}
                   ${(downloads.free.length === 0 && downloads.purchased.length === 0 && downloads.subscription.length === 0) ? `
                       <div class="text-center py-16">
                           <div class="text-6xl mb-4">📂</div>
                           <h3 class="text-xl font-bold mb-2 dark:text-white">Тут поки що порожньо</h3>
                           <p class="text-gray-600 dark:text-gray-400">Безкоштовні та куплені архіви з'являться на цій сторінці.</p>
                       </div>
                   ` : ''}
               </div>
           `;
       } catch (error) {
           console.error('Render downloads page error:', error);
           return this.renderErrorPage(error);
       } finally {
           Utils.showLoader(false);
       }
    }
}