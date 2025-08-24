class OnboardingModule {
    constructor() {
        this.currentStep = 0;
        this.slides = [
            {
                icon: '🏛️',
                title: 'Ласкаво просимо!',
                text: 'OhMyRevit - маркетплейс унікальних архівів для Revit. Знаходьте готові рішення та діліться своїми.'
            },
            {
                icon: '✨',
                title: 'Преміум контент',
                text: 'Тисячі архівів від безкоштовних моделей до ексклюзивних преміум-сімейств.'
            },
            {
                icon: '🎯',
                title: 'Підписка та бонуси',
                text: 'Отримайте доступ до всіх нових архівів, 5% кешбек та щоденні бонуси!'
            },
            {
                icon: '🎨',
                title: 'Станьте творцем',
                text: 'Монетизуйте свої Revit-сімейства через наш маркетплейс.'
            },
            {
                icon: '🎁',
                title: 'Почнімо!',
                text: 'Колесо фортуни, щоденні бонуси та багато іншого чекає на вас!'
            }
        ];
    }

    shouldShow() {
        // Показуємо тільки новим користувачам
        const user = Utils.storage.get('user');
        if (!user) return false;

        const onboardingKey = `onboarding_shown_${user.telegram_id}`;
        return !Utils.storage.get(onboardingKey, false);
    }

    start() {
        if (!this.shouldShow()) return;
        this.render();

        // Відмічаємо як показаний
        const user = Utils.storage.get('user');
        if (user) {
            Utils.storage.set(`onboarding_shown_${user.telegram_id}`, true);
        }
    }

    render() {
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-container">
                <div class="onboarding-progress">
                    <div class="onboarding-progress-bar" style="width: 20%"></div>
                </div>

                ${this.slides.map((slide, index) => `
                    <div class="onboarding-slide ${index === 0 ? 'active' : ''}">
                        <div class="onboarding-icon">${slide.icon}</div>
                        <div class="onboarding-content">
                            <h2 class="onboarding-title">${slide.title}</h2>
                            <p class="onboarding-text">${slide.text}</p>
                        </div>
                        <div class="onboarding-actions">
                            ${index < this.slides.length - 1 ?
                                `<button class="onboarding-btn onboarding-btn-skip" onclick="onboarding.finish()">Пропустити</button>` :
                                ''
                            }
                            <button class="onboarding-btn onboarding-btn-next" onclick="onboarding.${index < this.slides.length - 1 ? 'next' : 'finish'}()">
                                ${index < this.slides.length - 1 ? 'Далі' : 'Розпочати'}
                            </button>
                        </div>
                    </div>
                `).join('')}

                <div class="onboarding-dots">
                    ${this.slides.map((_, i) =>
                        `<div class="onboarding-dot ${i === 0 ? 'active' : ''}" onclick="onboarding.goToStep(${i})"></div>`
                    ).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    next() {
        if (this.currentStep < this.slides.length - 1) {
            this.goToStep(this.currentStep + 1);
        }
    }

    goToStep(index) {
        const slides = document.querySelectorAll('.onboarding-slide');
        const dots = document.querySelectorAll('.onboarding-dot');
        const progressBar = document.querySelector('.onboarding-progress-bar');

        // Оновлюємо слайди
        slides[this.currentStep].classList.remove('active');
        slides[this.currentStep].classList.add('prev');

        slides[index].classList.remove('prev');
        slides[index].classList.add('active');

        // Оновлюємо точки
        dots[this.currentStep].classList.remove('active');
        dots[index].classList.add('active');

        // Оновлюємо прогрес
        const progress = ((index + 1) / this.slides.length) * 100;
        progressBar.style.width = `${progress}%`;

        this.currentStep = index;

        // Вібрація на мобільних
        if (window.auth?.hapticFeedback) {
            window.auth.hapticFeedback('selection');
        }
    }

    finish() {
        const overlay = document.querySelector('.onboarding-overlay');
        if (overlay) {
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 300);
        }

        // Вібрація завершення
        if (window.auth?.hapticFeedback) {
            window.auth.hapticFeedback('impact', 'medium');
        }
    }
}

window.onboarding = new OnboardingModule();