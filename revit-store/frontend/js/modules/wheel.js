/**
 * Модуль колеса фортуни
 */
class WheelOfFortune {
    constructor() {
        this.sectors = [];
        this.isSpinning = false;
        this.currentRotation = 0;
        this.spinSound = null;
        this.winSound = null;
        this.jackpotSound = null;
    }

    /**
     * Ініціалізація колеса
     */
    async init() {
        try {
            // Отримуємо конфігурацію з сервера
            const response = await api.get('/bonuses/wheel');
            this.sectors = response.sectors;
            this.freeSpins = response.free_spins_remaining;
            this.spinCost = response.spin_cost;

            // Ініціалізуємо звуки
            this.initSounds();

            return true;
        } catch (error) {
            console.error('Wheel init error:', error);
            return false;
        }
    }

    /**
     * Ініціалізація звуків
     */
    initSounds() {
        // Створюємо аудіо елементи для звуків
        this.spinSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
        this.winSound = new Audio('data:audio/wav;base64,UklGRg4CAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YeoBAAD/////9/f39/f39/f39/f39/f39/f39/f3+Pj4+Pj4+Pj4+Pj4+fn5+fn5+fn5+vr6+vr6+vr6+vr6+vr6+/v7+/v7+/v7/Pz8/Pz8/Pz8/Pz8/Pz8/f39/f39/f39/f39/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+');
        this.jackpotSound = new Audio('data:audio/wav;base64,UklGRrQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YZAEAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA');
    }

    /**
     * Створити HTML колеса
     */
    render() {
        return `
            <div class="wheel-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold dark:text-white">🎰 Колесо Фортуни</h2>
                        <button onclick="wheelGame.close()" class="text-3xl">&times;</button>
                    </div>

                    <div class="wheel-container mb-6">
                        <div class="wheel-wrapper">
                            <div id="wheel" class="wheel">
                                ${this.renderSectors()}
                            </div>
                            <div class="wheel-pointer"></div>
                            <div class="wheel-center" onclick="wheelGame.spin()">
                                <span>🎯</span>
                            </div>
                        </div>
                    </div>

                    <div class="text-center mb-4">
                        <div class="mb-2">
                            <span class="text-lg font-semibold dark:text-white">
                                Безкоштовні спроби: <span id="free-spins">${this.freeSpins}</span>
                            </span>
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Додаткова спроба: ${this.spinCost} бонусів
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="wheelGame.spin(true)"
                                class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-bold"
                                ${this.freeSpins > 0 ? '' : 'disabled'}>
                            Безкоштовний спін
                        </button>
                        <button onclick="wheelGame.spin(false)"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-bold">
                            Спін за ${this.spinCost} 🎁
                        </button>
                    </div>

                    <div class="mt-4 text-center">
                        <button onclick="wheelGame.showHistory()"
                                class="text-blue-500 hover:underline">
                            📊 Історія спінів
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер секторів колеса
     */
    renderSectors() {
        return this.sectors.map((sector, index) => `
            <div class="wheel-sector" data-sector="${index}">
                <div class="wheel-sector-content">
                    ${sector.value > 0 ? `${sector.value}🎁` : '😕'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Крутити колесо
     */
    async spin(useFree = true) {
        if (this.isSpinning) return;

        // Перевірка можливості
        if (useFree && this.freeSpins <= 0) {
            Utils.showNotification('Немає безкоштовних спроб', 'warning');
            return;
        }

        if (!useFree && auth.user.balance < this.spinCost) {
            Utils.showNotification('Недостатньо бонусів', 'error');
            return;
        }

        this.isSpinning = true;

        try {
            // Звук початку
            this.spinSound?.play();

            // Анімація обертання
            const wheel = document.getElementById('wheel');
            const spins = 5; // Кількість повних обертів
            const randomOffset = Math.random() * 360;

            // Запит до сервера
            const response = await api.post('/bonuses/wheel/spin', {
                use_bonus: !useFree
            });

            // Розрахунок кута зупинки
            const sectorAngle = 360 / this.sectors.length;
            const targetAngle = response.sector * sectorAngle + randomOffset;
            const totalRotation = spins * 360 + targetAngle;

            // Запускаємо анімацію
            wheel.style.transform = `rotate(${this.currentRotation + totalRotation}deg)`;
            this.currentRotation += totalRotation;

            // Чекаємо завершення анімації
            setTimeout(() => {
                this.showResult(response);
                this.isSpinning = false;

                // Оновлюємо UI
                if (useFree) {
                    this.freeSpins--;
                    document.getElementById('free-spins').textContent = this.freeSpins;
                }

                // Оновлюємо баланс
                if (auth.user) {
                    auth.user.balance = response.new_balance;
                    app.updateBalance();
                }
            }, 4000);

        } catch (error) {
            this.isSpinning = false;
            console.error('Spin error:', error);
            Utils.showNotification('Помилка при обертанні', 'error');
        }
    }

    /**
     * Показати результат
     */
    showResult(result) {
        // Звук результату
        if (result.is_jackpot) {
            this.jackpotSound?.play();
            this.showJackpotAnimation();
        } else if (result.prize > 0) {
            this.winSound?.play();
        }

        // Створюємо вікно результату
        const resultModal = document.createElement('div');
        resultModal.className = `wheel-result ${result.is_jackpot ? 'wheel-result-mega' : ''}`;
        resultModal.innerHTML = `
            <div class="text-6xl mb-4">
                ${result.is_jackpot ? '💎' : result.prize > 0 ? '🎉' : '😕'}
            </div>
            <h3 class="text-2xl font-bold mb-2">
                ${result.is_jackpot ? 'МЕГА ДЖЕКПОТ!' : result.prize > 0 ? 'Вітаємо!' : 'Спробуйте ще'}
            </h3>
            <p class="text-lg">
                ${result.prize > 0 ? `Ви виграли ${result.prize} бонусів!` : 'На жаль, цього разу не пощастило'}
            </p>
            <button onclick="this.parentElement.remove()"
                    class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
                OK
            </button>
        `;

        document.body.appendChild(resultModal);

        // Видаляємо через 5 секунд
        setTimeout(() => {
            resultModal.remove();
        }, 5000);
    }

    /**
     * Анімація джекпоту
     */
    showJackpotAnimation() {
        // Створюємо конфеті
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        // Генеруємо 50 частинок конфеті
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'][Math.floor(Math.random() * 5)];
            piece.style.animationDelay = Math.random() * 3 + 's';
            confetti.appendChild(piece);
        }

        document.body.appendChild(confetti);

        // Видаляємо після анімації
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }

    /**
     * Показати історію
     */
    async showHistory() {
        try {
            const response = await api.get('/bonuses/wheel/history');

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                    <h3 class="text-xl font-bold mb-4 dark:text-white">📊 Історія спінів</h3>
                    <div class="max-h-96 overflow-y-auto">
                        ${response.history.map(spin => `
                            <div class="flex justify-between items-center p-2 border-b dark:border-gray-700">
                                <span class="dark:text-gray-300">
                                    ${spin.is_jackpot ? '💎' : spin.prize > 0 ? '🎁' : '😕'}
                                    ${spin.prize} бонусів
                                </span>
                                <span class="text-sm text-gray-500">
                                    ${new Date(spin.date).toLocaleDateString()}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="this.closest('.fixed').remove()"
                            class="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">
                        Закрити
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            console.error('History error:', error);
        }
    }

    /**
     * Відкрити колесо
     */
    open() {
        const modal = document.createElement('div');
        modal.innerHTML = this.render();
        document.body.appendChild(modal.firstElementChild);
    }

    /**
     * Закрити колесо
     */
    close() {
        document.querySelector('.wheel-modal')?.remove();
    }
}

// Створюємо глобальний екземпляр
window.wheelGame = new WheelOfFortune();