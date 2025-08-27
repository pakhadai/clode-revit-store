// js/store/UserStore.js
export class UserStore {
    constructor() {
        this.storageKey = 'user';
    }

    saveUser(user) {
        Utils.storage.set(this.storageKey, user);
    }

    getUser() {
        return Utils.storage.get(this.storageKey, null);
    }

    clearUser() {
        Utils.storage.remove(this.storageKey);
        Utils.storage.remove('access_token');
    }

    updateUser(updates) {
        const user = this.getUser();
        if (user) {
            const updatedUser = { ...user, ...updates };
            this.saveUser(updatedUser);
            return updatedUser;
        }
        return null;
    }
}