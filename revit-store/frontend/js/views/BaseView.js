// js/views/BaseView.js
export class BaseView {
    constructor(app) {
        this.app = app;
        this.t = app.t.bind(app); // Зручний доступ до функції перекладу
    }

    // В майбутньому тут можна буде додати спільні методи,
    // наприклад, для рендерингу header або footer, якщо знадобиться.
    async render(params) {
        throw new Error("Render method must be implemented by subclasses");
    }
}