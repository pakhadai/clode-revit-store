/**
 * Модуль навігації
 * Відповідає за нижнє меню навігації
 */

class NavigationModule {
    constructor(app) {
        this.app = app;
        this.currentPage = 'home';
    }

    /**
     * Ініціалізація навігації
     */
    init() {
        this.render();
        this.attachEventListeners();
        this.updateActiveState();
    }

    /**
     * Рендер навігаційного меню
     */
    render() {
        const nav = document.getElementById('bottom-navigation');
        if (!nav) return;

        const isAdmin = this.app.auth?.currentUser?.is_admin;

        nav.innerHTML = `
            <div class="nav-container">
                <button class="nav-item" data-page="home">
                    <div class="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                    </div>
                    <span class="nav-label">${this.app.t('nav.home')}</span>
                </button>

                <button class="nav-item" data-page="market">
                    <div class="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                    </div>
                    <span class="nav-label">${this.app.t('nav.market')}</span>
                </button>

                <button class="nav-item" data-page="cart">
                    <div class="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <span class="nav-badge" id="cart-badge" style="display: none;">0</span>
                    </div>
                    <span class="nav-label">${this.app.t('nav.cart')}</span>
                </button>

                <button class="nav-item" data-page="profile">
                    <div class="nav-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <span class="nav-label">${this.app.t('nav.profile')}</span>
                </button>

                ${isAdmin ? `
                    <button class="nav-item" data-page="admin">
                        <div class="nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 9.96l4.24 4.24M3.78 20.22l4.24-4.24M14.22 14.22l4.24 4.24"/>
                            </svg>
                        </div>
                        <span class="nav-label">${this.app.t('nav.admin')}</span>
                    </button>
                ` : ''}
            </div>
        `;

        // Додаємо стилі для навігації
        this.injectStyles();
    }

    /**
     * Додавання стилів для навігації
     */
    injectStyles() {
        if (document.getElementById('nav-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'nav-styles';
        styles.innerHTML = `
            #bottom-navigation {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 1000;
                transition: transform 0.3s ease;
            }

            .dark #bottom-navigation {
                background: rgba(31, 41, 55, 0.95);
                border-top-color: rgba(255, 255, 255, 0.1);
            }

            .nav-container {
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: 0.5rem 0;
                max-width: 600px;
                margin: 0 auto;
            }

            .nav-item {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                padding: 0.5rem 1rem;
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                transition: all 0.3s ease;
                -webkit-tap-highlight-color: transparent;
            }

            .dark .nav-item {
                color: #9ca3af;
            }

            .nav-item:hover {
                color: #3b82f6;
            }

            .nav-item.active {
                color: #3b82f6;
            }

            .dark .nav-item.active {
                color: #60a5fa;
            }

            .nav-icon {
                position: relative;
                width: 24px;
                height: 24px;
                transition: transform 0.3s ease;
            }

            .nav-item:active .nav-icon {
                transform: scale(0.9);
            }

            .nav-item.active .nav-icon {
                transform: scale(1.1);
            }

            .nav-label {
                font-size: 0.75rem;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .nav-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                font-size: 0.625rem;
                font-weight: bold;
                padding: 0.125rem 0.25rem;
                border-radius: 9999px;
                min-width: 16px;
                text-align: center;
            }

            /* Анімація появи */
            @keyframes navItemAppear {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .nav-item {
                animation: navItemAppear 0.3s ease backwards;
            }

            .nav-item:nth-child(1) { animation-delay: 0.05s; }
            .nav-item:nth-child(2) { animation-delay: 0.1s; }
            .nav-item:nth-child(3) { animation-delay: 0.15s; }
            .nav-item:nth-child(4) { animation-delay: 0.2s; }
            .nav-item:nth-child(5) { animation-delay: 0.25s; }

            /* Індикатор активної сторінки */
            .nav-item.active::before {
                content: '';
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                background: #3b82f6;
                border-radius: 50%;
            }

            /* Адаптивність */
            @media (max-width: 380px) {
                .nav-label {
                    font-size: 0.625rem;
                }

                .nav-item {
                    padding: 0.5rem 0.75rem;
                }
            }

            @media (min-width: 768px) {
                .nav-container {
                    padding: 0.75rem 0;
                }

                .nav-label {
                    font-size: 0.875rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Прикріплення обробників подій
     */
    attachEventListeners() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.page;
                this.navigateTo(page);
            });
        });

        // Обробка свайпів для приховування/показу навігації
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavVisibility = () => {
            const currentScrollY = window.scrollY;
            const nav = document.getElementById('bottom-navigation');

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Скролимо вниз - ховаємо навігацію
                nav.style.transform = 'translateY(100%)';
            } else {
                // Скролимо вгору - показуємо навігацію
                nav.style.transform = 'translateY(0)';
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateNavVisibility);
                ticking = true;
            }
        });
    }

    /**
     * Навігація до сторінки
     */
    navigateTo(page) {
        this.currentPage = page;
        this.updateActiveState();

        // Викликаємо метод навігації головного додатку
        if (this.app && this.app.navigateTo) {
            this.app.navigateTo(page);
        }

        // Анімація натискання
        this.animateNavigation(page);
    }

    /**
     * Оновлення активного стану кнопок
     */
    updateActiveState() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.dataset.page === this.currentPage) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Анімація навігації
     */
    animateNavigation(page) {
        const btn = document.querySelector(`[data-page="${page}"]`);
        if (!btn) return;

        // Тактильний відгук для мобільних
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }

        // Візуальний відгук
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }

    /**
     * Оновлення бейджа кошика
     */
    updateCartBadge(count) {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Встановити активну сторінку
     */
    setActivePage(page) {
        this.currentPage = page;
        this.updateActiveState();
    }
}

// Експортуємо клас
window.NavigationModule = NavigationModule;