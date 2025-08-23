/**
 * Модуль для роботи з API
 * Централізує всі запити до backend
 */

class ApiClient {
    constructor() {
        // Базовий URL для API - змініть на ваш backend URL
        this.baseURL = window.location.hostname === 'localhost'
            ? 'http://localhost:8000/api'
            : '/api'; // Для production через nginx

        // Токен зберігається в localStorage
        this.token = localStorage.getItem('access_token');

        // Заголовки за замовчуванням
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    /**
     * Встановити токен авторизації
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
        }
    }

    /**
     * Отримати заголовки з токеном
     */
    getHeaders() {
        const headers = { ...this.defaultHeaders };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    /**
     * Базовий метод для запитів
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            // Якщо 401 - токен невалідний
            if (response.status === 401) {
                this.setToken(null);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Необхідна авторизація');
            }

            // Перевірка на помилки
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || `HTTP Error ${response.status}`);
            }

            // Повертаємо JSON або текст
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();

        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * GET запит
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST запит
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT запит
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE запит
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ========== AUTH ENDPOINTS ==========

    /**
     * Авторизація через Telegram
     */
    async loginWithTelegram(initData) {
        const response = await this.post('/auth/telegram', {
            init_data: initData
        });

        if (response.access_token) {
            this.setToken(response.access_token);
        }

        return response;
    }

    /**
     * Отримати поточного користувача
     */
    async getCurrentUser() {
        return this.get('/auth/me');
    }

    /**
     * Вийти з системи
     */
    async logout() {
        this.setToken(null);
        return this.post('/auth/logout');
    }

    // ========== PRODUCTS ENDPOINTS ==========

    /**
     * Отримати список продуктів
     */
    async getProducts(params = {}) {
        return this.get('/products/', params);
    }

    /**
     * Отримати продукт за ID
     */
    async getProduct(productId, language = 'uk') {
        return this.get(`/products/${productId}`, { language });
    }

    /**
     * Отримати продукти для головної сторінки
     */
    async getFeaturedProducts(language = 'uk') {
        return this.get('/products/featured/home', { language });
    }

    /**
     * Додати/видалити з обраного
     */
    async toggleFavorite(productId) {
        return this.post(`/products/${productId}/favorite`);
    }

    /**
     * Отримати обрані товари
     */
    async getFavorites(language = 'uk') {
        return this.get('/products/user/favorites', { language });
    }

    // ========== CART ENDPOINTS (будуть додані пізніше) ==========

    /**
     * Додати в кошик
     */
    async addToCart(productId) {
        return this.post('/cart/add', { product_id: productId });
    }

    /**
     * Отримати кошик
     */
    async getCart() {
        return this.get('/cart');
    }

    /**
     * Видалити з кошика
     */
    async removeFromCart(itemId) {
        return this.delete(`/cart/${itemId}`);
    }

    // ========== ORDERS ENDPOINTS (будуть додані пізніше) ==========

    /**
     * Створити замовлення
     */
    async createOrder(data) {
        return this.post('/orders', data);
    }

    /**
     * Отримати історію замовлень
     */
    async getOrders() {
        return this.get('/orders');
    }

    // ========== SUBSCRIPTION ENDPOINTS (будуть додані пізніше) ==========

    /**
     * Отримати плани підписок
     */
    async getSubscriptionPlans() {
        return this.get('/subscriptions/plans');
    }

    /**
     * Створити підписку
     */
    async createSubscription(planType) {
        return this.post('/subscriptions', { plan_type: planType });
    }

    // ========== BONUS ENDPOINTS (будуть додані пізніше) ==========

    /**
     * Отримати щоденний бонус
     */
    async claimDailyBonus() {
        return this.post('/bonuses/daily/claim');
    }

    /**
     * Крутити колесо фортуни
     */
    async spinWheel(isFree = true) {
        return this.post('/bonuses/wheel/spin', { is_free: isFree });
    }

    // ========== UTILITY METHODS ==========

    /**
     * Перевірити чи користувач авторизований
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Завантажити файл
     */
    async downloadFile(url, filename) {
        try {
            const response = await fetch(url, {
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }
}

// Створюємо та експортуємо єдиний екземпляр
const api = new ApiClient();

// Експортуємо для використання в інших модулях
window.api = api;

// Також експортуємо клас для тестування
export default ApiClient;