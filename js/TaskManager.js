/**
 * TaskManager
 * Handles all task-related operations (CRUD, reordering)
 */

class TaskManager {
    constructor() {
        this.tasks = [];
        this.listeners = [];
    }

    /**
     * Add a change listener
     * @param {Function} callback - Function to call when tasks change
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of changes
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.tasks));
    }

    /**
     * Set tasks array
     * @param {Array} tasks - Array of task objects
     */
    setTasks(tasks) {
        this.tasks = tasks || [];
        this.notifyListeners();
    }

    /**
     * Get all tasks
     * @returns {Array} - Tasks array
     */
    getTasks() {
        return this.tasks;
    }

    /**
     * Add a new task
     * @param {Object} task - Task object {detail, status, remark}
     * @returns {number} - Index of added task
     */
    addTask(task = {}) {
        const newTask = {
            detail: task.detail || '',
            status: task.status || 'OK',
            remark: task.remark || ''
        };
        
        this.tasks.push(newTask);
        this.notifyListeners();
        
        return this.tasks.length - 1;
    }

    /**
     * Update a task
     * @param {number} index - Task index
     * @param {Object} updates - Fields to update
     * @returns {boolean} - Success status
     */
    updateTask(index, updates) {
        if (index < 0 || index >= this.tasks.length) {
            return false;
        }
        
        this.tasks[index] = {
            ...this.tasks[index],
            ...updates
        };
        
        this.notifyListeners();
        return true;
    }

    /**
     * Remove a task
     * @param {number} index - Task index
     * @returns {boolean} - Success status
     */
    removeTask(index) {
        if (index < 0 || index >= this.tasks.length) {
            return false;
        }
        
        this.tasks.splice(index, 1);
        this.notifyListeners();
        return true;
    }

    /**
     * Move task up
     * @param {number} index - Task index
     * @returns {boolean} - Success status
     */
    moveTaskUp(index) {
        if (index <= 0 || index >= this.tasks.length) {
            return false;
        }
        
        [this.tasks[index - 1], this.tasks[index]] = 
        [this.tasks[index], this.tasks[index - 1]];
        
        this.notifyListeners();
        return true;
    }

    /**
     * Move task down
     * @param {number} index - Task index
     * @returns {boolean} - Success status
     */
    moveTaskDown(index) {
        if (index < 0 || index >= this.tasks.length - 1) {
            return false;
        }
        
        [this.tasks[index], this.tasks[index + 1]] = 
        [this.tasks[index + 1], this.tasks[index]];
        
        this.notifyListeners();
        return true;
    }

    /**
     * Clear all tasks
     */
    clearTasks() {
        this.tasks = [];
        this.notifyListeners();
    }

    /**
     * Get task count
     * @returns {number} - Number of tasks
     */
    getTaskCount() {
        return this.tasks.length;
    }

    /**
     * Check if tasks are empty
     * @returns {boolean} - True if no tasks or all tasks are empty
     */
    isEmpty() {
        return this.tasks.length === 0 || 
               this.tasks.every(task => !task.detail.trim());
    }

    /**
     * Validate all tasks
     * @returns {Object} - {valid: boolean, errors: Array}
     */
    validate() {
        const errors = [];
        
        this.tasks.forEach((task, index) => {
            if (task.detail && task.detail.length > 500) {
                errors.push({
                    index,
                    field: 'detail',
                    message: 'รายละเอียดงานยาวเกินไป (สูงสุด 500 ตัวอักษร)'
                });
            }
            
            if (task.remark && task.remark.length > 200) {
                errors.push({
                    index,
                    field: 'remark',
                    message: 'หมายเหตุยาวเกินไป (สูงสุด 200 ตัวอักษร)'
                });
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get tasks summary for export
     * @returns {Object} - Summary statistics
     */
    getSummary() {
        const summary = {
            total: this.tasks.length,
            ok: 0,
            ng: 0,
            pending: 0,
            inProgress: 0,
            waiting: 0,
            other: 0
        };
        
        this.tasks.forEach(task => {
            const status = task.status.toLowerCase();
            
            if (status === 'ok') summary.ok++;
            else if (status === 'ng') summary.ng++;
            else if (status === 'pending') summary.pending++;
            else if (status === 'in progress') summary.inProgress++;
            else if (status === 'waiting') summary.waiting++;
            else summary.other++;
        });
        
        return summary;
    }

    /**
     * Export tasks as JSON
     * @returns {string} - JSON string
     */
    toJSON() {
        return JSON.stringify(this.tasks, null, 2);
    }

    /**
     * Import tasks from JSON
     * @param {string} json - JSON string
     * @returns {boolean} - Success status
     */
    fromJSON(json) {
        try {
            const tasks = JSON.parse(json);
            
            if (!Array.isArray(tasks)) {
                throw new Error('Invalid format: expected array');
            }
            
            this.setTasks(tasks);
            return true;
        } catch (error) {
            console.error('Failed to import tasks:', error);
            return false;
        }
    }
}

// Export singleton instance
export const taskManager = new TaskManager();
