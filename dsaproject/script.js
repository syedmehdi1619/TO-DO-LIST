let tasks = [];
let taskDictionary = {};
let deletedStack = [];
let deletedTasks = [];

let currentFilter = 'all';
let currentSort = 'none';
let editTaskId = null;
let currentTheme = 'light';

// Custom Hash Table Class for O(1) Search Indexing
class HashTable {
    constructor(size = 97) {
        this.size = size;
        this.buckets = Array.from({ length: size }, () => []);
    }

    _hash(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 31 + key.charCodeAt(i)) % this.size;
        }
        return hash;
    }

    insert(key, task) {
        const cleanKey = key.trim().toLowerCase();
        const bucket = this.buckets[this._hash(cleanKey)];
        const existingPair = bucket.find(pair => pair.key === cleanKey);
        if (existingPair) {
            if (!existingPair.value.some(t => t.id === task.id)) {
                existingPair.value.push(task);
            }
        } else {
            bucket.push({ key: cleanKey, value: [task] });
        }
    }

    remove(key, taskId) {
        const cleanKey = key.trim().toLowerCase();
        const bucket = this.buckets[this._hash(cleanKey)];
        const pairIndex = bucket.findIndex(pair => pair.key === cleanKey);
        if (pairIndex !== -1) {
            const pair = bucket[pairIndex];
            pair.value = pair.value.filter(t => t.id !== taskId);
            if (pair.value.length === 0) {
                bucket.splice(pairIndex, 1);
            }
        }
    }

    get(key) {
        const cleanKey = key.trim().toLowerCase();
        const pair = this.buckets[this._hash(cleanKey)].find(pair => pair.key === cleanKey);
        return pair ? pair.value : [];
    }
}

let taskSearchTable = new HashTable();

// DOM Elements Cache
const $ = id => document.getElementById(id);
const taskForm = $('task-form');
const taskNameInput = $('task-name');
const taskDescInput = $('task-desc');
const taskDueDateInput = $('task-due-date');
const taskCategorySelect = $('task-category');
const taskPrioritySelect = $('task-priority');
const taskAssigneeInput = $('task-assignee');
const addTaskBtn = $('add-task-btn');

const totalTasksCount = $('total-tasks-count');
const completedTasksCount = $('completed-tasks-count');
const pendingTasksCount = $('pending-tasks-count');
const completionPercentage = $('completion-percentage');
const progressBarFill = $('progress-bar-fill');
const progressPercentageText = $('progress-percentage-text');

const searchNameInput = $('search-name');
const searchCategorySelect = $('search-category');
const searchAssigneeInput = $('search-assignee');

const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = $('sort-select');

const undoDeleteBtn = $('undo-delete-btn');
const undoStatusMsg = $('undo-status-msg');
const taskListContainer = $('task-list');
const emptyStateDiv = $('empty-state');
const currentDateSpan = $('current-date');
const themeToggleBtn = $('theme-toggle-btn');

const sidePanel = $('task-creation-container');
const openDrawerBtn = $('open-drawer-btn');
const cancelDrawerBtn = $('cancel-task-btn');

const deletedSidePanel = $('deleted-tasks-container');
const openDeletedBtn = $('open-deleted-btn');
const closeDeletedBtn = $('close-deleted-btn');
const deletedTasksListContainer = $('deleted-tasks-list');

const indexSidePanel = $('index-container');
const openIndexBtn = $('open-index-btn');
const closeIndexBtn = $('close-index-btn');
const indexListContainer = $('index-list');

document.addEventListener('DOMContentLoaded', () => {
    displayCurrentDate();
    initializeTheme();
    loadTasksFromLocalStorage();
    loadDeletedTasksFromLocalStorage();
    setupEventListeners();
    updateDashboard();
    renderTasks();
});

function displayCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateSpan.textContent = today.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    taskForm.addEventListener('submit', handleFormSubmit);

    searchNameInput.addEventListener('input', renderTasks);
    searchCategorySelect.addEventListener('change', renderTasks);
    searchAssigneeInput.addEventListener('input', renderTasks);

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    undoDeleteBtn.addEventListener('click', undoDeleteTask);
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    // Bind drawer panel controls
    if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => openDrawerPanel('task-creation-container'));
    if (cancelDrawerBtn) cancelDrawerBtn.addEventListener('click', () => closeDrawerPanel('task-creation-container'));

    if (openDeletedBtn) {
        openDeletedBtn.addEventListener('click', () => {
            renderDeletedTasks();
            openDrawerPanel('deleted-tasks-container');
        });
    }
    if (closeDeletedBtn) closeDeletedBtn.addEventListener('click', () => closeDrawerPanel('deleted-tasks-container'));

    if (openIndexBtn) {
        openIndexBtn.addEventListener('click', () => {
            renderIndex();
            openDrawerPanel('index-container');
        });
    }
    if (closeIndexBtn) closeIndexBtn.addEventListener('click', () => closeDrawerPanel('index-container'));
}

function openDrawerPanel(drawerId) {
    document.querySelectorAll('.add-task-side-panel').forEach(panel => {
        panel.classList.remove('open');
    });

    const panel = $(drawerId);
    if (panel) {
        panel.classList.add('open');
        if (drawerId === 'task-creation-container') {
            setTimeout(() => {
                if (taskNameInput) taskNameInput.focus();
            }, 300);
        }
    }
}

function closeDrawerPanel(drawerId) {
    const panel = $(drawerId);
    if (panel) {
        panel.classList.remove('open');
    }
    if (drawerId === 'task-creation-container') {
        taskForm.reset();
        resetEditMode();
    }
}

function initializeTheme() {
    currentTheme = localStorage.getItem('tms_theme') || 'light';
    applyTheme(currentTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('tms_theme', currentTheme);
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
    }
}

// Helper to generate search index keys for tasks
function getTaskSearchKeys(task) {
    const keys = new Set();
    const cleanWords = str => str ? str.trim().toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean) : [];

    if (task.name) {
        keys.add("name:" + task.name.trim().toLowerCase());
        cleanWords(task.name).forEach(w => keys.add("word:" + w));
    }
    if (task.description) {
        cleanWords(task.description).forEach(w => keys.add("word:" + w));
    }
    if (task.category) {
        keys.add("category:" + task.category.trim().toLowerCase());
    }
    if (task.assignedTo && task.assignedTo !== 'Unassigned') {
        const assignee = task.assignedTo.trim().toLowerCase();
        keys.add("assignee:" + assignee);
        cleanWords(task.assignedTo).forEach(w => keys.add("assignee_word:" + w));
    }
    return Array.from(keys);
}

function insertTaskIntoSearchTable(task) {
    getTaskSearchKeys(task).forEach(key => taskSearchTable.insert(key, task));
}

function removeTaskFromSearchTable(task) {
    getTaskSearchKeys(task).forEach(key => taskSearchTable.remove(key, task.id));
}

function handleFormSubmit(e) {
    e.preventDefault();

    const name = taskNameInput.value.trim();
    const description = taskDescInput.value.trim();
    const dueDate = taskDueDateInput.value;
    const category = taskCategorySelect.value;
    const priority = taskPrioritySelect.value;
    const assignee = taskAssigneeInput.value.trim() || 'Unassigned';

    if (!name || !dueDate || !category) {
        alert("Please fill in all required fields marked with *");
        return;
    }

    if (editTaskId) {
        updateExistingTask(editTaskId, { name, description, dueDate, category, priority, assignee });
    } else {
        createNewTask(name, description, dueDate, category, priority, assignee);
    }

    saveTasksToLocalStorage();
    updateDashboard();
    renderTasks();
    closeDrawerPanel('task-creation-container');
}

function createNewTask(name, description, dueDate, category, priority, assignee) {
    const task = {
        id: Date.now().toString(),
        name,
        description,
        dueDate,
        category,
        priority: priority || 'None',
        assignedTo: assignee,
        completed: false
    };

    tasks.push(task);
    taskDictionary[task.id] = task;
    insertTaskIntoSearchTable(task);
}

function updateExistingTask(id, fields) {
    const task = taskDictionary[id];
    if (task) {
        removeTaskFromSearchTable(task);
        task.name = fields.name;
        task.description = fields.description;
        task.dueDate = fields.dueDate;
        task.category = fields.category;
        task.priority = fields.priority;
        task.assignedTo = fields.assignee;
        insertTaskIntoSearchTable(task);
    }
}

function resetEditMode() {
    editTaskId = null;
    addTaskBtn.textContent = 'Add Task';
    addTaskBtn.classList.remove('update-mode');
    if (taskPrioritySelect) taskPrioritySelect.value = '';
}

function toggleTaskCompletion(id) {
    const task = taskDictionary[id];
    if (task) {
        task.completed = !task.completed;
        saveTasksToLocalStorage();
        updateDashboard();
        renderTasks();
    }
}

// Stack-based task deletion and restoration system
function deleteTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const taskToDelete = tasks[taskIndex];
    const action = { task: taskToDelete, index: taskIndex };

    deletedStack.push(action);
    deletedTasks.push(action);
    saveDeletedTasksToLocalStorage();

    tasks.splice(taskIndex, 1);
    delete taskDictionary[id];
    removeTaskFromSearchTable(taskToDelete);

    updateUndoUI();
    saveTasksToLocalStorage();
    updateDashboard();
    renderTasks();
}

function restoreTask(action) {
    const restoredTask = action.task;
    tasks.splice(action.index, 0, restoredTask);
    taskDictionary[restoredTask.id] = restoredTask;
    insertTaskIntoSearchTable(restoredTask);

    deletedTasks = deletedTasks.filter(item => item.task.id !== restoredTask.id);
    deletedStack = deletedStack.filter(item => item.task.id !== restoredTask.id);

    saveDeletedTasksToLocalStorage();
    saveTasksToLocalStorage();
    updateUndoUI();
    updateDashboard();
    renderTasks();
}

function undoDeleteTask() {
    if (deletedStack.length === 0) return;
    restoreTask(deletedStack.pop());
}

function updateUndoUI() {
    if (deletedStack.length > 0) {
        undoDeleteBtn.disabled = false;
        undoStatusMsg.textContent = `Undo delete: "${deletedStack[deletedStack.length - 1].task.name}"`;
    } else {
        undoDeleteBtn.disabled = true;
        undoStatusMsg.textContent = "No actions to undo";
    }
}

function startEditTask(id) {
    const task = taskDictionary[id];
    if (!task) return;

    editTaskId = id;
    taskNameInput.value = task.name;
    taskDescInput.value = task.description || '';
    taskDueDateInput.value = task.dueDate;
    taskCategorySelect.value = task.category;
    if (taskPrioritySelect) {
        taskPrioritySelect.value = task.priority && task.priority !== 'None' ? task.priority : '';
    }
    taskAssigneeInput.value = task.assignedTo === 'Unassigned' ? '' : task.assignedTo;

    addTaskBtn.textContent = 'Update Task';
    addTaskBtn.classList.add('update-mode');
    openDrawerPanel('task-creation-container');
}

// Search algorithm using O(1) custom Hash Table search index keys
function performHashTableSearch(nameQuery, categoryQuery, assigneeQuery) {
    let matchedTasks = null;

    const intersect = (curr, next) => {
        if (curr === null) return next;
        const nextIds = new Set(next.map(t => t.id));
        return curr.filter(t => nextIds.has(t.id));
    };

    if (nameQuery) {
        const q = nameQuery.trim().toLowerCase();
        const exact = taskSearchTable.get("name:" + q);
        let wordResults = null;

        q.split(/\s+/).forEach(word => {
            const w = word.replace(/[^a-z0-9]/g, '');
            if (w) wordResults = intersect(wordResults, taskSearchTable.get("word:" + w));
        });

        const combined = [...exact];
        const exactIds = new Set(exact.map(t => t.id));
        (wordResults || []).forEach(t => {
            if (!exactIds.has(t.id)) combined.push(t);
        });

        matchedTasks = intersect(matchedTasks, combined);
    }

    if (categoryQuery) {
        const categoryTasks = taskSearchTable.get("category:" + categoryQuery.trim().toLowerCase());
        matchedTasks = intersect(matchedTasks, categoryTasks);
    }

    if (assigneeQuery) {
        const q = assigneeQuery.trim().toLowerCase();
        const exact = taskSearchTable.get("assignee:" + q);
        let wordResults = null;

        q.split(/\s+/).forEach(word => {
            const w = word.replace(/[^a-z0-9]/g, '');
            if (w) wordResults = intersect(wordResults, taskSearchTable.get("assignee_word:" + w));
        });

        const combined = [...exact];
        const exactIds = new Set(exact.map(t => t.id));
        (wordResults || []).forEach(t => {
            if (!exactIds.has(t.id)) combined.push(t);
        });

        matchedTasks = intersect(matchedTasks, combined);
    }

    if (matchedTasks === null) return [...tasks];

    const matchedIds = new Set(matchedTasks.map(t => t.id));
    return tasks.filter(t => matchedIds.has(t.id));
}

// Sorting Algorithm: Merge Sort Implementation
const comparators = {
    dueDate: (a, b) => a.dueDate.localeCompare(b.dueDate),
    category: (a, b) => a.category.localeCompare(b.category),
    status: (a, b) => a.completed - b.completed,
    name: (a, b) => a.name.localeCompare(b.name),
    priority: (a, b) => {
        const weights = { high: 3, medium: 2, low: 1 };
        return (weights[b.priority?.toLowerCase()] || 0) - (weights[a.priority?.toLowerCase()] || 0);
    }
};

function performMergeSort(arr, criterion) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    return merge(performMergeSort(arr.slice(0, mid), criterion), performMergeSort(arr.slice(mid), criterion), criterion);
}

function merge(left, right, criterion) {
    const result = [];
    let l = 0, r = 0;
    const compare = comparators[criterion];
    while (l < left.length && r < right.length) {
        if (compare(left[l], right[r]) <= 0) {
            result.push(left[l++]);
        } else {
            result.push(right[r++]);
        }
    }
    return [...result, ...left.slice(l), ...right.slice(r)];
}

function renderTasks() {
    taskListContainer.innerHTML = '';

    const nameQuery = searchNameInput.value.trim();
    const categoryQuery = searchCategorySelect.value;
    const assigneeQuery = searchAssigneeInput.value.trim();
    let filteredList = performHashTableSearch(nameQuery, categoryQuery, assigneeQuery);

    filteredList = filteredList.filter(task => {
        if (currentFilter === 'completed') return task.completed;
        if (currentFilter === 'pending') return !task.completed;
        return true;
    });

    if (currentSort !== 'none') {
        filteredList = performMergeSort(filteredList, currentSort);
    }

    if (filteredList.length === 0) {
        emptyStateDiv.style.display = 'flex';
        return;
    }
    emptyStateDiv.style.display = 'none';

    filteredList.forEach((task, index) => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.setAttribute('data-category', task.category);
        item.id = `task-card-${task.id}`;

        item.innerHTML = `
            <div class="task-serial">${index + 1}</div>
            <div class="task-main">
                <div class="task-title-row">
                    <div class="task-title-checkbox">
                        <input type="checkbox" id="check-${task.id}" class="completion-checkbox" 
                               ${task.completed ? 'checked' : ''} onclick="toggleTaskCompletion('${task.id}')">
                        <label for="check-${task.id}" class="task-title">${escapeHTML(task.name)}</label>
                    </div>
                    <div class="task-actions">
                        <button class="edit-btn" onclick="startEditTask('${task.id}')" title="Edit Task">✎</button>
                        <button class="delete-btn" onclick="deleteTask('${task.id}')" title="Delete Task">🗑</button>
                    </div>
                </div>
                <div class="task-details">
                    <div class="task-detail-line">
                        <span class="detail-label">Description:</span>
                        <span class="detail-val">${task.description ? escapeHTML(task.description) : '<span class="no-desc">No description provided</span>'}</span>
                    </div>
                    <div class="task-detail-line">
                        <span class="detail-label">Priority:</span>
                        <span class="detail-val">
                           <span class="task-badge-highlight ${task.priority && task.priority !== 'None' ? `badge-${task.priority.toLowerCase()}` : ''}">${task.priority || 'No Priority'}</span>
                        </span>
                    </div>
                    <div class="task-detail-line">
                        <span class="detail-label">Date:</span>
                        <span class="detail-val">${task.dueDate}</span>
                    </div>
                    <div class="task-detail-line">
                        <span class="detail-label">Category:</span>
                        <span class="detail-val">
                            <span class="task-badge-highlight badge-${task.category.toLowerCase()}">${task.category}</span>
                        </span>
                    </div>
                    ${task.assignedTo && task.assignedTo !== 'Unassigned' ? `
                    <div class="task-detail-line">
                        <span class="detail-label">Assignee:</span>
                        <span class="detail-val">${escapeHTML(task.assignedTo)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        taskListContainer.appendChild(item);
    });
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    totalTasksCount.textContent = total;
    completedTasksCount.textContent = completed;
    pendingTasksCount.textContent = pending;
    completionPercentage.textContent = `${percentage}%`;
    progressPercentageText.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
}

// Local Storage Persistence
function saveTasksToLocalStorage() {
    localStorage.setItem('tms_tasks', JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
    try {
        tasks = JSON.parse(localStorage.getItem('tms_tasks')) || [];
        taskDictionary = {};
        taskSearchTable = new HashTable();
        tasks.forEach(task => {
            taskDictionary[task.id] = task;
            insertTaskIntoSearchTable(task);
        });
    } catch (e) {
        console.error("Error reading LocalStorage tasks database: ", e);
        tasks = [];
        taskDictionary = {};
        taskSearchTable = new HashTable();
    }
}

function saveDeletedTasksToLocalStorage() {
    localStorage.setItem('tms_deleted_tasks', JSON.stringify(deletedTasks));
}

function loadDeletedTasksFromLocalStorage() {
    try {
        deletedTasks = JSON.parse(localStorage.getItem('tms_deleted_tasks')) || [];
        deletedStack = [...deletedTasks];
        updateUndoUI();
    } catch (e) {
        console.error("Error reading LocalStorage deleted tasks database: ", e);
        deletedTasks = [];
        deletedStack = [];
    }
}

function renderDeletedTasks() {
    if (!deletedTasksListContainer) return;
    deletedTasksListContainer.innerHTML = '';

    if (deletedTasks.length === 0) {
        deletedTasksListContainer.innerHTML = `
            <div class="empty-state" style="margin-top: 10px; padding: 20px;">
                <p>No deleted tasks</p>
            </div>
        `;
        return;
    }

    deletedTasks.forEach(item => {
        const task = item.task;
        const div = document.createElement('div');
        div.className = 'deleted-task-item';
        div.innerHTML = `
            <div class="deleted-task-title">${escapeHTML(task.name)}</div>
            <div class="deleted-task-meta">
               <span>Priority: <span class="task-badge-highlight ${task.priority && task.priority !== 'None' ? `badge-${task.priority.toLowerCase()}` : ''}">${task.priority || 'No Priority'}</span></span>
                <span>Due: ${task.dueDate}</span>
            </div>
            <div class="deleted-task-actions">
                <button class="restore-btn" onclick="restoreDeletedTask('${task.id}')">Restore</button>
                <button class="perm-delete-btn" onclick="permanentlyDeleteTask('${task.id}')">Delete</button>
            </div>
        `;
        deletedTasksListContainer.appendChild(div);
    });
}

function restoreDeletedTask(id) {
    const action = deletedTasks.find(item => item.task.id === id);
    if (action) {
        restoreTask(action);
        renderDeletedTasks();
    }
}

function permanentlyDeleteTask(id) {
    deletedTasks = deletedTasks.filter(item => item.task.id !== id);
    deletedStack = deletedStack.filter(item => item.task.id !== id);
    saveDeletedTasksToLocalStorage();
    updateUndoUI();
    renderDeletedTasks();
}

function renderIndex() {
    if (!indexListContainer) return;
    indexListContainer.innerHTML = '';

    if (tasks.length === 0) {
        indexListContainer.innerHTML = `
            <div class="empty-state" style="margin-top: 10px; padding: 20px;">
                <p>No active tasks</p>
            </div>
        `;
        return;
    }

    tasks.forEach((task, index) => {
        const link = document.createElement('div');
        link.className = 'index-task-link';
        link.textContent = `${index + 1}. ${task.name}`;
        link.addEventListener('click', () => navigateToTask(task.id));
        indexListContainer.appendChild(link);
    });
}

function navigateToTask(id) {
    const taskEl = document.getElementById(`task-card-${id}`);
    if (!taskEl) {
        currentFilter = 'all';
        filterBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-filter') === 'all'));
        searchNameInput.value = '';
        searchCategorySelect.value = '';
        searchAssigneeInput.value = '';
        renderTasks();
    }

    setTimeout(() => {
        const targetEl = document.getElementById(`task-card-${id}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('highlight-task');
            setTimeout(() => targetEl.classList.remove('highlight-task'), 2500);
        }
    }, 100);

    closeDrawerPanel('index-container');
}
