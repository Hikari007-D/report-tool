/**
 * StorageManager
 * Manages localStorage operations with error handling and quota checking
 */

import { checkLocalStorageAvailable, getStorageQuota } from './utils.js';

const STORAGE_KEYS = {
    REPORT_DATA: 'reportData',
    REPORT_HISTORY: 'reportHistory',
    THEME: 'theme'
};

const MAX_HISTORY_ITEMS = 20;

class StorageManager {
    constructor() {
        this.isAvailable = checkLocalStorageAvailable();
        
        if (!this.isAvailable) {
            console.warn('localStorage is not available. Data persistence will not work.');
        }
    }

    /**
     * Check if storage quota is sufficient
     * @returns {boolean}
     */
    hasSpace() {
        if (!this.isAvailable) return false;
        
        const quota = getStorageQuota();
        return quota.percentUsed < 95; // Warning if over 95%
    }

    /**
     * Save report data
     * @param {Object} data - Report data object
     * @returns {boolean} - Success status
     */
    saveReportData(data) {
        if (!this.isAvailable) return false;
        
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(STORAGE_KEYS.REPORT_DATA, json);
            return true;
        } catch (error) {
            console.error('Failed to save report data:', error);
            
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            }
            
            return false;
        }
    }

    /**
     * Load report data
     * @returns {Object|null} - Report data or null
     */
    loadReportData() {
        if (!this.isAvailable) return null;
        
        try {
            const json = localStorage.getItem(STORAGE_KEYS.REPORT_DATA);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Failed to load report data:', error);
            return null;
        }
    }

    /**
     * Save to history
     * @param {Object} data - Report data
     * @returns {boolean} - Success status
     */
    saveToHistory(data) {
        if (!this.isAvailable) return false;
        
        // Don't save empty reports
        if (!data.workBom && !data.projectName && 
            (!data.tasks || data.tasks.length === 0 || !data.tasks[0].detail)) {
            return false;
        }
        
        try {
            const history = this.loadHistory();
            const timestamp = new Date().toLocaleString('th-TH');
            
            const historyItem = {
                timestamp,
                data: structuredClone(data) // Deep clone
            };
            
            // Add to beginning
            history.unshift(historyItem);
            
            // Keep only MAX_HISTORY_ITEMS
            if (history.length > MAX_HISTORY_ITEMS) {
                history.length = MAX_HISTORY_ITEMS;
            }
            
            const json = JSON.stringify(history);
            localStorage.setItem(STORAGE_KEYS.REPORT_HISTORY, json);
            
            return true;
        } catch (error) {
            console.error('Failed to save to history:', error);
            
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            }
            
            return false;
        }
    }

    /**
     * Load history
     * @returns {Array} - Array of history items
     */
    loadHistory() {
        if (!this.isAvailable) return [];
        
        try {
            const json = localStorage.getItem(STORAGE_KEYS.REPORT_HISTORY);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    /**
     * Clear history
     * @returns {boolean} - Success status
     */
    clearHistory() {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(STORAGE_KEYS.REPORT_HISTORY);
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error);
            return false;
        }
    }

    /**
     * Get theme preference
     * @returns {string} - 'light' or 'dark'
     */
    getTheme() {
        if (!this.isAvailable) return 'light';
        
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    }

    /**
     * Save theme preference
     * @param {string} theme - 'light' or 'dark'
     * @returns {boolean} - Success status
     */
    saveTheme(theme) {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
            return true;
        } catch (error) {
            console.error('Failed to save theme:', error);
            return false;
        }
    }

    /**
     * Handle quota exceeded error
     * Attempt to free space by removing old history items
     */
    handleQuotaExceeded() {
        console.warn('Storage quota exceeded. Attempting to free space...');
        
        try {
            // Remove oldest half of history
            const history = this.loadHistory();
            if (history.length > 5) {
                history.length = Math.floor(history.length / 2);
                const json = JSON.stringify(history);
                localStorage.setItem(STORAGE_KEYS.REPORT_HISTORY, json);
                console.info('Freed space by removing old history items.');
            }
        } catch (error) {
            console.error('Failed to free space:', error);
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} - Storage stats
     */
    getStats() {
        const quota = getStorageQuota();
        
        return {
            available: this.isAvailable,
            quota,
            historyCount: this.loadHistory().length
        };
    }

    /**
     * Clear all app data (for reset)
     * @returns {boolean} - Success status
     */
    clearAll() {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(STORAGE_KEYS.REPORT_DATA);
            localStorage.removeItem(STORAGE_KEYS.REPORT_HISTORY);
            // Keep theme preference
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }
}

// Export singleton instance
export const storageManager = new StorageManager();
