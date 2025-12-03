/**
 * Main Application
 * Initialize and wire up all components
 */

import { reportManager } from './ReportManager.js';
import { taskManager } from './TaskManager.js';
import { storageManager } from './StorageManager.js';
import { uiManager } from './UIManager.js';
import { copyToClipboard, showValidationError, clearValidationError } from './utils.js';

class App {
    constructor() {
        this.pendingAction = null;
        this.pendingRestoreData = null;
        this.elements = {};
    }

    /**
     * Initialize application
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupManagers();
        this.loadInitialData();
        
        console.info('Report Generator initialized successfully');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Form inputs
            workBom: document.getElementById('workBom'),
            projectName: document.getElementById('projectName'),
            problems: document.getElementById('problems'),
            output: document.getElementById('output'),
            taskList: document.getElementById('task-list'),
            
            // Buttons
            copyButton: document.getElementById('copyButton'),
            addTaskButton: document.getElementById('addTaskButton'),
            clearTasksBtn: document.getElementById('clearTasksBtn'),
            resetAllBtn: document.getElementById('resetAllBtn'),
            themeToggle: document.getElementById('themeToggle'),
            historyBtn: document.getElementById('historyBtn'),
            
            // Modal elements
            confirmModalBtn: document.getElementById('confirmModalBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),
            closeHistoryBtn: document.getElementById('closeHistoryBtn')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form inputs
        this.elements.workBom?.addEventListener('input', (e) => {
            reportManager.setState({ workBom: e.target.value });
            clearValidationError(e.target);
        });

        this.elements.projectName?.addEventListener('input', (e) => {
            reportManager.setState({ projectName: e.target.value });
            clearValidationError(e.target);
        });

        this.elements.problems?.addEventListener('input', (e) => {
            reportManager.setState({ problems: e.target.value });
        });

        // Buttons
        this.elements.copyButton?.addEventListener('click', () => this.handleCopy());
        this.elements.addTaskButton?.addEventListener('click', () => this.handleAddTask());
        this.elements.clearTasksBtn?.addEventListener('click', () => this.handleClearTasks());
        this.elements.resetAllBtn?.addEventListener('click', () => this.handleResetAll());
        this.elements.themeToggle?.addEventListener('click', () => this.handleThemeToggle());
        this.elements.historyBtn?.addEventListener('click', () => this.handleShowHistory());

        // Modal buttons
        this.elements.confirmModalBtn?.addEventListener('click', () => this.handleConfirm());
        this.elements.cancelModalBtn?.addEventListener('click', () => this.handleCancelModal());
        this.elements.closeHistoryBtn?.addEventListener('click', () => this.handleCloseHistory());

        // Task list delegation
        this.elements.taskList?.addEventListener('click', (e) => this.handleTaskAction(e));

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                uiManager.closeAllModals();
            }
        });
    }

    /**
     * Setup managers
     */
    setupManagers() {
        // Initialize UI manager
        uiManager.init();

        // Note: We don't listen to task changes here to avoid re-rendering
        // while user is typing. Re-render only happens when structure changes
        // (add/remove/move tasks)

        // Listen to report changes
        reportManager.onChange((state) => {
            this.updateFormFromState(state);
        });

        // Setup theme
        const savedTheme = storageManager.getTheme();
        uiManager.updateTheme(savedTheme);
    }

    /**
     * Load initial data
     */
    loadInitialData() {
        reportManager.load();
        this.renderTasks();
    }

    /**
     * Render tasks
     */
    renderTasks() {
        const tasks = taskManager.getTasks();
        uiManager.renderTasks(tasks, (index, updates) => {
            if (updates === 'addNew') {
                this.handleAddTask();
            } else {
                // Update task data without re-rendering
                taskManager.updateTask(index, updates);
            }
        });

        // Update move-down buttons disabled state
        const rows = document.querySelectorAll('.task-row');
        rows.forEach((row, index) => {
            const moveDownBtn = row.querySelector('.move-down-btn');
            if (moveDownBtn) {
                moveDownBtn.disabled = index === rows.length - 1;
            }
        });
    }

    /**
     * Update form from state
     * @param {Object} state - Report state
     */
    updateFormFromState(state) {
        if (this.elements.workBom) {
            this.elements.workBom.value = state.workBom || '';
        }
        
        if (this.elements.projectName) {
            this.elements.projectName.value = state.projectName || '';
        }
        
        if (this.elements.problems) {
            this.elements.problems.value = state.problems || '';
        }
    }

    /**
     * Handle copy button
     */
    async handleCopy() {
        // Validate first
        const validation = reportManager.validate();
        
        if (!validation.valid) {
            validation.errors.forEach(error => {
                if (error.field === 'workBom') {
                    showValidationError(this.elements.workBom, error.message);
                } else if (error.field === 'projectName') {
                    showValidationError(this.elements.projectName, error.message);
                }
            });
            
            uiManager.showToast('❌ กรุณาแก้ไขข้อมูลให้ถูกต้อง', 3000);
            return;
        }

        // Save to history
        reportManager.saveToHistory();

        // Generate report
        const reportText = reportManager.generateReport();
        
        // Update output preview
        if (this.elements.output) {
            this.elements.output.value = reportText;
        }

        // Copy to clipboard
        const success = await copyToClipboard(reportText);
        
        if (success) {
            uiManager.showToast('✅ คัดลอกเรียบร้อยพร้อมวาง!', 3000);
        } else {
            uiManager.showToast('❌ ไม่สามารถคัดลอกได้', 3000);
        }
    }

    /**
     * Handle add task
     */
    handleAddTask() {
        taskManager.addTask();
        this.renderTasks(); // Re-render with new task
        
        // Focus on new task detail input
        setTimeout(() => {
            const rows = document.querySelectorAll('.task-row');
            const lastRow = rows[rows.length - 1];
            lastRow?.querySelector('.task-detail')?.focus();
        }, 50);
    }

    /**
     * Handle task actions (move, remove)
     * @param {Event} e - Click event
     */
    handleTaskAction(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const row = btn.closest('.task-row');
        if (!row) return;

        const index = parseInt(row.dataset.index);

        if (btn.classList.contains('remove-task-button')) {
            taskManager.removeTask(index);
            this.renderTasks(); // Re-render after removing
        } else if (btn.classList.contains('move-up-btn')) {
            taskManager.moveTaskUp(index);
            this.renderTasks(); // Re-render after moving
        } else if (btn.classList.contains('move-down-btn')) {
            taskManager.moveTaskDown(index);
            this.renderTasks(); // Re-render after moving
        }
    }

    /**
     * Handle clear tasks button
     */
    handleClearTasks() {
        this.pendingAction = 'clearTasks';
        uiManager.showModal('confirm', {
            icon: '🧹',
            title: 'ล้างเฉพาะงาน?',
            description: 'เลข BOM และชื่อ Project จะยังอยู่<br>แต่รายการงานและปัญหาจะถูกลบ',
            confirmText: 'ยืนยัน'
        });
    }

    /**
     * Handle reset all button
     */
    handleResetAll() {
        this.pendingAction = 'resetAll';
        uiManager.showModal('confirm', {
            icon: '🗑️',
            title: 'ล้างข้อมูลทั้งหมด?',
            description: 'BOM, Project, และงานทั้งหมดจะหายไป<br>ต้องการเริ่มใหม่ใช่หรือไม่?',
            confirmText: 'ยืนยัน'
        });
    }

    /**
     * Handle theme toggle
     */
    handleThemeToggle() {
        const newTheme = uiManager.toggleTheme();
        storageManager.saveTheme(newTheme);
    }

    /**
     * Handle show history
     */
    handleShowHistory() {
        const history = storageManager.loadHistory();
        uiManager.renderHistory(history, (item) => {
            this.pendingRestoreData = item.data;
            this.pendingAction = 'restoreHistory';
            
            uiManager.showModal('confirm', {
                type: 'restore',
                icon: '📂',
                title: 'โหลดรีพอร์ตเก่า?',
                description: `ต้องการกู้คืนข้อมูลจากวันที่<br><b>${item.timestamp}</b> ใช่หรือไม่?<br>(ข้อมูลปัจจุบันจะถูกแทนที่)`,
                confirmText: 'โหลดข้อมูล'
            });
        });
        
        uiManager.showModal('history');
    }

    /**
     * Handle confirm modal
     */
    handleConfirm() {
        if (this.pendingAction === 'resetAll') {
            reportManager.resetAll();
            this.elements.output.value = '';
        } else if (this.pendingAction === 'clearTasks') {
            reportManager.clearTasks();
            this.elements.output.value = '';
        } else if (this.pendingAction === 'restoreHistory') {
            if (this.pendingRestoreData) {
                reportManager.restoreFromHistory(this.pendingRestoreData);
                uiManager.hideModal('history');
            }
        }

        uiManager.hideModal('confirm');
        this.pendingAction = null;
        this.pendingRestoreData = null;
    }

    /**
     * Handle cancel modal
     */
    handleCancelModal() {
        uiManager.hideModal('confirm');
        this.pendingAction = null;
        this.pendingRestoreData = null;
    }

    /**
     * Handle close history modal
     */
    handleCloseHistory() {
        uiManager.hideModal('history');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}
