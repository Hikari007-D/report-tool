/**
 * ReportManager
 * Central state management for report data
 */

import { validateWorkBom, validateProjectName, formatDateThai, formatDateISO, parseISODate } from './utils.js';
import { taskManager } from './TaskManager.js';
import { storageManager } from './StorageManager.js';

const SEPARATOR = '------------------------------';

class ReportManager {
    constructor() {
        this.state = {
            reportDate: formatDateISO(new Date()),
            workBom: '',
            projectName: '',
            tomorrowPlans: [],     // string[]
            problemsList: [],      // { problem: string, solution: string }[]
            helpNeeded: '',
            suggestions: ''
        };

        this.listeners = [];
    }

    onChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.state));
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
        this.save();
    }

    getState() {
        return {
            ...this.state,
            tasks: taskManager.getTasks()
        };
    }

    // --- Plans (tomorrow) ---
    addPlan(text = '') {
        this.state.tomorrowPlans.push(text);
        this.notifyListeners();
        this.save();
    }

    updatePlan(index, text) {
        if (index < 0 || index >= this.state.tomorrowPlans.length) return;
        this.state.tomorrowPlans[index] = text;
        this.save();
    }

    removePlan(index) {
        if (index < 0 || index >= this.state.tomorrowPlans.length) return;
        this.state.tomorrowPlans.splice(index, 1);
        this.notifyListeners();
        this.save();
    }

    // --- Problems (paired) ---
    addProblem(problem = '', solution = '') {
        this.state.problemsList.push({ problem, solution });
        this.notifyListeners();
        this.save();
    }

    updateProblem(index, updates) {
        if (index < 0 || index >= this.state.problemsList.length) return;
        this.state.problemsList[index] = { ...this.state.problemsList[index], ...updates };
        this.save();
    }

    removeProblem(index) {
        if (index < 0 || index >= this.state.problemsList.length) return;
        this.state.problemsList.splice(index, 1);
        this.notifyListeners();
        this.save();
    }

    validate() {
        const errors = [];

        if (this.state.workBom && !validateWorkBom(this.state.workBom)) {
            errors.push({ field: 'workBom', message: 'รูปแบบ Work BOM ไม่ถูกต้อง' });
        }

        if (this.state.projectName && !validateProjectName(this.state.projectName)) {
            errors.push({ field: 'projectName', message: 'ชื่อโปรเจกต์ต้องมีความยาว 3-200 ตัวอักษร' });
        }

        const taskValidation = taskManager.validate();
        if (!taskValidation.valid) {
            errors.push(...taskValidation.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Generate report text matching team template
     */
    generateReport() {
        const data = this.getState();
        const parts = [];
        const date = parseISODate(data.reportDate) || new Date();
        const dateStr = formatDateThai(date);

        // Header
        parts.push(`📅 รายงานวันที่: ${dateStr}`);
        parts.push(`🔖 Work BOM : ${data.workBom || '-'}`);
        parts.push(`🏷️ Project : ${data.projectName || '-'}`);
        parts.push(SEPARATOR);

        // Tasks (grouped by success/fail)
        parts.push('🟢 **รายละเอียดงาน**');
        const success = [];
        const failed = [];
        data.tasks.forEach((t) => {
            if (!t.detail || !t.detail.trim()) return;
            const status = (t.status || '').toUpperCase();
            // OK → success, NG → failed, others (Pending/In Progress/Waiting/-) → success bucket
            // because template only has 2 buckets. Tasks not OK/NG go to success-as-in-progress.
            if (status === 'NG') failed.push(t);
            else success.push(t);
        });

        let n = 0;
        success.forEach((t) => {
            n++;
            const remark = t.remark && t.remark !== '-' ? ` — ${t.remark}` : '';
            parts.push(`✅${n}. ${t.detail}${remark}`);
        });
        failed.forEach((t) => {
            n++;
            const remark = t.remark && t.remark !== '-' ? ` — ${t.remark}` : '';
            parts.push(`❌${n}. ${t.detail}${remark}`);
        });
        if (n === 0) parts.push('- ไม่มีรายการ -');

        parts.push(SEPARATOR);

        // Tomorrow plans
        parts.push('🔵 **แผนงานของวันพรุ่งนี้**');
        const plans = data.tomorrowPlans.filter(p => p && p.trim());
        if (plans.length === 0) {
            parts.push('- ไม่มีแผน -');
        } else {
            plans.forEach((p, i) => parts.push(`${i + 1}. ${p}`));
        }

        parts.push(SEPARATOR);

        // Problems
        parts.push('🔴 **แจ้งปัญหา และทางเลือกในการแก้ไข**');
        const problems = data.problemsList.filter(p => (p.problem && p.problem.trim()) || (p.solution && p.solution.trim()));
        if (problems.length === 0) {
            parts.push('- ไม่มี -');
        } else {
            problems.forEach((p, i) => {
                parts.push(`⛔${i + 1}. ปัญหาที่พบ: ${p.problem || '-'}`);
                parts.push(`🛠️ วิธีแก้ไข: ${p.solution || '-'}`);
            });
        }

        parts.push(SEPARATOR);

        // Notes
        parts.push('📋 **หมายเหตุ**');
        const help = (data.helpNeeded || '').trim();
        const sug = (data.suggestions || '').trim();
        parts.push(`1. ต้องการความช่วยเหลือ: ${help || '-'}`);
        parts.push(`2. ข้อเสนอแนะ: ${sug || '-'}`);

        return parts.join('\n').trim();
    }

    save() {
        const data = this.getState();
        storageManager.saveReportData(data);
    }

    load() {
        const data = storageManager.loadReportData();

        if (data) {
            // Backward compatibility: convert old single `problems` string to list
            let problemsList = data.problemsList;
            if (!Array.isArray(problemsList) && typeof data.problems === 'string' && data.problems.trim()) {
                problemsList = [{ problem: data.problems.trim(), solution: '' }];
            }

            this.state = {
                reportDate: data.reportDate || formatDateISO(new Date()),
                workBom: data.workBom || '',
                projectName: data.projectName || '',
                tomorrowPlans: Array.isArray(data.tomorrowPlans) ? data.tomorrowPlans : [],
                problemsList: Array.isArray(problemsList) ? problemsList : [],
                helpNeeded: data.helpNeeded || '',
                suggestions: data.suggestions || ''
            };

            if (data.tasks && data.tasks.length > 0) {
                taskManager.setTasks(data.tasks);
            } else {
                taskManager.addTask();
            }

            this.notifyListeners();
            return true;
        }

        taskManager.addTask();
        return false;
    }

    saveToHistory() {
        const data = this.getState();
        return storageManager.saveToHistory(data);
    }

    restoreFromHistory(historyData) {
        // BC for old `problems` string
        let problemsList = historyData.problemsList;
        if (!Array.isArray(problemsList) && typeof historyData.problems === 'string' && historyData.problems.trim()) {
            problemsList = [{ problem: historyData.problems.trim(), solution: '' }];
        }

        this.state = {
            reportDate: historyData.reportDate || formatDateISO(new Date()),
            workBom: historyData.workBom || '',
            projectName: historyData.projectName || '',
            tomorrowPlans: Array.isArray(historyData.tomorrowPlans) ? historyData.tomorrowPlans : [],
            problemsList: Array.isArray(problemsList) ? problemsList : [],
            helpNeeded: historyData.helpNeeded || '',
            suggestions: historyData.suggestions || ''
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
     * Clear only tasks/plans/problems/notes — keep header (date/bom/project)
     */
    clearTasks() {
        this.state.tomorrowPlans = [];
        this.state.problemsList = [];
        this.state.helpNeeded = '';
        this.state.suggestions = '';
        taskManager.clearTasks();
        taskManager.addTask();

        this.notifyListeners();
        this.save();
    }

    resetAll() {
        this.state = {
            reportDate: formatDateISO(new Date()),
            workBom: '',
            projectName: '',
            tomorrowPlans: [],
            problemsList: [],
            helpNeeded: '',
            suggestions: ''
        };

        taskManager.clearTasks();
        taskManager.addTask();

        this.notifyListeners();
        this.save();
    }

    getSummary() {
        return {
            hasWorkBom: !!this.state.workBom,
            hasProjectName: !!this.state.projectName,
            tasksSummary: taskManager.getSummary()
        };
    }

    export() {
        return {
            version: '2.0',
            exportDate: new Date().toISOString(),
            data: this.getState()
        };
    }

    import(importData) {
        try {
            if (!importData.data) throw new Error('Invalid import format');
            this.restoreFromHistory(importData.data);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

export const reportManager = new ReportManager();
