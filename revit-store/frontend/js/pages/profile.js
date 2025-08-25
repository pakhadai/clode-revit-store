/**
 * Модуль сторінки профілю
 */

class ProfilePage {
    constructor(app) {
        this.app = app;
        this.currentTab = 'downloads';
    }

    /**
     * Рендер сторінки
     */
    async render() {
        const container = document.getElementById('page-content');

        if (!this.app.auth.isAuthenticated()) {
            container.innerHTML = this.renderAuthRequired();
        } else {
            container.innerHTML = await this.renderProfile();
        }

        this.injectStyles();
        this.attachEventListeners();
    }

    /**
     * Рендер сторінки з вимогою авторизації
     */
    renderAuthRequired() {
        return `
            <div class="auth-required-container animate-fadeIn">
                <div class="auth-required-content">
                    <div class="auth-icon">🔒</div>
                    <h2 class="auth-title">${this.app.t('auth.authRequired')}</h2>
                    <p class="auth-text">${this.app.t('auth.authRequiredDesc')}</p>
                    <button class="btn-login" onclick="app.auth.authenticate()">
                        ${this.app.t('auth.loginWith')} ${this.app.t('auth.telegram')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Рендер профілю
     */
    async renderProfile() {
        const user = this.app.auth.currentUser;

        return `
            <div class="profile-page animate-fadeIn">
                <!-- Заголовок профілю -->
                <div class="profile-header">
                    <div class="profile-cover"></div>
                    <div class="profile-info">
                        <div class="profile-avatar">
                            ${user.photo_url ?
                                `<img src="${user.photo_url}" alt="${user.first_name}">` :
                                `<span>${user.first_name?.[0] || '👤'}</span>`
                            }
                        </div>
                        <div class="profile-details">
                            <h1 class="profile-name">${user.first_name} ${user.last_name || ''}</h1>
                            <p class="profile-username">@${user.username || `user_${user.telegram_id}`}</p>
                            <div class="profile-badges">
                                ${this.renderBadges(user)}
                            </div>
                        </div>
                        <div class="profile-stats">
                            ${this.renderStats(user)}
                        </div>
                    </div>
                </div>

                <!-- Табуляція -->
                <div class="profile-tabs">
                    <div class="tabs-nav">
                        ${this.renderTabsNav()}
                    </div>
                    <div class="tabs-content" id="tab-content">
                        ${await this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер бейджів
     */
    renderBadges(user) {
        const badges = [];

        if (user.vip_level > 0) {
            const vipLevels = {
                1: { name: this.app.t('profile.level.bronze'), color: 'bronze' },
                2: { name: this.app.t('profile.level.silver'), color: 'silver' },
                3: { name: this.app.t('profile.level.gold'), color: 'gold' },
                4: { name: this.app.t('profile.level.diamond'), color: 'diamond' }
            };
            const vip = vipLevels[user.vip_level];
            if (vip) {
                badges.push(`<span class="badge badge-${vip.color}">⭐ ${vip.name}</span>`);
            }
        }

        if (user.is_creator) {
            badges.push(`<span class="badge badge-creator">🎨 ${this.app.t('creator.title')}</span>`);
        }

        if (user.is_admin) {
            badges.push(`<span class="badge badge-admin">👑 ${this.app.t('admin.title')}</span>`);
        }

        if (user.subscription_active) {
            badges.push(`<span class="badge badge-premium">💎 Premium</span>`);
        }

        return badges.join('');
    }

    /**
     * Рендер статистики
     */
    renderStats(user) {
        return `
            <div class="stat-item">
                <div class="stat-value">${user.balance || 0}</div>
                <div class="stat-label">${this.app.t('profile.bonuses')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${user.purchases_count || 0}</div>
                <div class="stat-label">${this.app.t('profile.purchases')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${user.referral_count || 0}</div>
                <div class="stat-label">${this.app.t('profile.referrals')}</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${user.cashback_percent || 0}%</div>
                <div class="stat-label">${this.app.t('profile.cashback')}</div>
            </div>
        `;
    }

    /**
     * Рендер навігації табів
     */
    renderTabsNav() {
        const tabs = [
            { id: 'downloads', icon: '📥', name: this.app.t('profile.tabs.downloads') },
            { id: 'favorites', icon: '❤️', name: this.app.t('profile.tabs.favorites') },
            { id: 'history', icon: '📋', name: this.app.t('profile.tabs.history') },
            { id: 'referral', icon: '🤝', name: this.app.t('profile.tabs.referral') },
            { id: 'settings', icon: '⚙️', name: this.app.t('profile.tabs.settings') },
            { id: 'security', icon: '🔐', name: this.app.t('profile.tabs.security') }
        ];

        return tabs.map(tab => `
            <button class="tab-btn ${this.currentTab === tab.id ? 'active' : ''}"
                    data-tab="${tab.id}"
                    onclick="profilePage.switchTab('${tab.id}')">
                <span class="tab-icon">${tab.icon}</span>
                <span class="tab-name">${tab.name}</span>
            </button>
        `).join('');
    }

    /**
     * Перемкнути таб
     */
    async switchTab(tabId) {
        this.currentTab = tabId;

        // Оновлюємо навігацію
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Оновлюємо контент
        const content = document.getElementById('tab-content');
        if (content) {
            content.innerHTML = '<div class="loading">Loading...</div>';
           content.innerHTML = await this.renderTabContent();
       }
   }

   /**
    * Рендер контенту табу
    */
   async renderTabContent() {
       switch (this.currentTab) {
           case 'downloads':
               return await this.renderDownloadsTab();
           case 'favorites':
               return this.renderFavoritesTab();
           case 'history':
               return this.renderHistoryTab();
           case 'referral':
               return this.renderReferralTab();
           case 'settings':
               return this.renderSettingsTab();
           case 'security':
               return this.renderSecurityTab();
           default:
               return '';
       }
   }

   /**
    * Рендер табу завантажень
    */
   async renderDownloadsTab() {
       try {
           const downloads = await this.app.api.get('/products/user/downloads');

           if (!downloads || downloads.length === 0) {
               return `
                   <div class="empty-tab">
                       <div class="empty-icon">📥</div>
                       <h3 class="empty-title">${this.app.t('profile.downloads.empty')}</h3>
                       <p class="empty-text">${this.app.t('profile.downloads.emptyText')}</p>
                   </div>
               `;
           }

           return `
               <div class="downloads-list">
                   ${downloads.map(item => `
                       <div class="download-item">
                           <div class="download-image">
                               <img src="${item.preview_image || '/assets/placeholder.jpg'}"
                                    alt="${item.title}">
                           </div>
                           <div class="download-info">
                               <h3 class="download-title">${item.title}</h3>
                               <p class="download-date">${this.app.t('profile.downloads.downloadedAt')}: ${new Date(item.purchased_at).toLocaleDateString()}</p>
                           </div>
                           <button class="btn-download" onclick="profilePage.downloadProduct(${item.id})">
                               ${this.app.t('profile.downloads.download')}
                           </button>
                       </div>
                   `).join('')}
               </div>
           `;
       } catch (error) {
           console.error('Error loading downloads:', error);
           return '<div class="error">Error loading downloads</div>';
       }
   }

   /**
    * Рендер табу обраного
    */
   renderFavoritesTab() {
       const favorites = this.app.utils.storage.get('favorites', []);

       if (favorites.length === 0) {
           return `
               <div class="empty-tab">
                   <div class="empty-icon">❤️</div>
                   <h3 class="empty-title">${this.app.t('profile.favorites.empty')}</h3>
                   <p class="empty-text">${this.app.t('profile.favorites.emptyText')}</p>
               </div>
           `;
       }

       return `
           <div class="favorites-grid">
               ${favorites.map(productId => `
                   <div class="favorite-card" onclick="app.navigateTo('product', {id: ${productId}})">
                       <div class="favorite-image">
                           <div class="placeholder">📦</div>
                       </div>
                       <div class="favorite-title">Product #${productId}</div>
                       <button class="btn-remove-favorite"
                               onclick="event.stopPropagation(); profilePage.removeFavorite(${productId})">
                           ❌
                       </button>
                   </div>
               `).join('')}
           </div>
       `;
   }

   /**
    * Рендер табу історії
    */
   renderHistoryTab() {
       const orders = this.app.utils.storage.get('user_orders', []);

       if (orders.length === 0) {
           return `
               <div class="empty-tab">
                   <div class="empty-icon">📋</div>
                   <h3 class="empty-title">${this.app.t('profile.history.empty')}</h3>
                   <p class="empty-text">${this.app.t('profile.history.emptyText')}</p>
               </div>
           `;
       }

       return `
           <div class="history-list">
               ${orders.map(order => `
                   <div class="history-item">
                       <div class="history-header">
                           <h4 class="history-number">Order #${order.order_number}</h4>
                           <span class="history-status status-${order.status}">${order.status}</span>
                       </div>
                       <div class="history-details">
                           <span class="history-date">${new Date(order.created_at).toLocaleDateString()}</span>
                           <span class="history-amount">$${(order.total / 100).toFixed(2)}</span>
                       </div>
                       <div class="history-items">
                           ${order.items_count} ${this.app.t('profile.history.items')}
                       </div>
                   </div>
               `).join('')}
           </div>
       `;
   }

   /**
    * Рендер табу рефералів
    */
   renderReferralTab() {
       const user = this.app.auth.currentUser;
       const referralLink = `https://t.me/OhMyRevitBot?start=${user.referral_code}`;

       return `
           <div class="referral-content">
               <div class="referral-stats">
                   <div class="referral-stat-card">
                       <div class="stat-icon">👥</div>
                       <div class="stat-value">${user.referral_count || 0}</div>
                       <div class="stat-label">${this.app.t('profile.referral.invited')}</div>
                   </div>
                   <div class="referral-stat-card">
                       <div class="stat-icon">💰</div>
                       <div class="stat-value">${user.referral_earnings || 0}</div>
                       <div class="stat-label">${this.app.t('profile.referral.earned')}</div>
                   </div>
               </div>

               <div class="referral-link-section">
                   <h3 class="section-title">${this.app.t('profile.referral.yourLink')}</h3>
                   <div class="link-container">
                       <input type="text"
                              class="referral-link"
                              value="${referralLink}"
                              readonly>
                       <button class="btn-copy" onclick="profilePage.copyReferralLink()">
                           ${this.app.t('profile.referral.copy')}
                       </button>
                   </div>
               </div>

               <div class="referral-share">
                   <h3 class="section-title">${this.app.t('profile.referral.share')}</h3>
                   <div class="share-buttons">
                       <button class="share-btn share-telegram" onclick="profilePage.shareReferral('telegram')">
                           <span>✈️</span> Telegram
                       </button>
                       <button class="share-btn share-whatsapp" onclick="profilePage.shareReferral('whatsapp')">
                           <span>💬</span> WhatsApp
                       </button>
                       <button class="share-btn share-twitter" onclick="profilePage.shareReferral('twitter')">
                           <span>🐦</span> Twitter
                       </button>
                   </div>
               </div>

               <div class="referral-info">
                   <h3 class="section-title">${this.app.t('profile.referral.howItWorks')}</h3>
                   <div class="info-steps">
                       <div class="info-step">
                           <div class="step-number">1</div>
                           <p>${this.app.t('profile.referral.step1')}</p>
                       </div>
                       <div class="info-step">
                           <div class="step-number">2</div>
                           <p>${this.app.t('profile.referral.step2')}</p>
                       </div>
                       <div class="info-step">
                           <div class="step-number">3</div>
                           <p>${this.app.t('profile.referral.step3')}</p>
                       </div>
                   </div>
               </div>
           </div>
       `;
   }

   /**
    * Рендер табу налаштувань
    */
   renderSettingsTab() {
       const user = this.app.auth.currentUser;
       const currentLang = this.app.utils.getCurrentLanguage();
       const currentTheme = this.app.utils.getCurrentTheme();

       return `
           <div class="settings-content">
               <div class="settings-group">
                   <h3 class="settings-title">${this.app.t('profile.settings.title')}</h3>

                   <div class="setting-item">
                       <label class="setting-label">${this.app.t('profile.settings.language')}</label>
                       <select class="setting-select" onchange="profilePage.changeLanguage(this.value)">
                           <option value="uk" ${currentLang === 'uk' ? 'selected' : ''}>🇺🇦 Українська</option>
                           <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                           <option value="ru" ${currentLang === 'ru' ? 'selected' : ''}>⚪ Русский</option>
                       </select>
                   </div>

                   <div class="setting-item">
                       <label class="setting-label">${this.app.t('profile.settings.theme')}</label>
                       <div class="theme-selector">
                           <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}"
                                   onclick="profilePage.changeTheme('light')">
                               <span>☀️</span>
                               <span>${this.app.t('profile.settings.light')}</span>
                           </button>
                           <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}"
                                   onclick="profilePage.changeTheme('dark')">
                               <span>🌙</span>
                               <span>${this.app.t('profile.settings.dark')}</span>
                           </button>
                       </div>
                   </div>

                   <div class="setting-item">
                       <label class="setting-label">${this.app.t('profile.settings.notifications')}</label>
                       <label class="toggle-switch">
                           <input type="checkbox"
                                  ${user.notifications_enabled ? 'checked' : ''}
                                  onchange="profilePage.toggleNotifications(this.checked)">
                           <span class="toggle-slider"></span>
                       </label>
                   </div>
               </div>

               <button class="btn-save-settings" onclick="profilePage.saveSettings()">
                   ${this.app.t('profile.settings.save')}
               </button>
           </div>
       `;
   }

   /**
    * Рендер табу безпеки
    */
   renderSecurityTab() {
       const user = this.app.auth.currentUser;

       return `
           <div class="security-content">
               <div class="security-group">
                   <h3 class="security-title">${this.app.t('profile.security.title')}</h3>

                   <div class="security-item">
                       <div class="security-info">
                           <h4>${this.app.t('profile.security.pinCode')}</h4>
                           <p>${this.app.t('profile.security.pinCodeDesc')}</p>
                       </div>
                       <button class="btn-security" onclick="profilePage.showPinModal()">
                           ${this.app.t('profile.security.changePinCode')}
                       </button>
                   </div>

                   <div class="security-item">
                       <div class="security-info">
                           <h4>${this.app.t('profile.security.twoFactor')}</h4>
                           <p>${this.app.t('profile.security.twoFactorDesc')}</p>
                       </div>
                       <button class="btn-security ${user.two_factor_enabled ? 'btn-danger' : ''}"
                               onclick="profilePage.toggle2FA()">
                           ${user.two_factor_enabled ?
                               this.app.t('profile.security.disable') :
                               this.app.t('profile.security.enable')}
                       </button>
                   </div>

                   <div class="security-item">
                       <div class="security-info">
                           <h4>${this.app.t('profile.security.activeSessions')}</h4>
                           <p>${this.app.t('profile.security.activeSessionsDesc')}</p>
                       </div>
                       <button class="btn-security" onclick="profilePage.showSessions()">
                           ${this.app.t('profile.security.viewSessions')}
                       </button>
                   </div>
               </div>

               <div class="danger-zone">
                   <h3 class="danger-title">${this.app.t('profile.security.dangerZone')}</h3>
                   <button class="btn-logout" onclick="profilePage.logout()">
                       ${this.app.t('auth.logout')}
                   </button>
               </div>
           </div>
       `;
   }

   /**
    * Методи для дій
    */
   async downloadProduct(productId) {
       await this.app.products.downloadProduct(productId);
   }

   removeFavorite(productId) {
       const favorites = this.app.utils.storage.get('favorites', []);
       const index = favorites.indexOf(productId);
       if (index > -1) {
           favorites.splice(index, 1);
           this.app.utils.storage.set('favorites', favorites);
           this.switchTab('favorites');
       }
   }

   copyReferralLink() {
       const input = document.querySelector('.referral-link');
       if (input) {
           this.app.utils.copyToClipboard(input.value);
       }
   }

   shareReferral(platform) {
       const user = this.app.auth.currentUser;
       const link = `https://t.me/OhMyRevitBot?start=${user.referral_code}`;
       const text = this.app.t('profile.referral.shareText');

       switch(platform) {
           case 'telegram':
               window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
               break;
           case 'whatsapp':
               window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`);
               break;
           case 'twitter':
               window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`);
               break;
       }
   }

   changeLanguage(lang) {
       this.app.utils.setLanguage(lang);
       window.location.reload();
   }

   changeTheme(theme) {
       this.app.utils.setTheme(theme);
       this.app.applyTheme();

       // Оновлюємо UI
       document.querySelectorAll('.theme-option').forEach(btn => {
           btn.classList.toggle('active', btn.onclick?.toString().includes(theme));
       });
   }

   toggleNotifications(enabled) {
       // Зберігаємо налаштування
       this.app.auth.updateProfile({ notifications_enabled: enabled });
   }

   async saveSettings() {
       this.app.utils.showNotification(this.app.t('profile.settings.saved'), 'success');
   }

   showPinModal() {
       // Показати модальне вікно для PIN-коду
       this.app.utils.showNotification(this.app.t('notifications.comingSoon'), 'info');
   }

   toggle2FA() {
       // Перемкнути 2FA
       this.app.utils.showNotification(this.app.t('notifications.comingSoon'), 'info');
   }

   showSessions() {
       // Показати активні сесії
       this.app.utils.showNotification(this.app.t('notifications.comingSoon'), 'info');
   }

   logout() {
       if (confirm(this.app.t('auth.logoutConfirm'))) {
           this.app.auth.logout();
       }
   }

   /**
    * Прикріплення обробників подій
    */
   attachEventListeners() {
       // Свайп між табами на мобільних
       let startX = 0;
       let currentX = 0;

       const tabContent = document.getElementById('tab-content');
       if (tabContent) {
           tabContent.addEventListener('touchstart', (e) => {
               startX = e.touches[0].clientX;
           });

           tabContent.addEventListener('touchmove', (e) => {
               currentX = e.touches[0].clientX;
           });

           tabContent.addEventListener('touchend', () => {
               const diff = currentX - startX;
               if (Math.abs(diff) > 50) {
                   const tabs = ['downloads', 'favorites', 'history', 'referral', 'settings', 'security'];
                   const currentIndex = tabs.indexOf(this.currentTab);

                   if (diff > 0 && currentIndex > 0) {
                       this.switchTab(tabs[currentIndex - 1]);
                   } else if (diff < 0 && currentIndex < tabs.length - 1) {
                       this.switchTab(tabs[currentIndex + 1]);
                   }
               }
           });
       }
   }

   /**
    * Додавання стилів
    */
   injectStyles() {
       if (document.getElementById('profile-styles')) return;

       const styles = document.createElement('style');
       styles.id = 'profile-styles';
       styles.innerHTML = `
           /* Основні стилі профілю */
           .profile-page {
               max-width: 1200px;
               margin: 0 auto;
               padding-bottom: 2rem;
           }

           /* Заголовок профілю */
           .profile-header {
               position: relative;
               background: white;
               border-radius: 20px;
               overflow: hidden;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
               margin-bottom: 2rem;
           }

           .dark .profile-header {
               background: #1f2937;
           }

           .profile-cover {
               height: 150px;
               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           }

           .profile-info {
               display: flex;
               align-items: flex-start;
               gap: 2rem;
               padding: 0 2rem 2rem;
               margin-top: -3rem;
           }

           @media (max-width: 768px) {
               .profile-info {
                   flex-direction: column;
                   align-items: center;
                   text-align: center;
               }
           }

           .profile-avatar {
               width: 120px;
               height: 120px;
               border-radius: 50%;
               overflow: hidden;
               border: 4px solid white;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               display: flex;
               align-items: center;
               justify-content: center;
               flex-shrink: 0;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
           }

           .dark .profile-avatar {
               border-color: #1f2937;
           }

           .profile-avatar img {
               width: 100%;
               height: 100%;
               object-fit: cover;
           }

           .profile-avatar span {
               font-size: 3rem;
               color: white;
           }

           .profile-details {
               flex: 1;
               padding-top: 3rem;
           }

           .profile-name {
               font-size: 2rem;
               font-weight: 800;
               color: #111827;
               margin-bottom: 0.25rem;
           }

           .dark .profile-name {
               color: white;
           }

           .profile-username {
               font-size: 1rem;
               color: #6b7280;
               margin-bottom: 1rem;
           }

           .dark .profile-username {
               color: #9ca3af;
           }

           .profile-badges {
               display: flex;
               flex-wrap: wrap;
               gap: 0.5rem;
           }

           .badge {
               padding: 0.25rem 0.75rem;
               border-radius: 20px;
               font-size: 0.875rem;
               font-weight: 600;
           }

           .badge-bronze {
               background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
               color: white;
           }

           .badge-silver {
               background: linear-gradient(135deg, #c0c0c0 0%, #b8b8b8 100%);
               color: #333;
           }

           .badge-gold {
               background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
               color: #333;
           }

           .badge-diamond {
               background: linear-gradient(135deg, #b9f2ff 0%, #00d4ff 100%);
               color: white;
           }

           .badge-creator {
               background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
               color: white;
           }

           .badge-admin {
               background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
               color: white;
           }

           .badge-premium {
               background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
               color: white;
           }

           .profile-stats {
               display: grid;
               grid-template-columns: repeat(2, 1fr);
               gap: 1rem;
               padding-top: 3rem;
           }

           @media (min-width: 768px) {
               .profile-stats {
                   grid-template-columns: repeat(4, 1fr);
               }
           }

           .stat-item {
               text-align: center;
           }

           .stat-value {
               font-size: 1.5rem;
               font-weight: 700;
               color: #3b82f6;
           }

           .stat-label {
               font-size: 0.875rem;
               color: #6b7280;
               margin-top: 0.25rem;
           }

           .dark .stat-label {
               color: #9ca3af;
           }

           /* Таби */
           .profile-tabs {
               background: white;
               border-radius: 20px;
               overflow: hidden;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
           }

           .dark .profile-tabs {
               background: #1f2937;
           }

           .tabs-nav {
               display: flex;
               overflow-x: auto;
               border-bottom: 2px solid #e5e7eb;
               -webkit-overflow-scrolling: touch;
               scrollbar-width: none;
           }

           .dark .tabs-nav {
               border-bottom-color: #374151;
           }

           .tabs-nav::-webkit-scrollbar {
               display: none;
           }

           .tab-btn {
               display: flex;
               align-items: center;
               gap: 0.5rem;
               padding: 1rem 1.5rem;
               background: transparent;
               border: none;
               border-bottom: 3px solid transparent;
               color: #6b7280;
               font-weight: 600;
               white-space: nowrap;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .tab-btn {
               color: #9ca3af;
           }

           .tab-btn:hover {
               background: #f3f4f6;
               color: #3b82f6;
           }

           .dark .tab-btn:hover {
               background: #374151;
           }

           .tab-btn.active {
               color: #3b82f6;
               border-bottom-color: #3b82f6;
           }

           .tab-icon {
               font-size: 1.25rem;
           }

           .tab-name {
               display: none;
           }

           @media (min-width: 640px) {
               .tab-name {
                   display: inline;
               }
           }

           .tabs-content {
               padding: 2rem;
               min-height: 400px;
           }

           /* Порожній таб */
           .empty-tab {
               text-align: center;
               padding: 4rem 2rem;
           }

           .empty-icon {
               font-size: 4rem;
               margin-bottom: 1rem;
               opacity: 0.5;
           }

           .empty-title {
               font-size: 1.5rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 0.5rem;
           }

           .dark .empty-title {
               color: white;
           }

           .empty-text {
               color: #6b7280;
           }

           .dark .empty-text {
               color: #9ca3af;
           }

           /* Список завантажень */
           .downloads-list {
               display: flex;
               flex-direction: column;
               gap: 1rem;
           }

           .download-item {
               display: flex;
               align-items: center;
               gap: 1rem;
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               transition: all 0.3s ease;
           }

           .dark .download-item {
               background: #374151;
           }

           .download-item:hover {
               transform: translateX(4px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
           }

           .download-image {
               width: 80px;
               height: 80px;
               border-radius: 8px;
               overflow: hidden;
               flex-shrink: 0;
           }

           .download-image img {
               width: 100%;
               height: 100%;
               object-fit: cover;
           }

           .download-info {
               flex: 1;
           }

           .download-title {
               font-weight: 600;
               color: #111827;
               margin-bottom: 0.25rem;
           }

           .dark .download-title {
               color: white;
           }

           .download-date {
               font-size: 0.875rem;
               color: #6b7280;
           }

           .btn-download {
               padding: 0.5rem 1.5rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 8px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-download:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
           }

           /* Сітка обраного */
           .favorites-grid {
               display: grid;
               grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
               gap: 1rem;
           }

           .favorite-card {
               position: relative;
               background: white;
               border-radius: 12px;
               overflow: hidden;
               box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .favorite-card {
               background: #374151;
           }

           .favorite-card:hover {
               transform: translateY(-4px);
               box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
           }

           .favorite-image {
               width: 100%;
               padding-top: 100%;
               position: relative;
               background: #f3f4f6;
           }

           .dark .favorite-image {
               background: #1f2937;
           }

           .favorite-image .placeholder {
               position: absolute;
               top: 50%;
               left: 50%;
               transform: translate(-50%, -50%);
               font-size: 2rem;
               opacity: 0.5;
           }

           .favorite-title {
               padding: 0.75rem;
               font-weight: 600;
               color: #111827;
               font-size: 0.875rem;
           }

           .dark .favorite-title {
               color: white;
           }

           .btn-remove-favorite {
               position: absolute;
               top: 0.5rem;
               right: 0.5rem;
               width: 32px;
               height: 32px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: white;
               border-radius: 50%;
               box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
               cursor: pointer;
               transition: all 0.2s;
           }

           .btn-remove-favorite:hover {
               transform: scale(1.1);
           }

           /* Список історії */
           .history-list {
               display: flex;
               flex-direction: column;
               gap: 1rem;
           }

           .history-item {
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               transition: all 0.3s ease;
           }

           .dark .history-item {
               background: #374151;
           }

           .history-header {
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 0.5rem;
           }

           .history-number {
               font-weight: 600;
               color: #111827;
           }

           .dark .history-number {
               color: white;
           }

           .history-status {
               padding: 0.25rem 0.75rem;
               border-radius: 20px;
               font-size: 0.75rem;
               font-weight: 600;
           }

           .status-completed {
               background: #d1fae5;
               color: #065f46;
           }

           .dark .status-completed {
               background: rgba(16, 185, 129, 0.2);
               color: #10b981;
           }

           .status-pending {
               background: #fed7aa;
               color: #92400e;
           }

           .dark .status-pending {
               background: rgba(251, 146, 60, 0.2);
               color: #fb923c;
           }

           .status-cancelled {
               background: #fee2e2;
               color: #991b1b;
           }

           .dark .status-cancelled {
               background: rgba(239, 68, 68, 0.2);
               color: #ef4444;
           }

           .history-details {
               display: flex;
               justify-content: space-between;
               font-size: 0.875rem;
               color: #6b7280;
               margin-bottom: 0.5rem;
           }

           .dark .history-details {
               color: #9ca3af;
           }

           .history-amount {
               font-weight: 600;
               color: #3b82f6;
           }

           .history-items {
               font-size: 0.875rem;
               color: #6b7280;
           }

           .dark .history-items {
               color: #9ca3af;
           }

           /* Реферальний контент */
           .referral-content {
               max-width: 600px;
               margin: 0 auto;
           }

           .referral-stats {
               display: grid;
               grid-template-columns: 1fr 1fr;
               gap: 1rem;
               margin-bottom: 2rem;
           }

           .referral-stat-card {
               text-align: center;
               padding: 1.5rem;
               background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
               border-radius: 16px;
           }

           .dark .referral-stat-card {
               background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
           }

           .stat-icon {
               font-size: 2rem;
               margin-bottom: 0.5rem;
           }

           .referral-link-section {
               margin-bottom: 2rem;
           }

           .section-title {
               font-size: 1.125rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 1rem;
           }

           .dark .section-title {
               color: white;
           }

           .link-container {
               display: flex;
               gap: 0.5rem;
           }

           .referral-link {
               flex: 1;
               padding: 0.75rem;
               background: #f3f4f6;
               border: 2px solid #e5e7eb;
               border-radius: 10px;
               font-size: 0.875rem;
               color: #111827;
           }

           .dark .referral-link {
               background: #374151;
               border-color: #4b5563;
               color: white;
           }

           .btn-copy {
               padding: 0.75rem 1.5rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 10px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-copy:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
           }

           .share-buttons {
               display: grid;
               grid-template-columns: repeat(3, 1fr);
               gap: 1rem;
           }

           .share-btn {
               display: flex;
               align-items: center;
               justify-content: center;
               gap: 0.5rem;
               padding: 0.75rem;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 10px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .share-btn {
               background: #374151;
               border-color: #4b5563;
               color: white;
           }

           .share-btn:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
           }

           .share-telegram:hover {
               border-color: #0088cc;
               color: #0088cc;
           }

           .share-whatsapp:hover {
               border-color: #25d366;
               color: #25d366;
           }

           .share-twitter:hover {
               border-color: #1da1f2;
               color: #1da1f2;
           }

           .info-steps {
               display: flex;
               flex-direction: column;
               gap: 1rem;
           }

           .info-step {
               display: flex;
               align-items: flex-start;
               gap: 1rem;
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
           }

           .dark .info-step {
               background: #374151;
           }

           .step-number {
               width: 32px;
               height: 32px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border-radius: 50%;
               font-weight: 700;
               flex-shrink: 0;
           }

           .info-step p {
               flex: 1;
               color: #6b7280;
               margin: 0;
           }

           .dark .info-step p {
               color: #9ca3af;
           }

           /* Налаштування */
           .settings-content {
               max-width: 600px;
               margin: 0 auto;
           }

           .settings-group {
               margin-bottom: 2rem;
           }

           .settings-title {
               font-size: 1.125rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 1.5rem;
           }

           .dark .settings-title {
               color: white;
           }

           .setting-item {
               display: flex;
               justify-content: space-between;
               align-items: center;
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               margin-bottom: 1rem;
           }

           .dark .setting-item {
               background: #374151;
           }

           .setting-label {
               font-weight: 600;
               color: #111827;
           }

           .dark .setting-label {
               color: white;
           }

           .setting-select {
               padding: 0.5rem 2rem 0.5rem 1rem;
               background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.5rem center;
               background-size: 20px;
               border: 2px solid #e5e7eb;
               border-radius: 8px;
               font-weight: 600;
               cursor: pointer;
               appearance: none;
           }

           .dark .setting-select {
               background: #1f2937 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.5rem center;
               background-size: 20px;
               border-color: #4b5563;
               color: white;
           }

           .theme-selector {
               display: flex;
               gap: 0.5rem;
           }

           .theme-option {
               display: flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.5rem 1rem;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 8px;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .theme-option {
               background: #1f2937;
               border-color: #4b5563;
               color: white;
           }

           .theme-option:hover {
               border-color: #3b82f6;
           }

           .theme-option.active {
               background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
               border-color: #3b82f6;
           }

           /* Toggle Switch */
           .toggle-switch {
               position: relative;
               display: inline-block;
               width: 50px;
               height: 24px;
           }

           .toggle-switch input {
               opacity: 0;
               width: 0;
               height: 0;
           }

           .toggle-slider {
               position: absolute;
               cursor: pointer;
               top: 0;
               left: 0;
               right: 0;
               bottom: 0;
               background-color: #ccc;
               transition: 0.4s;
               border-radius: 24px;
           }

           .toggle-slider:before {
               position: absolute;
               content: "";
               height: 18px;
               width: 18px;
               left: 3px;
               bottom: 3px;
               background-color: white;
               transition: 0.4s;
               border-radius: 50%;
           }

           input:checked + .toggle-slider {
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
           }

           input:checked + .toggle-slider:before {
               transform: translateX(26px);
           }

           .btn-save-settings {
               width: 100%;
               padding: 0.75rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 10px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-save-settings:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
           }

           /* Безпека */
           .security-content {
               max-width: 600px;
               margin: 0 auto;
           }

           .security-group {
               margin-bottom: 2rem;
           }

           .security-title {
               font-size: 1.125rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 1.5rem;
           }

           .dark .security-title {
               color: white;
           }

           .security-item {
               display: flex;
               justify-content: space-between;
               align-items: center;
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               margin-bottom: 1rem;
           }

           .dark .security-item {
               background: #374151;
           }

           .security-info h4 {
               font-weight: 600;
               color: #111827;
               margin-bottom: 0.25rem;
           }

           .dark .security-info h4 {
               color: white;
           }

           .security-info p {
               font-size: 0.875rem;
               color: #6b7280;
               margin: 0;
           }

           .dark .security-info p {
               color: #9ca3af;
           }

           .btn-security {
               padding: 0.5rem 1rem;
               background: white;
               border: 2px solid #3b82f6;
               color: #3b82f6;
               border-radius: 8px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.2s;
           }

           .dark .btn-security {
               background: #1f2937;
           }

           .btn-security:hover {
               background: #3b82f6;
               color: white;
           }

           .btn-security.btn-danger {
               border-color: #ef4444;
               color: #ef4444;
           }

           .btn-security.btn-danger:hover {
               background: #ef4444;
               color: white;
           }

           .danger-zone {
               padding: 1.5rem;
               background: #fee2e2;
               border: 2px solid #ef4444;
               border-radius: 12px;
           }

           .dark .danger-zone {
               background: rgba(239, 68, 68, 0.1);
           }

           .danger-title {
               font-size: 1.125rem;
               font-weight: 700;
               color: #ef4444;
               margin-bottom: 1rem;
           }

           .btn-logout {
               width: 100%;
               padding: 0.75rem;
               background: #ef4444;
               color: white;
               border: none;
               border-radius: 8px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-logout:hover {
               background: #dc2626;
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
           }

           /* Авторизація потрібна */
           .auth-required-container {
               display: flex;
               align-items: center;
               justify-content: center;
               min-height: 60vh;
           }

           .auth-required-content {
               text-align: center;
               padding: 3rem;
               background: white;
               border-radius: 20px;
               box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
           }

           .dark .auth-required-content {
               background: #1f2937;
           }

           .auth-icon {
               font-size: 5rem;
               margin-bottom: 1.5rem;
           }

           .auth-title {
               font-size: 2rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 0.5rem;
           }

           .dark .auth-title {
               color: white;
           }

           .auth-text {
               font-size: 1.125rem;
               color: #6b7280;
               margin-bottom: 2rem;
           }

           .dark .auth-text {
               color: #9ca3af;
           }

           .btn-login {
               padding: 1rem 2rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 12px;
               font-size: 1.125rem;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-login:hover {
               transform: translateY(-2px);
               box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
           }

           /* Анімації */
           @keyframes fadeIn {
               from {
                   opacity: 0;
                   transform: translateY(20px);
               }
               to {
                   opacity: 1;
                   transform: translateY(0);
               }
           }

           .animate-fadeIn {
               animation: fadeIn 0.4s ease;
           }

           /* Адаптивність */
           @media (max-width: 640px) {
               .profile-stats {
                   padding-top: 1.5rem;
               }

               .share-buttons {
                   grid-template-columns: 1fr;
               }

               .referral-stats {
                   grid-template-columns: 1fr;
               }

               .setting-item {
                   flex-direction: column;
                   align-items: flex-start;
                   gap: 0.75rem;
               }

               .theme-selector {
                   width: 100%;
               }

               .theme-option {
                   flex: 1;
                   justify-content: center;
               }

               .security-item {
                   flex-direction: column;
                   align-items: flex-start;
                   gap: 0.75rem;
               }

               .btn-security {
                   width: 100%;
               }
           }
       `;
       document.head.appendChild(styles);
   }
}

window.ProfilePage = ProfilePage;
window.profilePage = null; // Буде ініціалізовано в app.js