/**
 * UIManager
 * Handles all UI operations, DOM manipulation, modals, and accessibility
 */

import { escapeHTML } from './utils.js';

class UIManager {
    constructor() {
        this.modals = new Map();
        this.focusTrap = null;
        this.lastFocusedElement = null;
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.setupModals();
        this.setupKeyboardNavigation();
    }

    /**
     * Setup modal elements
     */
    setupModals() {
        const confirmModal = document.getElementById('confirmModal');
        const historyModal = document.getElementById('historyModal');
        
        if (confirmModal) this.modals.set('confirm', confirmModal);
        if (historyModal) this.modals.set('history', historyModal);
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Show modal
     * @param {string} modalName - 'confirm' or 'history'
     * @param {Object} options - Modal configuration
     */
    showModal(modalName, options = {}) {
        const modal = this.modals.get(modalName);
        if (!modal) return;

        // Store currently focused element
        this.lastFocusedElement = document.activeElement;

        // Configure modal based on type
        if (modalName === 'confirm') {
            this.configureConfirmModal(options);
        }

        // Show modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Set up focus trap
        this.setupFocusTrap(modal);

        // Focus first focusable element
        const focusable = this.getFocusableElements(modal);
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    /**
     * Configure confirm modal
     * @param {Object} options - {type, title, description, icon}
     */
    configureConfirmModal(options) {
        const iconEl = document.getElementById('confirmIcon');
        const titleEl = document.getElementById('modalTitle');
        const descEl = document.getElementById('modalDesc');
        const confirmBtn = document.getElementById('confirmModalBtn');

        if (iconEl) iconEl.textContent = options.icon || '⚠️';
        if (titleEl) titleEl.textContent = options.title || 'ยืนยัน?';
        if (descEl) descEl.innerHTML = options.description || '';

        // Configure button
        if (confirmBtn) {
            confirmBtn.className = 'btn-confirm';
            confirmBtn.textContent = options.confirmText || 'ยืนยัน';

            if (options.type === 'restore') {
                confirmBtn.classList.add('btn-restore');
            }
        }
    }

    /**
     * Hide modal
     * @param {string} modalName - Modal name
     */
    hideModal(modalName) {
        const modal = this.modals.get(modalName);
        if (!modal) return;

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');

        // Remove focus trap
        this.removeFocusTrap();

        // Restore focus to previously focused element
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.modals.forEach((modal, name) => {
            this.hideModal(name);
        });
    }

    /**
     * Setup focus trap for modal
     * @param {HTMLElement} modal - Modal element
     */
    setupFocusTrap(modal) {
        const focusableElements = this.getFocusableElements(modal);
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        this.focusTrap = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        modal.addEventListener('keydown', this.focusTrap);
    }

    /**
     * Remove focus trap
     */
    removeFocusTrap() {
        if (this.focusTrap) {
            this.modals.forEach(modal => {
                modal.removeEventListener('keydown', this.focusTrap);
            });
            this.focusTrap = null;
        }
    }

    /**
     * Get focusable elements in container
     * @param {HTMLElement} container - Container element
     * @returns {Array} - Array of focusable elements
     */
    getFocusableElements(container) {
        const selector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
        return Array.from(container.querySelectorAll(selector));
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {number} duration - Duration in ms (default: 3000)
     */
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'show';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, duration);
    }

    /**
     * Render task rows
     * @param {Array} tasks - Array of task objects
     * @param {Function} onUpdate - Callback for task updates
     */
    renderTasks(tasks, onUpdate) {
        const taskList = document.getElementById('task-list');
        if (!taskList) return;

        taskList.innerHTML = '';

        tasks.forEach((task, index) => {
            const row = this.createTaskRow(task, index, onUpdate);
            taskList.appendChild(row);
        });
    }

    /**
     * Create task row element
     * @param {Object} task - Task object
     * @param {number} index - Task index
     * @param {Function} onUpdate - Update callback
     * @returns {HTMLElement} - Task row element
     */
    createTaskRow(task, index, onUpdate) {
        const row = document.createElement('div');
        row.className = 'task-row';
        row.dataset.index = index;

        const detailValue = escapeHTML(task.detail || '');
        const remarkValue = escapeHTML(task.remark || '');

        row.innerHTML = `
            <input 
                type="text" 
                class="task-detail" 
                placeholder="รายละเอียดงาน..." 
                value="${detailValue}"
                maxlength="500"
                aria-label="รายละเอียดงานที่ ${index + 1}"
            >
            <select 
                class="task-status" 
                aria-label="สถานะงานที่ ${index + 1}"
            >
                <option value="OK" ${task.status === 'OK' ? 'selected' : ''}>Status: OK</option>
                <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Status: Pending</option>
                <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>Status: In Progress</option>
                <option value="Waiting" ${task.status === 'Waiting' ? 'selected' : ''}>Status: Waiting</option>
                <option value="NG" ${task.status === 'NG' ? 'selected' : ''}>Status: NG</option>
                <option value="-" ${task.status === '-' ? 'selected' : ''}>Status: -</option>
            </select>
            <input 
                type="text" 
                class="task-remark" 
                list="remarkOptions" 
                placeholder="หมายเหตุ (ถ้ามี)" 
                value="${remarkValue}"
                maxlength="200"
                aria-label="หมายเหตุงานที่ ${index + 1}"
            >
            <div class="task-actions">
                <button 
                    type="button" 
                    class="icon-btn move-up-btn" 
                    title="เลื่อนขึ้น"
                    aria-label="เลื่อนงานที่ ${index + 1} ขึ้น"
                    ${index === 0 ? 'disabled' : ''}
                >⬆️</button>
                <button 
                    type="button" 
                    class="icon-btn move-down-btn" 
                    title="เลื่อนลง"
                    aria-label="เลื่อนงานที่ ${index + 1} ลง"
                >⬇️</button>
                <button 
                    type="button" 
                    class="icon-btn remove-task-button" 
                    title="ลบ"
                    aria-label="ลบงานที่ ${index + 1}"
                >🗑️</button>
            </div>
        `;

        // Update status color
        const statusSelect = row.querySelector('.task-status');
        this.updateStatusColor(statusSelect);

        // Setup event listeners
        this.setupTaskRowListeners(row, index, onUpdate);

        return row;
    }

    /**
     * Setup task row event listeners
     * @param {HTMLElement} row - Task row element
     * @param {number} index - Task index
     * @param {Function} onUpdate - Update callback
     */
    setupTaskRowListeners(row, index, onUpdate) {
        const detailInput = row.querySelector('.task-detail');
        const statusSelect = row.querySelector('.task-status');
        const remarkInput = row.querySelector('.task-remark');

        // Input listeners
        detailInput.addEventListener('input', (e) => {
            onUpdate(index, { detail: e.target.value });
        });

        statusSelect.addEventListener('change', (e) => {
            this.updateStatusColor(e.target);
            onUpdate(index, { status: e.target.value });
        });

        remarkInput.addEventListener('input', (e) => {
            onUpdate(index, { remark: e.target.value });
        });

        // Enter key on remark to add new task
        remarkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onUpdate('addNew');
            }
        });
    }

    /**
     * Update status select color
     * @param {HTMLSelectElement} selectElement - Select element
     */
    updateStatusColor(selectElement) {
        selectElement.classList.remove('status-ok', 'status-ng', 'status-pending', 'status-waiting');
        
        const value = selectElement.value;
        
        if (value === 'OK') {
            selectElement.classList.add('status-ok');
        } else if (value === 'NG') {
            selectElement.classList.add('status-ng');
        } else if (value === 'Pending' || value === 'In Progress') {
            selectElement.classList.add('status-pending');
        } else if (value === 'Waiting') {
            selectElement.classList.add('status-waiting');
        }
    }

    /**
     * Render history list
     * @param {Array} history - History items
     * @param {Function} onSelect - Select callback
     */
    renderHistory(history, onSelect) {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = '<div style="padding:20px;color:#888;text-align:center;">ยังไม่มีประวัติรีพอร์ต</div>';
            return;
        }

        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.setAttribute('role', 'button');
            div.setAttribute('tabindex', '0');
            div.setAttribute('aria-label', `โหลดรายงาน ${item.data.projectName || 'ไม่มีชื่อ'} จาก ${item.timestamp}`);

            const title = escapeHTML(item.data.projectName || 'ไม่มีชื่อโปรเจกต์');
            const subtitle = escapeHTML(item.data.workBom || 'No BOM');

            div.innerHTML = `
                <div class="history-date">${escapeHTML(item.timestamp)}</div>
                <div class="history-project">${title}</div>
                <div class="history-bom">${subtitle}</div>
            `;

            div.addEventListener('click', () => onSelect(item));
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                }
            });

            historyList.appendChild(div);
        });
    }

    /**
     * Update theme
     * @param {string} theme - 'light' or 'dark'
     */
    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Toggle theme
     * @returns {string} - New theme
     */
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        this.updateTheme(newTheme);
        return newTheme;
    }
}

// Export singleton instance
export const uiManager = new UIManager();
