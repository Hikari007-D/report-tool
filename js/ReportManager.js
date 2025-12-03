/**
 * ReportManager
 * Central state management for report data
 */

import { validateWorkBom, validateProjectName, formatDate } from './utils.js';
import { taskManager } from './TaskManager.js';
import { storageManager } from './StorageManager.js';

class ReportManager {
    constructor() {
        this.state = {
            workBom: '',
            projectName: '',
            problems: ''
        };
        
        this.listeners = [];
    }

    /**
     * Add a change listener
     * @param {Function} callback - Callback function
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.state));
    }

    /**
     * Set state
     * @param {Object} updates - State updates
     */
    setState(updates) {
        this.state = {
            ...this.state,
            ...updates
        };
        
        this.notifyListeners();
        this.save();
    }

    /**
     * Get current state
     * @returns {Object} - Current state
     */
    getState() {
        return {
            ...this.state,
            tasks: taskManager.getTasks()
        };
    }

    /**
     * Validate current state
     * @returns {Object} - {valid: boolean, errors: Array}
     */
    validate() {
        const errors = [];
        
        // Validate Work BOM
        if (this.state.workBom && !validateWorkBom(this.state.workBom)) {
            errors.push({
                field: 'workBom',
                message: 'รูปแบบ Work BOM ไม่ถูกต้อง (ตัวอย่าง: WB-S2407-0105-A)'
            });
        }
        
        // Validate Project Name
        if (this.state.projectName && !validateProjectName(this.state.projectName)) {
            errors.push({
                field: 'projectName',
                message: 'ชื่อโปรเจกต์ต้องมีความยาว 3-200 ตัวอักษร'
            });
        }
        
        // Validate tasks
        const taskValidation = taskManager.validate();
        if (!taskValidation.valid) {
            errors.push(...taskValidation.errors);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate report text
     * @returns {string} - Formatted report
     */
    generateReport() {
        const data = this.getState();
        const parts = [];
        const separator = '------------------------------';
        const dateStr = formatDate(new Date());
        
        // Header
        parts.push(`📅 รายงานวันที่: ${dateStr}`);
        
        if (data.workBom) {
            parts.push(`🔖 Work BOM : ${data.workBom}`);
        }
        
        if (data.projectName) {
            parts.push(`🏷️ Project : ${data.projectName}`);
        }
        
        if (data.workBom || data.projectName) {
            parts.push(separator);
        }
        
        // Tasks
        parts.push('✅ **รายละเอียดงาน**');
        
        if (data.tasks.length > 0) {
            let hasTasks = false;
            
            data.tasks.forEach((task, index) => {
                if (task.detail) {
                    hasTasks = true;
                    const taskNumber = index + 1;
                    parts.push(`${taskNumber}. ${task.detail}`);
                    parts.push(`   🚦 Status: ${task.status}`);
                    
                    if (task.remark && task.remark !== '-') {
                        parts.push(`   💬 Remark: ${task.remark}`);
                    }
                }
            });
            
            if (!hasTasks) {
                parts.push('- ไม่มีรายการ -');
            }
        } else {
            parts.push('- ไม่มีรายการ -');
        }
        
        // Problems
        if (data.problems) {
            parts.push(separator);
            parts.push('📌 **ปัญหา**');
            parts.push(data.problems);
        }
        
        return parts.join('\n').trim();
    }

    /**
     * Save current state to localStorage
     */
    save() {
        const data = this.getState();
        storageManager.saveReportData(data);
    }

    /**
     * Load state from localStorage
     * @returns {boolean} - Success status
     */
    load() {
        const data = storageManager.loadReportData();
        
        if (data) {
            this.state = {
                workBom: data.workBom || '',
                projectName: data.projectName || '',
                problems: data.problems || ''
            };
            
            if (data.tasks && data.tasks.length > 0) {
                taskManager.setTasks(data.tasks);
            } else {
                taskManager.addTask(); // Add one empty task
            }
            
            this.notifyListeners();
            return true;
        }
        
        // No saved data, start with one empty task
        taskManager.addTask();
        return false;
    }

    /**
     * Save to history
     * @returns {boolean} - Success status
     */
    saveToHistory() {
        const data = this.getState();
        return storageManager.saveToHistory(data);
    }

    /**
     * Restore from history item
     * @param {Object} historyData - History data
     */
    restoreFromHistory(historyData) {
        this.state = {
            workBom: historyData.workBom || '',
            projectName: historyData.projectName || '',
            problems: historyData.problems || ''
        };
        
        if (historyData.tasks && historyData.tasks.length > 0) {
            taskManager.setTasks(historyData.tasks);
        } else {
            taskManager.clearTasks();
            taskManager.addTask();
        }
        
        this.notifyListeners();
        this.save();
    }

    /**
     * Clear only tasks and problems
     */
    clearTasks() {
        this.state.problems = '';
        taskManager.clearTasks();
        taskManager.addTask();
        
        this.notifyListeners();
        this.save();
    }

    /**
     * Reset all data
     */
    resetAll() {
        this.state = {
            workBom: '',
            projectName: '',
            problems: ''
        };
        
        taskManager.clearTasks();
        taskManager.addTask();
        
        this.notifyListeners();
        this.save();
    }

    /**
     * Get summary statistics
     * @returns {Object} - Summary data
     */
    getSummary() {
        return {
            hasWorkBom: !!this.state.workBom,
            hasProjectName: !!this.state.projectName,
            hasProblems: !!this.state.problems,
            tasksSummary: taskManager.getSummary()
        };
    }

    /**
     * Export report data
     * @returns {Object} - Export data
     */
    export() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: this.getState()
        };
    }

    /**
     * Import report data
     * @param {Object} importData - Import data
     * @returns {boolean} - Success status
     */
    import(importData) {
        try {
            if (!importData.data) {
                throw new Error('Invalid import format');
            }
            
            const data = importData.data;
            
            this.state = {
                workBom: data.workBom || '',
                projectName: data.projectName || '',
                problems: data.problems || ''
            };
            
            if (data.tasks) {
                taskManager.setTasks(data.tasks);
            }
            
            this.notifyListeners();
            this.save();
            
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const reportManager = new ReportManager();
