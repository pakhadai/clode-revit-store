// js/views/ErrorView.js
import { BaseView } from './BaseView.js';

export class ErrorView extends BaseView {
    render404Page() {
       return `
           <div class="error-page text-center py-16">
               <div class="text-6xl mb-4">😕</div>
               <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('errors.404')}</h1>
               <p class="text-gray-600 dark:text-gray-400 mb-8">${this.app.t('errors.404Desc')}</p>
               <button onclick="app.navigateTo('home')" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                   ${this.app.t('errors.backHome')}
               </button>
           </div>
       `;
   }

   renderErrorPage(error) {
       return `
           <div class="error-page text-center py-16">
               <div class="text-6xl mb-4">❌</div>
               <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('errors.500')}</h1>
               <p class="text-gray-600 dark:text-gray-400 mb-8">${error.message || this.app.t('errors.500Desc')}</p>
               <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                   ${this.app.t('errors.reload')}
               </button>
           </div>
       `;
   }

   renderAuthRequiredPage() {
       const isWebView = window.Telegram && window.Telegram.WebApp.initData;

       if (!isWebView) {
           setTimeout(() => {
                const container = document.getElementById('telegram-login-container');
                if(container) {
                    const script = document.createElement('script');
                    script.async = true;
                    // --- ВАЖЛИВО! ---
                    // Замініть 'OhMyRevitBot' на точне ім'я користувача вашого бота
                    script.src = "https://telegram.org/js/telegram-widget.js?22";
                    script.setAttribute('data-telegram-login', 'OhMyRevitBot');
                    script.setAttribute('data-size', 'large');
                    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
                    script.setAttribute('data-request-access', 'write');

                    container.innerHTML = '';
                    container.appendChild(script);
                }
           }, 50);

           return `
               <div class="auth-required text-center py-16">
                   <div class="text-6xl mb-4">🔒</div>
                   <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('auth.authRequired')}</h1>
                   <p class="text-gray-600 dark:text-gray-400 mb-8">${this.app.t('auth.authRequiredDesc')}</p>
                   <div id="telegram-login-container" class="flex justify-center h-[50px]">
                        </div>
               </div>
           `;
       } else {
           return `
               <div class="auth-required text-center py-16">
                   <div class="text-6xl mb-4">🔒</div>
                   <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.app.t('auth.authRequired')}</h1>
                   <p class="text-gray-600 dark:text-gray-400 mb-8">${this.app.t('auth.authRequiredDesc')}</p>
                   <p class="text-sm text-gray-500">Спробуйте перезапустити додаток.</p>
               </div>
           `;
       }
   }
}