// js/core/Application.js
import { RenderService } from '../services/RenderService.js';
import { EventService } from '../services/EventService.js';
import { NotificationService } from '../services/NotificationService.js';
import { ModalService } from '../services/ModalService.js';

export class Application {
    constructor() {
        this.currentPage = 'home';
        this.translations = {};
        this.selectedSubscriptionPlan = null;
        this.currentPageParams = {}; // Ініціалізуємо параметри

        // Services
        this.renderService = new RenderService(this);
        this.eventService = new EventService(this);
        this.notificationService = new NotificationService(this);
        this.modalService = new ModalService(this);

        // Keep legacy references
        this.onboarding = window.onboarding;
    }

    async init() {
        console.log('🚀 Ініціалізація OhMyRevit...');

        this.applyTheme();
        await this.loadTranslations();

        // Ініціалізація auth вже відбулась в auth.js при імпорті
        // Перевіряємо чи є користувач
        const user = await auth.getUser();
        if (user) {
            console.log('User found:', user.first_name);
            await bonuses.init();
        }

        this.eventService.initNavigation();
        this.eventService.initEventHandlers();
        this.updateUI();

        const urlParams = Utils.getUrlParams();
        const page = urlParams.page || 'home';
        delete urlParams.page; // Видаляємо page, щоб залишились тільки інші параметри

        this.navigateTo(page, true, urlParams);
        cart.updateCartBadge();

        console.log('✅ Додаток готовий!');
    }

    async loadTranslations() {
        const lang = Utils.getCurrentLanguage();
        try {
            const response = await fetch(`/assets/locales/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    t(key, defaultValue = '') {
        const keys = key.split('.');
        let result = this.translations;
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                return defaultValue || key;
            }
        }
        return result || defaultValue || key;
    }

    applyTheme() {
        const theme = Utils.getCurrentTheme();
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    navigateTo(page, pushState = true, params = {}) {
        this.currentPage = page;
        this.currentPageParams = params;

        if (pushState) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);

            // --- ВИПРАВЛЕНО ТУТ ---
            // Тепер логіка коректно обробляє об'єкт параметрів.
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.set(key, params[key]);
                } else {
                    url.searchParams.delete(key);
                }
            });

            // Очищаємо старі параметри, яких немає в нових
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.forEach((value, key) => {
                if(key !== 'page' && !params.hasOwnProperty(key)) {
                    url.searchParams.delete(key);
                }
            });

            window.history.pushState({ page, params }, '', url);
        }

        this.updateActiveNavigation(page);
        this.render();
        window.scrollTo(0, 0);
    }

    updateActiveNavigation(page) {
        document.querySelectorAll('[data-page]').forEach(btn => {
            if (btn.dataset.page === page) {
                btn.classList.add('text-blue-600', 'dark:text-blue-400');
                btn.classList.remove('text-gray-600', 'dark:text-gray-400');
            } else {
                btn.classList.remove('text-blue-600', 'dark:text-blue-400');
                btn.classList.add('text-gray-600', 'dark:text-gray-400');
            }
        });
    }

    async render() {
        const content = document.getElementById('page-content');
        if (!content) return;

        Utils.showLoader(true);

        try {
            console.log('Application.render - page:', this.currentPage, 'params:', this.currentPageParams);
            const html = await this.renderService.renderPage(this.currentPage, this.currentPageParams);
            content.innerHTML = html;
            this.initPageHandlers();
        } catch (error) {
            console.error('Render error:', error);
            content.innerHTML = this.renderService.views.error.renderErrorPage(error);
        } finally {
            Utils.showLoader(false);
        }
    }

    initPageHandlers() {
        this.eventService.initPageHandlers();
    }

    updateUI() {
        this.updateThemeButton();
        this.updateLanguageButton();
        this.updateProfileButton();
        this.updateNavigationText();
        cart.updateCartBadge();
    }

    updateThemeButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            const theme = Utils.getCurrentTheme();
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    updateLanguageButton() {
        const btn = document.getElementById('language-toggle');
        if (btn) {
            const lang = Utils.getCurrentLanguage();
            btn.textContent = `🌐 ${lang.toUpperCase()}`;
        }
    }

    updateProfileButton() {
        const btn = document.getElementById('profile-btn');
        if (btn && auth.user) {
            btn.innerHTML = `<span class="text-2xl">👤</span><span class="text-xs">${auth.user.first_name}</span>`;
        }
    }

    updateNavigationText() {
        document.querySelector('button[data-page="home"] .text-xs').textContent = this.t('navigation.home');
        document.querySelector('button[data-page="market"] .text-xs').textContent = this.t('navigation.market');
        document.querySelector('button[data-page="cart"] .text-xs').textContent = this.t('navigation.cart');
        document.querySelector('button[data-page="profile"] .text-xs').textContent = this.t('navigation.profile');
    }

    // Delegated methods for legacy compatibility
    showTab(tab) { return this.renderService.showProfileTab(tab); }
    applyFilters() { return this.renderService.applyFilters(); }
    applySorting(value) { return this.renderService.applySorting(value); }
    handleSearch(event) { return this.renderService.handleSearch(event); }
    doSearch() { return this.renderService.doSearch(); }
    loadPage(page) { return this.renderService.loadPage(page); }
    claimDailyBonus() { return this.modalService.claimDailyBonus(); }
    showSubscriptionPlans() { return this.modalService.showSubscriptionPlans(); }
    selectSubscriptionPlan(planId) { return this.modalService.selectSubscriptionPlan(planId); }
    paySubscription(method, currency) { return this.modalService.paySubscription(method, currency); }
    showLanguageMenu() { return this.modalService.showLanguageMenu(); }
    selectLanguage(lang) { return this.modalService.selectLanguage(lang); }
    showNotifications() { return this.notificationService.showNotifications(); }
    showPinCodeModal() { return this.modalService.showPinCodeModal(); }
    savePinCode(event) { return this.modalService.savePinCode(event); }
    showReferralCode(code) { return this.modalService.showReferralCode(code); }
    shareReferral(platform) { return this.modalService.shareReferral(platform); }
    sendSupportMessage(event) { return this.modalService.sendSupportMessage(event); }
    updateSetting(setting, value) { return this.modalService.updateSetting(setting, value); }
    toggleFaqItem(index) { return this.renderService.toggleFaqItem(index); }
    formatNotificationTime(timestamp) { return this.notificationService.formatNotificationTime(timestamp); }
    handleNotificationClick(notificationId) { return this.notificationService.handleNotificationClick(notificationId); }
    markAllAsRead() { return this.notificationService.markAllAsRead(); }
    clearAllNotifications() { return this.notificationService.clearAllNotifications(); }
    showSearch() { this.navigateTo('market'); setTimeout(() => document.getElementById('search-input')?.focus(), 100); }
}