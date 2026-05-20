/**
 * Main Application
 * Initialize and wire up all components
 */

import { reportManager } from "./ReportManager.js";
import { taskManager } from "./TaskManager.js";
import { storageManager } from "./StorageManager.js";
import { uiManager } from "./UIManager.js";
import {
  copyToClipboard,
  showValidationError,
  clearValidationError,
  escapeHTML,
  formatDateISO,
} from "./utils.js";

class App {
  constructor() {
    this.pendingAction = null;
    this.pendingRestoreData = null;
    this.pendingRemoveIndex = null;
    this.lastDeletedTask = null;
    this.undoTimeout = null;
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupManagers();
    this.loadInitialData();
    console.info("Report Generator initialized successfully");
  }

  cacheElements() {
    this.elements = {
      reportDate: document.getElementById("reportDate"),
      workBom: document.getElementById("workBom"),
      projectName: document.getElementById("projectName"),
      helpNeeded: document.getElementById("helpNeeded"),
      suggestions: document.getElementById("suggestions"),
      output: document.getElementById("output"),
      taskList: document.getElementById("task-list"),
      taskCount: document.getElementById("taskCount"),
      planList: document.getElementById("plan-list"),
      problemList: document.getElementById("problem-list"),

      // Buttons
      copyButton: document.getElementById("copyButton"),
      addTaskButton: document.getElementById("addTaskButton"),
      addPlanButton: document.getElementById("addPlanButton"),
      addProblemButton: document.getElementById("addProblemButton"),
      clearTasksBtn: document.getElementById("clearTasksBtn"),
      resetAllBtn: document.getElementById("resetAllBtn"),
      themeToggle: document.getElementById("themeToggle"),
      historyBtn: document.getElementById("historyBtn"),
      exportBtn: document.getElementById("exportBtn"),
      importBtn: document.getElementById("importBtn"),
      importFile: document.getElementById("importFile"),
      shareLineBtn: document.getElementById("shareLineBtn"),
      exportMdBtn: document.getElementById("exportMdBtn"),
      printBtn: document.getElementById("printBtn"),

      // Modal elements
      confirmModalBtn: document.getElementById("confirmModalBtn"),
      cancelModalBtn: document.getElementById("cancelModalBtn"),
      closeHistoryBtn: document.getElementById("closeHistoryBtn"),
    };
  }

  setupEventListeners() {
    // Header fields
    this.elements.reportDate?.addEventListener("change", (e) => {
      reportManager.setState({ reportDate: e.target.value });
    });
    this.elements.workBom?.addEventListener("input", (e) => {
      reportManager.setState({ workBom: e.target.value });
      clearValidationError(e.target);
    });
    this.elements.projectName?.addEventListener("input", (e) => {
      reportManager.setState({ projectName: e.target.value });
      clearValidationError(e.target);
    });
    this.elements.helpNeeded?.addEventListener("input", (e) => {
      reportManager.setState({ helpNeeded: e.target.value });
    });
    this.elements.suggestions?.addEventListener("input", (e) => {
      reportManager.setState({ suggestions: e.target.value });
    });

    // Action buttons
    this.elements.copyButton?.addEventListener("click", () => this.handleCopy());
    this.elements.addTaskButton?.addEventListener("click", () => this.handleAddTask());
    this.elements.addPlanButton?.addEventListener("click", () => this.handleAddPlan());
    this.elements.addProblemButton?.addEventListener("click", () => this.handleAddProblem());
    this.elements.clearTasksBtn?.addEventListener("click", () => this.handleClearTasks());
    this.elements.resetAllBtn?.addEventListener("click", () => this.handleResetAll());
    this.elements.themeToggle?.addEventListener("click", () => this.handleThemeToggle());
    this.elements.historyBtn?.addEventListener("click", () => this.handleShowHistory());

    // Share / Export
    this.elements.shareLineBtn?.addEventListener("click", () => this.handleShareLine());
    this.elements.exportMdBtn?.addEventListener("click", () => this.handleExportMarkdown());
    this.elements.printBtn?.addEventListener("click", () => this.handlePrint());

    // JSON Export / Import
    this.elements.exportBtn?.addEventListener("click", () => this.handleExport());
    this.elements.importBtn?.addEventListener("click", () => this.elements.importFile?.click());
    this.elements.importFile?.addEventListener("change", (e) => this.handleImport(e));

    // Modal buttons
    this.elements.confirmModalBtn?.addEventListener("click", () => this.handleConfirm());
    this.elements.cancelModalBtn?.addEventListener("click", () => this.handleCancelModal());
    this.elements.closeHistoryBtn?.addEventListener("click", () => this.handleCloseHistory());

    // Task list delegation
    this.elements.taskList?.addEventListener("click", (e) => this.handleTaskAction(e));

    // Click outside modal to close
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        uiManager.closeAllModals();
      }
    });

    document.addEventListener("keydown", (e) => this.handleKeyboardShortcuts(e));
  }

  setupManagers() {
    uiManager.init();
    reportManager.onChange((state) => {
      this.updateFormFromState(state);
      this.renderPlans();
      this.renderProblems();
    });
    const savedTheme = storageManager.getTheme();
    uiManager.updateTheme(savedTheme);
  }

  loadInitialData() {
    reportManager.load();
    this.renderTasks();
    this.renderPlans();
    this.renderProblems();
  }

  // --- Tasks ---
  renderTasks() {
    const tasks = taskManager.getTasks();
    uiManager.renderTasks(tasks, (index, updates) => {
      if (updates === "addNew") {
        this.handleAddTask();
      } else if (index === "reorder") {
        taskManager.moveTaskTo(updates.from, updates.to);
        this.renderTasks();
      } else {
        taskManager.updateTask(index, updates);
      }
    });

    const rows = document.querySelectorAll(".task-card");
    rows.forEach((row, index) => {
      const moveDownBtn = row.querySelector(".move-down-btn");
      if (moveDownBtn) moveDownBtn.disabled = index === rows.length - 1;
    });

    if (this.elements.taskCount) {
      this.elements.taskCount.textContent = tasks.length;
    }
  }

  // --- Plans ---
  renderPlans() {
    const plans = reportManager.state.tomorrowPlans;
    uiManager.renderPlans(plans, {
      onUpdate: (i, text) => reportManager.updatePlan(i, text),
      onRemove: (i) => {
        reportManager.removePlan(i);
        this.renderPlans();
      },
      onAddNew: () => this.handleAddPlan(),
    });
  }

  handleAddPlan() {
    reportManager.addPlan("");
    this.renderPlans();
    setTimeout(() => {
      const rows = document.querySelectorAll("#plan-list .line-card");
      rows[rows.length - 1]?.querySelector(".line-input")?.focus();
    }, 50);
  }

  // --- Problems ---
  renderProblems() {
    const problems = reportManager.state.problemsList;
    uiManager.renderProblems(problems, {
      onUpdate: (i, updates) => reportManager.updateProblem(i, updates),
      onRemove: (i) => {
        reportManager.removeProblem(i);
        this.renderProblems();
      },
    });
  }

  handleAddProblem() {
    reportManager.addProblem("", "");
    this.renderProblems();
    setTimeout(() => {
      const rows = document.querySelectorAll("#problem-list .problem-card");
      rows[rows.length - 1]?.querySelector(".problem-input")?.focus();
    }, 50);
  }

  // --- Form sync from state ---
  updateFormFromState(state) {
    if (this.elements.reportDate) {
      this.elements.reportDate.value = state.reportDate || formatDateISO(new Date());
    }
    if (this.elements.workBom) this.elements.workBom.value = state.workBom || "";
    if (this.elements.projectName) this.elements.projectName.value = state.projectName || "";
    if (this.elements.helpNeeded) this.elements.helpNeeded.value = state.helpNeeded || "";
    if (this.elements.suggestions) this.elements.suggestions.value = state.suggestions || "";
  }

  // --- Copy & report generation ---
  async handleCopy() {
    const validation = reportManager.validate();

    if (!validation.valid) {
      validation.errors.forEach((error) => {
        if (error.field === "workBom") {
          showValidationError(this.elements.workBom, error.message);
        } else if (error.field === "projectName") {
          showValidationError(this.elements.projectName, error.message);
        }
      });
      uiManager.showToast("❌ กรุณาแก้ไขข้อมูลให้ถูกต้อง", 3000);
      return;
    }

    reportManager.saveToHistory();
    const reportText = reportManager.generateReport();
    if (this.elements.output) this.elements.output.value = reportText;

    const success = await copyToClipboard(reportText);
    uiManager.showToast(
      success ? "✅ คัดลอกเรียบร้อยพร้อมวาง!" : "❌ ไม่สามารถคัดลอกได้",
      3000,
    );
  }

  // --- Share LINE ---
  handleShareLine() {
    const reportText = reportManager.generateReport();
    if (this.elements.output) this.elements.output.value = reportText;

    // LINE Share URL — limits ~10k chars, opens picker (chat / OA / timeline)
    const url = "https://line.me/R/share?text=" + encodeURIComponent(reportText);
    window.open(url, "_blank", "noopener");
    uiManager.showToast("💬 เปิดหน้าต่างแชร์ LINE...", 2500);
  }

  // --- Export Markdown ---
  handleExportMarkdown() {
    const reportText = reportManager.generateReport();
    if (this.elements.output) this.elements.output.value = reportText;

    const state = reportManager.getState();
    const fname = `report-${state.reportDate || formatDateISO(new Date())}.md`;

    const blob = new Blob([reportText + "\n"], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    uiManager.showToast(`✅ บันทึก ${fname}`, 3000);
  }

  // --- Print / PDF ---
  handlePrint() {
    const reportText = reportManager.generateReport();
    if (this.elements.output) this.elements.output.value = reportText;

    const w = window.open("", "_blank", "noopener,width=800,height=900");
    if (!w) {
      uiManager.showToast("❌ Popup ถูกบล็อก — อนุญาตแล้วลองใหม่", 3000);
      return;
    }
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<title>Report</title>
<style>
  body { font-family: "Sarabun", "Tahoma", sans-serif; font-size: 14px; line-height: 1.6; padding: 24px; color: #222; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
  @media print { body { padding: 0; } }
</style></head><body><pre>${escapeHTML(reportText)}</pre>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  }

  // --- Tasks add / remove ---
  handleAddTask() {
    taskManager.addTask();
    this.renderTasks();
    setTimeout(() => {
      const rows = document.querySelectorAll(".task-card");
      rows[rows.length - 1]?.querySelector(".task-detail")?.focus();
    }, 50);
  }

  handleTaskAction(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = btn.closest(".task-card");
    if (!row) return;
    const index = parseInt(row.dataset.index);

    if (btn.classList.contains("remove-task-button")) {
      this.pendingRemoveIndex = index;
      this.pendingAction = "removeTask";
      const task = taskManager.getTasks()[index];
      const taskLabel = task.detail
        ? task.detail.substring(0, 30) + (task.detail.length > 30 ? "..." : "")
        : `งานที่ ${index + 1}`;
      uiManager.showModal("confirm", {
        icon: "🗑️",
        title: "ลบรายการงาน?",
        description: `ต้องการลบ <b>${escapeHTML(taskLabel)}</b> ใช่หรือไม่?`,
        confirmText: "ลบ",
      });
    } else if (btn.classList.contains("move-up-btn")) {
      taskManager.moveTaskUp(index);
      this.renderTasks();
    } else if (btn.classList.contains("move-down-btn")) {
      taskManager.moveTaskDown(index);
      this.renderTasks();
    }
  }

  handleClearTasks() {
    this.pendingAction = "clearTasks";
    uiManager.showModal("confirm", {
      icon: "🧹",
      title: "ล้างเฉพาะงาน?",
      description:
        "BOM/Project/วันที่ จะยังอยู่<br>แต่งาน/แผน/ปัญหา/หมายเหตุจะถูกลบ",
      confirmText: "ยืนยัน",
    });
  }

  handleResetAll() {
    this.pendingAction = "resetAll";
    uiManager.showModal("confirm", {
      icon: "🗑️",
      title: "ล้างข้อมูลทั้งหมด?",
      description: "ข้อมูลทั้งหมดจะหายไป<br>ต้องการเริ่มใหม่ใช่หรือไม่?",
      confirmText: "ยืนยัน",
    });
  }

  handleThemeToggle() {
    const newTheme = uiManager.toggleTheme();
    storageManager.saveTheme(newTheme);
  }

  handleShowHistory() {
    const history = storageManager.loadHistory();
    uiManager.renderHistory(history, (item) => {
      this.pendingRestoreData = item.data;
      this.pendingAction = "restoreHistory";
      uiManager.showModal("confirm", {
        type: "restore",
        icon: "📂",
        title: "โหลดรีพอร์ตเก่า?",
        description: `ต้องการกู้คืนข้อมูลจากวันที่<br><b>${escapeHTML(item.timestamp)}</b> ใช่หรือไม่?<br>(ข้อมูลปัจจุบันจะถูกแทนที่)`,
        confirmText: "โหลดข้อมูล",
      });
    });
    uiManager.showModal("history");
  }

  handleConfirm() {
    if (this.pendingAction === "resetAll") {
      reportManager.resetAll();
      this.renderTasks();
      this.renderPlans();
      this.renderProblems();
      if (this.elements.output) this.elements.output.value = "";
    } else if (this.pendingAction === "clearTasks") {
      reportManager.clearTasks();
      this.renderTasks();
      this.renderPlans();
      this.renderProblems();
      if (this.elements.output) this.elements.output.value = "";
    } else if (this.pendingAction === "restoreHistory") {
      if (this.pendingRestoreData) {
        reportManager.restoreFromHistory(this.pendingRestoreData);
        this.renderTasks();
        this.renderPlans();
        this.renderProblems();
        uiManager.hideModal("history");
      }
    } else if (this.pendingAction === "removeTask") {
      if (this.pendingRemoveIndex !== null) {
        const tasks = taskManager.getTasks();
        const deleted = { ...tasks[this.pendingRemoveIndex] };
        const deletedIndex = this.pendingRemoveIndex;
        taskManager.removeTask(this.pendingRemoveIndex);
        this.renderTasks();
        this.showUndoToast(deleted, deletedIndex);
      }
    } else if (this.pendingAction === "importData") {
      if (this.pendingImportData) {
        // Support both wrapped {data:...} and raw data
        const payload = this.pendingImportData.data ? this.pendingImportData.data : this.pendingImportData;
        reportManager.restoreFromHistory(payload);
        this.pendingImportData = null;
        this.renderTasks();
        this.renderPlans();
        this.renderProblems();
        uiManager.showToast("✅ นำเข้าข้อมูลเรียบร้อย", 3000);
      }
    }

    uiManager.hideModal("confirm");
    this.pendingAction = null;
    this.pendingRestoreData = null;
    this.pendingRemoveIndex = null;
  }

  handleCancelModal() {
    uiManager.hideModal("confirm");
    this.pendingAction = null;
    this.pendingRestoreData = null;
    this.pendingRemoveIndex = null;
  }

  handleCloseHistory() {
    uiManager.hideModal("history");
  }

  showUndoToast(task, index) {
    this.lastDeletedTask = { task, index };
    if (this.undoTimeout) clearTimeout(this.undoTimeout);

    uiManager.showUndoToast("🗑️ ลบรายการแล้ว", 5000, () => {
      if (this.lastDeletedTask) {
        taskManager.insertTask(this.lastDeletedTask.index, this.lastDeletedTask.task);
        this.renderTasks();
        this.lastDeletedTask = null;
        uiManager.showToast("↩️ ย้อนกลับเรียบร้อย", 2000);
      }
    });

    this.undoTimeout = setTimeout(() => {
      this.lastDeletedTask = null;
    }, 5000);
  }

  // --- JSON export / import ---
  handleExport() {
    const data = reportManager.export();
    if (!data || !data.data) {
      uiManager.showToast("❌ ไม่มีข้อมูลให้ส่งออก", 3000);
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${data.data.reportDate || new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    uiManager.showToast("✅ ส่งออกข้อมูล JSON", 3000);
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        this.pendingImportData = data;
        this.pendingAction = "importData";
        uiManager.showModal("confirm", {
          icon: "📤",
          title: "นำเข้าข้อมูล?",
          description:
            "ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากไฟล์<br>ต้องการดำเนินการใช่หรือไม่?",
          confirmText: "นำเข้า",
        });
      } catch (err) {
        uiManager.showToast("❌ ไฟล์ไม่ถูกต้อง", 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      this.handleCopy();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "N" || e.key === "n")) {
      e.preventDefault();
      this.handleAddTask();
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    app.init();
  });
} else {
  const app = new App();
  app.init();
}
