// js/utils/adminHelpers.js
export const adminHelpers = {
    /**
     * Check if user has admin access
     */
    checkAdminAccess() {
        if (!window.auth?.isAuthenticated() || !window.auth?.isAdmin()) {
            Utils.showNotification(window.app?.t('admin.errors.accessDenied') || 'Доступ тільки для адміністраторів', 'error');
            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
            return false;
        }
        return true;
    },

    /**
     * Format user status badge
     */
    formatUserStatus(user) {
        const badges = [];

        if (user.is_admin) {
            badges.push({ type: 'admin', color: 'red', text: 'Admin' });
        }
        if (user.is_creator) {
            badges.push({ type: 'creator', color: 'purple', text: 'Creator' });
        }
        if (user.vip_level > 0) {
            const vipLabels = ['', 'Bronze', 'Silver', 'Gold', 'Diamond'];
            badges.push({ type: 'vip', color: 'yellow', text: vipLabels[user.vip_level] });
        }
        if (user.is_blocked) {
            badges.push({ type: 'blocked', color: 'red', text: 'Blocked' });
        }

        return badges;
    },

    /**
     * Format product moderation status
     */
    formatModerationStatus(product) {
        if (product.is_approved) {
            if (product.is_active) {
                return { status: 'active', color: 'green', text: window.app?.t('admin.statuses.active') || 'Активний' };
            }
            return { status: 'paused', color: 'gray', text: window.app?.t('admin.statuses.paused') || 'Призупинено' };
        }

        if (product.rejection_reason) {
            return { status: 'rejected', color: 'red', text: window.app?.t('admin.statuses.rejected') || 'Відхилено' };
        }

        return { status: 'pending', color: 'yellow', text: window.app?.t('admin.statuses.pending') || 'Модерація' };
    },

    /**
     * Format broadcast statistics
     */
    formatBroadcastStats(stats) {
        const successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0;

        return {
            sent: stats.sent || 0,
            total: stats.total || 0,
            failed: (stats.total - stats.sent) || 0,
            successRate: successRate
        };
    },

    /**
     * Validate promocode data
     */
    validatePromocodeData(code, value, type, maxUses) {
        const errors = [];

        if (!code || code.length < 3) {
            errors.push(window.app?.t('admin.validations.promocode.codeLength') || 'Код має бути не менше 3 символів');
        }

        if (!/^[A-Z0-9_-]+$/i.test(code)) {
            errors.push(window.app?.t('admin.validations.promocode.codeFormat') || 'Код може містити тільки літери, цифри, _ та -');
        }

        if (!value || value <= 0) {
            errors.push(window.app?.t('admin.validations.promocode.value') || 'Вкажіть коректне значення знижки');
        }

        if (type === 'percent' && value > 100) {
            errors.push(window.app?.t('admin.validations.promocode.percentLimit') || 'Відсоток не може бути більше 100');
        }

        if (maxUses && maxUses < 0) {
            errors.push(window.app?.t('admin.validations.promocode.maxUses') || 'Кількість використань не може бути від\'ємною');
        }

        return { valid: errors.length === 0, errors };
    },

    /**
     * Show grant subscription dialog
     */
    async showGrantSubscriptionDialog() {
        const plan = prompt(
            window.app?.t('admin.dialogs.grantSubscription.prompt') ||
            'Виберіть план:\n1. monthly (30 днів)\n2. yearly (365 днів)\n3. Або введіть кількість днів'
        );

        if (!plan) return null;

        if (plan === '1' || plan.toLowerCase() === 'monthly') {
            return { plan_type: 'monthly' };
        } else if (plan === '2' || plan.toLowerCase() === 'yearly') {
            return { plan_type: 'yearly' };
        } else {
            const days = parseInt(plan);
            if (isNaN(days) || days <= 0) {
                Utils.showNotification(
                    window.app?.t('admin.validations.invalidDays') || 'Невірна кількість днів',
                    'error'
                );
                return null;
            }
            return { plan_type: 'custom', days };
        }
    },

    /**
     * Draw chart on canvas
     */
    drawRevenueChart(canvas, data) {
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) {
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText(window.app?.t('admin.charts.noData') || 'Немає даних', width / 2, height / 2);
            return;
        }

        const maxRevenue = Math.max(...data.map(d => d.revenue || 0));

        // Draw line chart
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((point.revenue || 0) / maxRevenue) * (height - padding * 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Draw points
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Date labels
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const date = new Date(point.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
            ctx.fillText(date, x, height - 10);
        });

        ctx.stroke();
    },

    /**
     * Export data to CSV
     */
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            Utils.showNotification(window.app?.t('admin.errors.noDataToExport') || 'Немає даних для експорту', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'export.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

window.adminHelpers = adminHelpers;
export default adminHelpers;