/**
 * Модуль для роботи з колекціями користувачів
 */
class CollectionsModule {
    constructor() {
        this.collections = [];
        // Наша палітра емодзі
        this.emojiPalette = ['❤️', '⭐️', '💡', '✅', '🔥', '💎', '📦', '📌', '📁', '💰'];
    }

    /**
     * Показати модальне вікно для додавання товару в колекцію
     */
    async showAddToCollectionModal(productId) {
        if (!auth.isAuthenticated()) {
            Utils.showNotification('Потрібна авторизація', 'warning');
            return;
        }

        try {
            this.collections = await api.get('/collections/');
            // Перевіряємо, в яких колекціях вже є цей товар
            for (let c of this.collections) {
                c.has_product = await this.isProductInCollection(c.id, productId);
            }
        } catch (e) {
            this.collections = [];
        }

        const modal = document.createElement('div');
        modal.id = 'collection-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 transform transition-transform scale-95 opacity-0 animate-modal-in">
                <h3 class="text-xl font-bold mb-4 dark:text-white">Зберегти до...</h3>
                <div id="collections-list" class="space-y-2 max-h-48 overflow-y-auto mb-4">
                    ${this.collections.map(c => this.renderCollectionItem(c, productId)).join('')}
                </div>
                <div class="new-collection-form pt-4 border-t dark:border-gray-700">
                     <p class="text-sm font-medium mb-2 dark:text-gray-300">Створити нову колекцію:</p>
                     <input type="text" id="new-collection-name" class="w-full p-2 border rounded dark:bg-gray-700 mb-2" placeholder="Наприклад, 'Для кухні'">
                     <div class="flex items-center gap-2 mb-3">
                        <span class="text-sm dark:text-gray-400">Іконка:</span>
                        <div id="emoji-palette" class="flex gap-1">
                            ${this.emojiPalette.map((emoji, index) => `<button class="p-1 rounded-full text-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${index === 0 ? 'bg-blue-200 dark:bg-blue-800' : ''}" data-emoji="${emoji}">${emoji}</button>`).join('')}
                        </div>
                     </div>
                     <button onclick="collections.createNewCollection(${productId})" class="w-full bg-blue-500 text-white p-2 rounded-lg font-bold hover:bg-blue-600">Створити і додати</button>
                </div>
                 <button onclick="this.closest('#collection-modal').remove()" class="w-full mt-4 bg-gray-200 dark:bg-gray-600 p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Закрити</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Обробник для вибору емодзі
        modal.querySelector('#emoji-palette').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                modal.querySelectorAll('#emoji-palette button').forEach(btn => btn.classList.remove('bg-blue-200', 'dark:bg-blue-800'));
                e.target.classList.add('bg-blue-200', 'dark:bg-blue-800');
            }
        });

        // Анімація появи
        setTimeout(() => {
            modal.querySelector('.animate-modal-in').classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    // Допоміжна функція для рендеру елемента списку
    renderCollectionItem(collection, productId) {
        const checkmark = collection.has_product ? '<span class="text-green-500 font-bold">✓</span>' : '';
        return `
            <div onclick="collections.toggleProductInCollection(${collection.id}, ${productId}, this)"
                 class="collection-item flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${collection.has_product ? 'bg-gray-100 dark:bg-gray-700' : ''}">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${collection.icon}</span>
                    <span class="font-medium dark:text-gray-200">${collection.name}</span>
                </div>
                ${checkmark}
            </div>
        `;
    }

    // Допоміжна функція для перевірки
    async isProductInCollection(collectionId, productId) {
        try {
            const collection = await api.get(`/collections/${collectionId}`);
            return collection.products.some(p => p.id === productId);
        } catch {
            return false;
        }
    }


    /**
     * Додати/видалити товар з існуючої колекції
     */
    async toggleProductInCollection(collectionId, productId, element) {
        try {
            const response = await api.post('/collections/products/toggle', { collection_id: collectionId, product_id: productId });
            if (response.action === 'added') {
                element.classList.add('bg-gray-100', 'dark:bg-gray-700');
                const checkmark = document.createElement('span');
                checkmark.className = 'text-green-500 font-bold';
                checkmark.textContent = '✓';
                element.appendChild(checkmark);
                this.updateProductCardIcon(productId);
            } else {
                element.classList.remove('bg-gray-100', 'dark:bg-gray-700');
                element.querySelector('.text-green-500').remove();
                this.updateProductCardIcon(productId);
            }
        } catch (error) {
            Utils.showNotification('Помилка', 'error');
        }
    }

    /**
     * Створити нову колекцію та додати туди товар
     */
    async createNewCollection(productId) {
        const nameInput = document.getElementById('new-collection-name');
        const name = nameInput.value.trim();
        const selectedEmojiEl = document.querySelector('#emoji-palette .bg-blue-200');
        const icon = selectedEmojiEl ? selectedEmojiEl.dataset.emoji : '🤍';

        if (!name) {
            Utils.showNotification('Введіть назву колекції', 'warning');
            return;
        }

        try {
            const newCollection = await api.post('/collections/', { name, icon, product_id: productId });
            Utils.showNotification(`Створено колекцію "${name}" та додано товар`, 'success');

            // Оновлюємо список в модальному вікні
            const listEl = document.getElementById('collections-list');
            const newItemEl = document.createElement('div');
            newItemEl.innerHTML = this.renderCollectionItem({ ...newCollection, has_product: true }, productId);
            listEl.appendChild(newItemEl.firstChild);
            nameInput.value = '';

            // Оновлюємо іконку на картці товару
            this.updateProductCardIcon(productId);

        } catch (error) {
            Utils.showNotification('Помилка створення колекції', 'error');
        }
    }

    /**
     * Оновлює іконку на картці товару, запитуючи актуальний статус з сервера
     */
    async updateProductCardIcon(productId) {
        const cardBtn = document.querySelector(`.collection-btn[data-product-id="${productId}"] span`);
        if (!cardBtn) return;

        try {
            const status = await api.get(`/collections/product-status/${productId}`);
            cardBtn.textContent = status.icon;
        } catch {
            cardBtn.textContent = '🤍';
        }
    }

    /**
     * Показати модальне вікно для редагування колекції
     */
    showEditCollectionModal(collectionId, currentName, currentIcon) {
        const modal = document.createElement('div');
        modal.id = 'edit-collection-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 transform transition-transform scale-95 opacity-0 animate-modal-in">
                <h3 class="text-xl font-bold mb-6 dark:text-white">Налаштування колекції</h3>

                <div class="mb-4">
                    <label for="edit-collection-name" class="block text-sm font-medium mb-1 dark:text-gray-300">Назва</label>
                    <input type="text" id="edit-collection-name" class="w-full p-2 border rounded dark:bg-gray-700" value="${currentName}">
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2 dark:text-gray-300">Іконка</label>
                    <div id="edit-emoji-palette" class="flex flex-wrap gap-2">
                        ${this.emojiPalette.map(emoji => `
                            <button class="p-2 rounded-full text-2xl hover:bg-gray-200 dark:hover:bg-gray-600 ${emoji === currentIcon ? 'bg-blue-200 dark:bg-blue-800' : ''}" data-emoji="${emoji}">
                                ${emoji}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="flex justify-between items-center gap-3">
                    <button onclick="collections.deleteCollection(${collectionId}, this)" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
                        Видалити
                    </button>
                    <div class="flex gap-3">
                        <button onclick="this.closest('#edit-collection-modal').remove()" class="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">
                            Скасувати
                        </button>
                        <button onclick="collections.updateCollection(${collectionId})" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
                            Зберегти
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Обробник для вибору емодзі
        modal.querySelector('#edit-emoji-palette').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                modal.querySelectorAll('#edit-emoji-palette button').forEach(btn => btn.classList.remove('bg-blue-200', 'dark:bg-blue-800'));
                e.target.classList.add('bg-blue-200', 'dark:bg-blue-800');
            }
        });

        // Анімація появи
        setTimeout(() => {
            modal.querySelector('.animate-modal-in').classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    /**
     * Оновити назву та іконку колекції
     */
    async updateCollection(collectionId) {
        const nameInput = document.getElementById('edit-collection-name');
        const name = nameInput.value.trim();
        const selectedEmojiEl = document.querySelector('#edit-emoji-palette .bg-blue-200');
        const icon = selectedEmojiEl ? selectedEmojiEl.dataset.emoji : '🤍';

        if (!name) {
            Utils.showNotification('Введіть назву колекції', 'warning');
            return;
        }

        try {
            await api.put(`/collections/${collectionId}`, { name, icon });
            Utils.showNotification('Колекцію оновлено!', 'success');
            document.getElementById('edit-collection-modal').remove();
            app.render(); // Перерендеримо всю сторінку, щоб оновити список
        } catch (error) {
            Utils.showNotification('Помилка оновлення', 'error');
        }
    }

    /**
     * Видалити колекцію
     */
    async deleteCollection(collectionId, buttonElement) {
        const confirmed = await new Promise(resolve => {
            auth.showConfirm('Ви впевнені, що хочете видалити цю колекцію? Товари залишаться, але колекція зникне назавжди.', resolve);
        });

        if (!confirmed) return;

        buttonElement.textContent = 'Видалення...';
        buttonElement.disabled = true;

        try {
            await api.delete(`/collections/${collectionId}`);
            Utils.showNotification('Колекцію видалено', 'success');
            document.getElementById('edit-collection-modal').remove();
            app.render(); // Перерендеримо всю сторінку
        } catch (error) {
            Utils.showNotification('Помилка видалення', 'error');
            buttonElement.textContent = 'Видалити';
            buttonElement.disabled = false;
        }
    }
}

// Створюємо та експортуємо єдиний екземпляр
const collections = new CollectionsModule();
window.collections = collections;