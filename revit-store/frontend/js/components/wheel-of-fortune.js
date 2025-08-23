/**
 * Компонент колеса фортуни
 */

class WheelOfFortune {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.config = null;
        this.status = null;
        this.isSpinning = false;
        this.canvas = null;
        this.ctx = null;
        this.currentRotation = 0;
    }

    /**
     * Ініціалізація колеса
     */
    async init() {
        try {
            // Завантажуємо конфігурацію
            this.config = bonuses.wheelConfig || await api.get('/bonuses/wheel/config');
            this.status = bonuses.wheelStatus || await api.get('/bonuses/wheel/status');

            // Рендеримо колесо
            this.render();

        } catch (error) {
            console.error('Wheel init error:', error);
            Utils.showNotification(window.app.t('wheel.initError'), 'error');
        }
    }

    /**
     * Рендер колеса
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="wheel-of-fortune-container">
                <h2 class="text-3xl font-bold text-center mb-6 dark:text-white">🎰 ${window.app.t('wheel.title')}</h2>

                <div class="wheel-info grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            ${this.status.free_spins_available}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('home.dailyBonus.freeSpins')}</div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                            ${this.status.user_balance}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${window.app.t('wheel.yourBalance')}</div>
                    </div>
                </div>

                <div class="wheel-container relative mb-6">
                    <div class="wheel-wrapper relative inline-block">
                        <canvas id="wheel-canvas" width="400" height="400"
                                class="wheel-canvas rounded-full shadow-2xl"></canvas>

                        <div class="wheel-pointer absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                            <div class="w-0 h-0
                                        border-l-[30px] border-l-transparent
                                        border-r-[30px] border-r-transparent
                                        border-t-[50px] border-t-red-500
                                        drop-shadow-lg"></div>
                        </div>

                        <button id="wheel-spin-btn"
                                onclick="wheelOfFortune.spin()"
                                class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                       w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500
                                       rounded-full text-white font-bold text-xl
                                       shadow-lg hover:shadow-xl transition-all
                                       hover:scale-105 active:scale-95 flex items-center justify-center
                                       ${this.isSpinning ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${this.isSpinning ? 'disabled' : ''}>
                            ${window.app.t('wheel.spinButton')}
                        </button>
                    </div>
                </div>

                <div class="wheel-actions flex flex-col sm:flex-row gap-4 justify-center mb-6">
                    <button onclick="wheelOfFortune.spin(true)"
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                            ${this.status.free_spins_available > 0 && !this.isSpinning ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'}>
                        <span>🎁</span>
                        <span>${window.app.t('wheel.freeSpin')} (${this.status.free_spins_available})</span>
                    </button>

                    <button onclick="wheelOfFortune.spin(false)"
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                            ${this.status.user_balance >= this.config.spin_cost && !this.isSpinning ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'}>
                        <span>💰</span>
                        <span>${window.app.t('wheel.paidSpin')} (${this.config.spin_cost})</span>
                    </button>
                </div>

                <div class="wheel-history bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 class="font-bold mb-3 dark:text-white">📜 ${window.app.t('wheel.recentHistory')}</h3>
                    <div id="wheel-history" class="space-y-2">
                        ${this.renderHistory()}
                    </div>
                </div>

                <div class="wheel-legend mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <h3 class="font-bold mb-3 dark:text-white">🎯 ${window.app.t('wheel.prizes')}</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${this.config.sectors.filter(s => s.type !== 'empty').map(sector => `
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 rounded" style="background-color: ${sector.color}"></div>
                                <span class="text-sm dark:text-gray-300">
                                    ${sector.value} ${sector.type === 'mega' ? '🏆' : '🎁'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Ініціалізуємо canvas
        this.initCanvas();
    }

    /**
     * Ініціалізація canvas
     */
    initCanvas() {
        this.canvas = document.getElementById('wheel-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.drawWheel();
    }

    /**
     * Малювання колеса
     */
    drawWheel(rotation = 0) {
        if (!this.ctx) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 180;

        // Очищаємо canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Зберігаємо контекст
        this.ctx.save();

        // Застосовуємо обертання
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(rotation);
        this.ctx.translate(-centerX, -centerY);

        // Малюємо сектори
        const anglePerSector = (2 * Math.PI) / this.config.sectors.length;

        this.config.sectors.forEach((sector, index) => {
            const startAngle = index * anglePerSector - Math.PI / 2;
            const endAngle = startAngle + anglePerSector;

            // Малюємо сектор
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = sector.color;
            this.ctx.fill();

            // Малюємо границі
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Малюємо текст
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + anglePerSector / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';

            const text = sector.value > 0 ?
                (sector.type === 'mega' ? `🏆 ${sector.value}` : `${sector.value}`) :
                '❌';

            this.ctx.fillText(text, radius * 0.7, 5);
            this.ctx.restore();
        });

        // Відновлюємо контекст
        this.ctx.restore();

        // Малюємо центральне коло
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    /**
     * Прокрутити колесо
     */
    async spin(isFree = true) {
        if (this.isSpinning) return;

        try {
            this.isSpinning = true;

            // Вимикаємо кнопки
            this.disableButtons();

            // Робимо запит на сервер
            const result = await bonuses.spinWheel(isFree);

            if (!result) {
                this.isSpinning = false;
                this.enableButtons();
                return;
            }

            // Анімуємо прокрутку
            await this.animateSpin(result.sector);

            // Показуємо результат
            this.showResult(result);

            // Оновлюємо статус
            this.status.free_spins_available = result.free_spins_left;
            this.status.user_balance = result.new_balance;

            // Оновлюємо UI
            this.updateUI();

            // Додаємо в історію
            this.addToHistory(result);

        } catch (error) {
            console.error('Spin error:', error);
        } finally {
            this.isSpinning = false;
            this.enableButtons();
        }
    }

    /**
     * Анімація прокрутки
     */
    async animateSpin(targetSector) {
        return new Promise(resolve => {
            const duration = 3000; // 3 секунди
            const spins = 5; // Кількість повних обертів
            const anglePerSector = 360 / this.config.sectors.length;

            // Розраховуємо кінцевий кут
            const targetAngle = (360 - targetSector * anglePerSector) + (360 * spins);

            const startTime = Date.now();
            const startRotation = this.currentRotation;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing функція для реалістичної анімації
                const easeOut = 1 - Math.pow(1 - progress, 3);

                // Розраховуємо поточний кут
                const rotation = startRotation + (targetAngle * easeOut);
                this.currentRotation = rotation % 360;

                // Малюємо колесо з новим кутом
                this.drawWheel((rotation * Math.PI) / 180);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Показати результат
     */
    showResult(result) {
        let title, message, icon;

        if (result.is_jackpot) {
            title = window.app.t('wheel.jackpotTitle');
            message = window.app.t('wheel.jackpotMessage').replace('{amount}', result.prize);
            icon = '🏆';

            // Конфеті для джекпота
            this.showConfetti();
        } else if (result.prize > 0) {
            title = window.app.t('wheel.winTitle');
            message = window.app.t('wheel.winMessage').replace('{amount}', result.prize);
            icon = '🎁';
        } else {
            title = window.app.t('wheel.loseTitle');
            message = window.app.t('wheel.loseMessage');
            icon = '😔';
        }

        // Показуємо модальне вікно з результатом
        this.showResultModal(title, message, icon);
    }

    /**
     * Показати модальне вікно результату
     */
    showResultModal(title, message, icon) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 transform scale-0 transition-transform">
                <div class="text-center">
                    <div class="text-6xl mb-4">${icon}</div>
                    <h3 class="text-2xl font-bold mb-4 dark:text-white">${title}</h3>
                    <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                    <button onclick="this.closest('.fixed').remove()"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                        ${window.app.t('buttons.continue')}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Анімація появи
        setTimeout(() => {
            modal.querySelector('.bg-white, .dark\\:bg-gray-800').classList.remove('scale-0');
            modal.querySelector('.bg-white, .dark\\:bg-gray-800').classList.add('scale-100');
        }, 10);
    }

    /**
     * Показати конфеті для джекпота
     */
    showConfetti() {
        // Створюємо контейнер для конфеті
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'fixed inset-0 pointer-events-none z-40';
        confettiContainer.id = 'confetti-container';
        document.body.appendChild(confettiContainer);

        // Створюємо конфеті
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#98FB98'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${color};
                left: ${Math.random() * 100}%;
                top: -20px;
                transform: rotate(${Math.random() * 360}deg);
                animation: confetti-fall 3s linear;
            `;

            confettiContainer.appendChild(confetti);
        }

        // Видаляємо через 3 секунди
        setTimeout(() => {
            confettiContainer.remove();
        }, 3000);
    }

    /**
     * Оновити UI
     */
    updateUI() {
        // Оновлюємо відображення спінів та балансу
        const freeSpinsEl = this.container.querySelector('.text-blue-600');
        const balanceEl = this.container.querySelector('.text-green-600');

        if (freeSpinsEl) {
            freeSpinsEl.textContent = this.status.free_spins_available;
        }

        if (balanceEl) {
            balanceEl.textContent = this.status.user_balance;
        }

        // Оновлюємо кнопки
        this.enableButtons();
    }

    /**
     * Додати в історію
     */
    addToHistory(result) {
        const historyEl = document.getElementById('wheel-history');
        if (!historyEl) return;

        const historyItem = document.createElement('div');
        historyItem.className = 'flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded';
        historyItem.innerHTML = `
            <span class="text-sm dark:text-gray-300">
                ${new Date().toLocaleTimeString()}
            </span>
            <span class="font-bold ${result.prize > 0 ? 'text-green-500' : 'text-gray-400'}">
                ${result.prize > 0 ? `+${result.prize} 🎁` : window.app.t('wheel.emptyPrize')}
                ${result.is_jackpot ? '🏆' : ''}
            </span>
        `;

        // Додаємо на початок
        historyEl.insertBefore(historyItem, historyEl.firstChild);

        // Обмежуємо кількість записів
        while (historyEl.children.length > 5) {
            historyEl.removeChild(historyEl.lastChild);
        }
    }

    /**
     * Рендер історії
     */
    renderHistory() {
        if (!this.status.statistics || !this.status.statistics.recent_spins) {
            return `<div class="text-sm text-gray-500 dark:text-gray-400">${window.app.t('wheel.historyEmpty')}</div>`;
        }

        return this.status.statistics.recent_spins.slice(0, 5).map(spin => `
            <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span class="text-sm dark:text-gray-300">
                    ${new Date(spin.date).toLocaleTimeString()}
                </span>
                <span class="font-bold ${spin.prize > 0 ? 'text-green-500' : 'text-gray-400'}">
                    ${spin.prize > 0 ? `+${spin.prize} 🎁` : window.app.t('wheel.emptyPrize')}
                    ${spin.is_jackpot ? '🏆' : ''}
                </span>
            </div>
        `).join('');
    }

    /**
     * Вимкнути кнопки
     */
    disableButtons() {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });
    }

    /**
     * Увімкнути кнопки
     */
    enableButtons() {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            // Перевіряємо чи можна увімкнути кнопку
            if (btn.textContent.includes(window.app.t('wheel.freeSpin'))) {
                btn.disabled = this.status.free_spins_available <= 0;
            } else if (btn.textContent.includes(window.app.t('wheel.paidSpin'))) {
                btn.disabled = this.status.user_balance < this.config.spin_cost;
            } else {
                btn.disabled = false;
            }

            if (!btn.disabled) {
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    /**
     * Показати таблицю лідерів
     */
    async showLeaderboard() {
        try {
            const data = await bonuses.getWheelLeaderboard(10);

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold dark:text-white">${window.app.t('wheel.leaderboard.title')}</h3>
                        <button onclick="this.closest('.fixed').remove()"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                            ✕
                        </button>
                    </div>

                    <div class="space-y-3">
                        ${data.leaderboard.map((user, index) => `
                            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div class="text-2xl font-bold ${index < 3 ? 'text-yellow-500' : 'text-gray-400'}">
                                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium dark:text-white">
                                        ${user.first_name || user.username}
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">
                                        ${window.app.t('wheel.leaderboard.spins')}: ${user.total_spins}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-green-500">
                                        +${user.total_won}
                                    </div>
                                    <div class="text-xs text-gray-500">${window.app.t('currency.bonuses')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        ${window.app.t('wheel.leaderboard.updated')}: ${new Date(data.updated_at).toLocaleString()}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Load leaderboard error:', error);
            Utils.showNotification(window.app.t('notifications.leaderboardLoadError'), 'error');
        }
    }
}

// Створюємо єдиний екземпляр
let wheelOfFortune = null;

// Функція ініціалізації
function initWheelOfFortune(containerId) {
    wheelOfFortune = new WheelOfFortune(containerId);
    wheelOfFortune.init();
}

// Експортуємо
window.WheelOfFortune = WheelOfFortune;
window.initWheelOfFortune = initWheelOfFortune;

// CSS для конфеті
const style = document.createElement('style');
style.textContent = `
    @keyframes confetti-fall {
        to {
            transform: translateY(100vh) rotate(720deg);
        }
    }

    .wheel-canvas {
        transition: transform 0.1s ease;
    }

    .wheel-canvas:active {
        transform: scale(0.98);
    }
`;
document.head.appendChild(style);