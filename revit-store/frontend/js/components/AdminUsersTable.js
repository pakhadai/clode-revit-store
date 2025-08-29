// js/components/AdminUsersTable.js
export class AdminUsersTable {
    constructor(users, onUpdate, onDelete, onToggleBlock, onToggleCreator, onGrantSubscription) {
        this.users = users;
        this.onUpdate = onUpdate;
        this.onDelete = onDelete;
        this.onToggleBlock = onToggleBlock;
        this.onToggleCreator = onToggleCreator;
        this.onGrantSubscription = onGrantSubscription;
    }

    render() {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    ${this.renderHeader()}
                    ${this.renderBody()}
                </table>
            </div>
        `;
    }

    renderHeader() {
        return `
            <thead>
                <tr class="border-b dark:border-gray-700">
                    <th class="text-left py-3 px-4">ID</th>
                    <th class="text-left py-3 px-4">${window.app?.t('admin.users.user') || 'Користувач'}</th>
                    <th class="text-left py-3 px-4">${window.app?.t('admin.users.balance') || 'Баланс'}</th>
                    <th class="text-left py-3 px-4">VIP</th>
                    <th class="text-left py-3 px-4">${window.app?.t('admin.users.roles') || 'Ролі'}</th>
                    <th class="text-left py-3 px-4">${window.app?.t('admin.users.status') || 'Статус'}</th>
                    <th class="text-left py-3 px-4">${window.app?.t('admin.users.actions') || 'Дії'}</th>
                </tr>
            </thead>
        `;
    }

    renderBody() {
        return `
            <tbody>
                ${this.users.map(user => this.renderUserRow(user)).join('')}
            </tbody>
        `;
    }

    renderUserRow(user) {
        return `
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="py-3 px-4">${user.id}</td>
                <td class="py-3 px-4">
                    <div>
                        <div class="font-medium dark:text-white">${user.full_name}</div>
                        <div class="text-xs text-gray-500">@${user.username || `id${user.telegram_id}`}</div>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <input type="number" value="${user.balance}"
                           id="balance-${user.id}"
                           class="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:text-white">
                </td>
                <td class="py-3 px-4">
                    <select id="vip-${user.id}"
                            class="px-2 py-1 border rounded dark:bg-gray-800 dark:text-white">
                        ${this.renderVipOptions(user.vip_level)}
                    </select>
                </td>
                <td class="py-3 px-4">
                    ${this.renderRoles(user)}
                </td>
                <td class="py-3 px-4">
                    ${this.renderStatus(user)}
                </td>
                <td class="py-3 px-4">
                    ${this.renderActions(user)}
                </td>
            </tr>
        `;
    }

    renderVipOptions(currentLevel) {
        const levels = [
            { value: 0, label: 'None' },
            { value: 1, label: '🥉 Bronze' },
            { value: 2, label: '🥈 Silver' },
            { value: 3, label: '🥇 Gold' },
            { value: 4, label: '💎 Diamond' }
        ];

        return levels.map(level =>
            `<option value="${level.value}" ${currentLevel === level.value ? 'selected' : ''}>${level.label}</option>`
        ).join('');
    }

    renderRoles(user) {
        return `
            <div class="flex gap-1">
                ${user.is_admin ? '<span class="badge bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Admin</span>' : ''}
                <button onclick="adminUsersTable.handleToggleCreator(${user.id}, ${!user.is_creator})"
                        class="badge ${user.is_creator ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}
                               px-2 py-1 rounded text-xs hover:opacity-80"
                        title="${window.app?.t('admin.users.toggleCreator') || 'Змінити статус творця'}">
                    ${user.is_creator ? '🎨 Creator' : '👤 User'}
                </button>
            </div>
        `;
    }

    renderStatus(user) {
        return user.is_blocked ?
            `<span class="text-red-500">🚫 ${window.app?.t('admin.users.blocked') || 'Blocked'}</span>` :
            `<span class="text-green-500">✅ ${window.app?.t('admin.users.active') || 'Active'}</span>`;
    }

    renderActions(user) {
        return `
            <div class="flex gap-2 text-xl">
                <button onclick="adminUsersTable.handleSave(${user.id})"
                        class="text-blue-500 hover:text-blue-600"
                        title="${window.app?.t('buttons.save') || 'Зберегти'}">
                    💾
                </button>
                <button onclick="adminUsersTable.handleToggleBlock(${user.id}, ${!user.is_blocked})"
                        class="text-${user.is_blocked ? 'green' : 'red'}-500"
                        title="${user.is_blocked ? window.app?.t('admin.users.unblock') || 'Розблокувати' : window.app?.t('admin.users.block') || 'Заблокувати'}">
                    ${user.is_blocked ? '🔓' : '🔒'}
                </button>
                <button onclick="adminUsersTable.handleGrantSubscription(${user.id})"
                        class="text-purple-500"
                        title="${window.app?.t('admin.users.grantSubscription') || 'Видати підписку'}">
                    ⭐
                </button>
                <button onclick="adminUsersTable.handleDelete(${user.id})"
                        class="text-red-600 hover:text-red-800"
                        title="${window.app?.t('admin.users.delete') || 'Видалити з БД'}">
                    🗑️
                </button>
            </div>
        `;
    }

    handleSave(userId) {
        const balance = document.getElementById(`balance-${userId}`)?.value;
        const vipLevel = document.getElementById(`vip-${userId}`)?.value;

        if (this.onUpdate) {
            this.onUpdate(userId, {
                balance: parseInt(balance),
                vip_level: parseInt(vipLevel)
            });
        }
    }

    handleToggleBlock(userId, block) {
        if (this.onToggleBlock) {
            this.onToggleBlock(userId, block);
        }
    }

    handleToggleCreator(userId, isCreator) {
        if (this.onToggleCreator) {
            this.onToggleCreator(userId, isCreator);
        }
    }

    handleGrantSubscription(userId) {
        if (this.onGrantSubscription) {
            this.onGrantSubscription(userId);
        }
    }

    handleDelete(userId) {
        if (this.onDelete) {
            this.onDelete(userId);
        }
    }
}

// Global reference for event handlers
window.adminUsersTable = null;
export default AdminUsersTable;