/**
 * Модуль онбордингу для нових користувачів
 */
class OnboardingModule {
    constructor() {
        this.steps = [
            'step1', 'step2', 'step3', 'step4', 'step5'
        ];
        this.currentStepIndex = 0;
    }

    /**
     * Перевірка, чи потрібно показувати онбординг
     */
    shouldShow() {
        // Показуємо, якщо користувач ще не бачив онбординг
        return !Utils.storage.get('onboarding_completed', false);
    }

    /**
     * Запустити онбординг
     */
    start() {
        if (!this.shouldShow()) return;
        this.render();
    }

    /**
     * Рендер модального вікна онбордингу
     */
    render() {
        const modal = document.createElement('div');
        modal.id = 'onboarding-modal';
        modal.className = 'onboarding-backdrop';
        modal.innerHTML = `
            <div class="onboarding-content">
                <div class="onboarding-steps"></div>
                <div class="onboarding-dots"></div>
                <div class="onboarding-nav"></div>
            </div>
        `;
        document.body.appendChild(modal);

        this.updateStepContent();
        this.updateDots();
        this.updateNav();
    }

    /**
     * Оновити контент поточного кроку
     */
    updateStepContent() {
        const stepsContainer = document.querySelector('.onboarding-steps');
        if (!stepsContainer) return;

        const stepKey = this.steps[this.currentStepIndex];
        const step = {
            title: window.app.t(`onboarding.${stepKey}.title`),
            description: window.app.t(`onboarding.${stepKey}.description`),
            button_text: window.app.t(`onboarding.${stepKey}.button_text`, null)
        };

        // Використовуємо надані зображення
        const images = ['outboard.png', 'outboard2.png'];
        const image = this.currentStepIndex % 2 === 0 ? images[0] : images[1];

        stepsContainer.innerHTML = `
            <div class="onboarding-step active">
                <div class="onboarding-image" style="background-image: url('/assets/images/${image}')"></div>
                <div class="onboarding-text">
                    <h2 class="onboarding-title">${step.title}</h2>
                    <p class="onboarding-description">${step.description}</p>
                </div>
            </div>
        `;
    }

    /**
     * Оновити індикатори (крапки)
     */
    updateDots() {
        const dotsContainer = document.querySelector('.onboarding-dots');
        if (!dotsContainer) return;

        dotsContainer.innerHTML = this.steps.map((_, index) =>
            `<div class="onboarding-dot ${index === this.currentStepIndex ? 'active' : ''}"></div>`
        ).join('');
    }

    /**
     * Оновити кнопки навігації
     */
    updateNav() {
        const navContainer = document.querySelector('.onboarding-nav');
        if (!navContainer) return;

        const isLastStep = this.currentStepIndex === this.steps.length - 1;
        const stepKey = this.steps[this.currentStepIndex];
        const specialButtonText = window.app.t(`onboarding.${stepKey}.button_text`, null);

        let specialButton = '';
        if (specialButtonText) {
            let action = '';
            if (stepKey === 'step3') action = `window.app.navigateTo('subscriptions')`; // Приклад дії
            if (stepKey === 'step4') action = `admin.showCreatorApplicationModal()`; // Приклад дії
            specialButton = `<button onclick="${action}" class="onboarding-btn-special">${specialButtonText}</button>`;
        }


        navContainer.innerHTML = `
            ${this.currentStepIndex > 0 ? `<button onclick="onboarding.prevStep()" class="onboarding-btn-secondary">Назад</button>` : '<div></div>'}
            ${specialButton}
            <button onclick="${isLastStep ? 'onboarding.finish()' : 'onboarding.nextStep()'}" class="onboarding-btn-primary">
                ${isLastStep ? window.app.t('onboarding.step5.button_text') : 'Далі'}
            </button>
        `;
    }

    /**
     * Наступний крок
     */
    nextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.updateStepContent();
            this.updateDots();
            this.updateNav();
        }
    }

    /**
     * Попередній крок
     */
    prevStep() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.updateStepContent();
            this.updateDots();
            this.updateNav();
        }
    }

    /**
     * Завершити онбординг
     */
    finish() {
        Utils.storage.set('onboarding_completed', true);
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// Створюємо та експортуємо єдиний екземпляр
const onboarding = new OnboardingModule();
window.onboarding = onboarding;