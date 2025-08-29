// js/store/AdminStore.js
export class AdminStore {
    constructor() {
        this.dashboard = null;
        this.users = [];
        this.products = [];
        this.moderation = [];
        this.creatorApplications = [];
        this.promocodes = [];
        this.broadcastHistory = [];
    }

    // Dashboard
    setDashboard(data) {
        this.dashboard = data;
    }

    getDashboard() {
        return this.dashboard;
    }

    // Users
    setUsers(users) {
        this.users = users || [];
    }

    getUsers() {
        return [...this.users];
    }

    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    }

    // Products
    setProducts(products) {
        this.products = products || [];
    }

    getProducts() {
        return [...this.products];
    }

    getProductById(productId) {
        return this.products.find(p => p.id === productId);
    }

    // Moderation
    setModeration(items) {
        this.moderation = items || [];
    }

    getModeration() {
        return [...this.moderation];
    }

    // Creator Applications
    setCreatorApplications(applications) {
        this.creatorApplications = applications || [];
    }

    getCreatorApplications() {
        return [...this.creatorApplications];
    }

    // Promocodes
    setPromocodes(promocodes) {
        this.promocodes = promocodes || [];
    }

    getPromocodes() {
        return [...this.promocodes];
    }

    // Broadcast History
    setBroadcastHistory(history) {
        this.broadcastHistory = history || [];
    }

    getBroadcastHistory() {
        return [...this.broadcastHistory];
    }

    // Clear all data
    clearAll() {
        this.dashboard = null;
        this.users = [];
        this.products = [];
        this.moderation = [];
        this.creatorApplications = [];
        this.promocodes = [];
        this.broadcastHistory = [];
    }
}

window.AdminStore = AdminStore;
export default AdminStore;