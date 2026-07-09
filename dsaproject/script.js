

// Array Implementation
// Used as the primary sequential list to store, map, filter, and render tasks.
let tasks = [];

// Hash Table Implementation
let taskDictionary = {};

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
        const index = this._hash(cleanKey);
        const bucket = this.buckets[index];

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
        const index = this._hash(cleanKey);
        const bucket = this.buckets[index];

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
        const index = this._hash(cleanKey);
        const bucket = this.buckets[index];

        const pair = bucket.find(pair => pair.key === cleanKey);
        return pair ? pair.value : [];
    }
}

// Instantiate search table
let taskSearchTable = new HashTable();

// Stack Implementation (LIFO - Last In First Out)
let deletedStack = [];

// Deleted tasks array (for displaying in the Deleted Tasks Drawer)
let deletedTasks = [];

// Application State Variables
let currentFilter = 'all';       // Tracks filter tab: 'all', 'completed', 'pending'
let currentSort = 'none';        // Tracks sorting selection: 'none', 'dueDate', 'category', 'status', 'name', 'priority'
let editTaskId = null;           // Tracks the ID of the task currently being edited (null = creation mode)
let currentTheme = 'light';      // Tracks current theme: 'light' or 'dark'

// DOM Elements Cache
const taskForm = document.getElementById('task-form');
const taskNameInput = document.getElementById('task-name');
const taskDescInput = document.getElementById('task-desc');
const taskDueDateInput = document.getElementById('task-due-date');
const taskCategorySelect = document.getElementById('task-category');
const taskPrioritySelect = document.getElementById('task-priority');
const taskAssigneeInput = document.getElementById('task-assignee');
const addTaskBtn = document.getElementById('add-task-btn');

const totalTasksCount = document.getElementById('total-tasks-count');
const completedTasksCount = document.getElementById('completed-tasks-count');
const pendingTasksCount = document.getElementById('pending-tasks-count');
const completionPercentage = document.getElementById('completion-percentage');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentageText = document.getElementById('progress-percentage-text');

const searchNameInput = document.getElementById('search-name');
const searchCategorySelect = document.getElementById('search-category');
const searchAssigneeInput = document.getElementById('search-assignee');

const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sort-select');

const undoDeleteBtn = document.getElementById('undo-delete-btn');
const undoStatusMsg = document.getElementById('undo-status-msg');
const taskListContainer = document.getElementById('task-list');
const emptyStateDiv = document.getElementById('empty-state');
const currentDateSpan = document.getElementById('current-date');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Drawer Elements Cache
const sidePanel = document.getElementById('task-creation-container');
const openDrawerBtn = document.getElementById('open-drawer-btn');
const cancelDrawerBtn = document.getElementById('cancel-task-btn');

// New Drawers Elements Cache
const deletedSidePanel = document.getElementById('deleted-tasks-container');
const openDeletedBtn = document.getElementById('open-deleted-btn');
const closeDeletedBtn = document.getElementById('close-deleted-btn');
const deletedTasksListContainer = document.getElementById('deleted-tasks-list');

const indexSidePanel = document.getElementById('index-container');
const openIndexBtn = document.getElementById('open-index-btn');
const closeIndexBtn = document.getElementById('close-index-btn');
const indexListContainer = document.getElementById('index-list');


document.addEventListener('DOMContentLoaded', () => {
    // 1. Display Current Date
    displayCurrentDate();

    // 2. Initialize and Apply Saved Theme
    initializeTheme();

    // 3. Load Data from Local Storage
    loadTasksFromLocalStorage();
    loadDeletedTasksFromLocalStorage();

    // 4. Bind Event Listeners
    setupEventListeners();

    // 5. Refresh Dashboard and Render
    updateDashboard();
    renderTasks();
});

// Display today's date in a friendly notebook header style
function displayCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateSpan.textContent = today.toLocaleDateString('en-US', options);
}


function setupEventListeners() {
    // Task Form Submit (Creates or Updates a task)
    taskForm.addEventListener('submit', handleFormSubmit);

    // Instant Search Inputs (Updates layout dynamically on user keypress/change)
    searchNameInput.addEventListener('input', renderTasks);
    searchCategorySelect.addEventListener('change', renderTasks);
    searchAssigneeInput.addEventListener('input', renderTasks);

    // Sorting Dropdown Trigger
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });

    // Filtering Tabs Trigger
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all filters and apply to the clicked one
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Undo Actions Trigger
    undoDeleteBtn.addEventListener('click', undoDeleteTask);

    // Theme Toggle Trigger
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Drawer toggles
    if (openDrawerBtn) {
        openDrawerBtn.addEventListener('click', () => openDrawerPanel('task-creation-container'));
    }
    if (cancelDrawerBtn) {
        cancelDrawerBtn.addEventListener('click', () => closeDrawerPanel('task-creation-container'));
    }

    // Deleted Tasks Drawer triggers
    if (openDeletedBtn) {
        openDeletedBtn.addEventListener('click', () => {
            renderDeletedTasks();
            openDrawerPanel('deleted-tasks-container');
        });
    }
    if (closeDeletedBtn) {
        closeDeletedBtn.addEventListener('click', () => closeDrawerPanel('deleted-tasks-container'));
    }

    // Index Drawer triggers
    if (openIndexBtn) {
        openIndexBtn.addEventListener('click', () => {
            renderIndex();
            openDrawerPanel('index-container');
        });
    }
    if (closeIndexBtn) {
        closeIndexBtn.addEventListener('click', () => closeDrawerPanel('index-container'));
    }
}

// 4. DRAWER MANAGEMENT & THEME SYSTEM

function openDrawerPanel(drawerId) {
    // Close any other open drawers first
    document.querySelectorAll('.add-task-side-panel').forEach(panel => {
        panel.classList.remove('open');
    });

    const panel = document.getElementById(drawerId);
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
    const panel = document.getElementById(drawerId);
    if (panel) {
        panel.classList.remove('open');
    }
    if (drawerId === 'task-creation-container') {
        taskForm.reset();
        resetEditMode();
    }
}

// Theme handling
function initializeTheme() {
    const savedTheme = localStorage.getItem('tms_theme') || 'light';
    currentTheme = savedTheme;
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

// 5. TASK CREATION AND UPDATE LOGIC

// Search table indexing helpers
function getTaskSearchKeys(task) {
    const keys = new Set();

    // Index full name/title
    if (task.name) {
        const fullName = task.name.trim().toLowerCase();
        if (fullName) keys.add("name:" + fullName);

        // Index individual words in title
        const nameWords = fullName.split(/\s+/);
        nameWords.forEach(word => {
            const cleanWord = word.replace(/[^a-z0-9]/g, '');
            if (cleanWord) keys.add("word:" + cleanWord);
        });
    }

    // Index description words if it exists
    if (task.description) {
        const desc = task.description.trim().toLowerCase();
        const descWords = desc.split(/\s+/);
        descWords.forEach(word => {
            const cleanWord = word.replace(/[^a-z0-9]/g, '');
            if (cleanWord) keys.add("word:" + cleanWord);
        });
    }

    // Index category
    if (task.category) {
        keys.add("category:" + task.category.trim().toLowerCase());
    }

    // Index assignee
    if (task.assignedTo && task.assignedTo !== 'Unassigned') {
        const assignee = task.assignedTo.trim().toLowerCase();
        keys.add("assignee:" + assignee);

        const assigneeWords = assignee.split(/\s+/);
        assigneeWords.forEach(word => {
            const cleanWord = word.replace(/[^a-z0-9]/g, '');
            if (cleanWord) keys.add("assignee_word:" + cleanWord);
        });
    }

    return Array.from(keys);
}

function insertTaskIntoSearchTable(task) {
    const keys = getTaskSearchKeys(task);
    keys.forEach(key => {
        taskSearchTable.insert(key, task);
    });
}

function removeTaskFromSearchTable(task) {
    const keys = getTaskSearchKeys(task);
    keys.forEach(key => {
        taskSearchTable.remove(key, task.id);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();

    const name = taskNameInput.value.trim();
    const description = taskDescInput.value.trim(); // Can be empty now
    const dueDate = taskDueDateInput.value;
    const category = taskCategorySelect.value;
    const priority = taskPrioritySelect.value;
    const assignee = taskAssigneeInput.value.trim() || 'Unassigned';

    // Description is no longer required
    if (!name || !dueDate || !category || !priority) {
        alert("Please fill in all required fields marked with *");
        return;
    }

    if (editTaskId) {
        // --- EDIT MODE: Updating Existing Task ---
        updateExistingTask(editTaskId, { name, description, dueDate, category, priority, assignee });
    } else {
        // --- CREATION MODE: Create New Task ---
        createNewTask(name, description, dueDate, category, priority, assignee);
    }

    // Sync to Storage and Update UI
    saveTasksToLocalStorage();
    updateDashboard();
    renderTasks();

    // Close Drawer panel
    closeDrawerPanel('task-creation-container');
}

// Create Task logic
function createNewTask(name, description, dueDate, category, priority, assignee) {
    // Generate a unique ID using timestamp
    const id = Date.now().toString();

    // Create Task Object
    const task = {
        id,
        name,
        description,
        dueDate,
        category,
        priority,
        assignedTo: assignee,
        completed: false
    };

    // Store in Array
    tasks.push(task);

    // Store in Hash Table for O(1) lookups
    taskDictionary[id] = task;

    // Index in O(1) search table
    insertTaskIntoSearchTable(task);
}

// Update Task logic
function updateExistingTask(id, fields) {
    // Lookup task in Hash Table in O(1) time
    const task = taskDictionary[id];

    if (task) {
        // Remove old search keys from the index
        removeTaskFromSearchTable(task);

        // Update fields
        task.name = fields.name;
        task.description = fields.description;
        task.dueDate = fields.dueDate;
        task.category = fields.category;
        task.priority = fields.priority;
        task.assignedTo = fields.assignee;

        // Insert new search keys into the index
        insertTaskIntoSearchTable(task);
    }
}

// Cancel or reset edit visual styling
function resetEditMode() {
    editTaskId = null;
    addTaskBtn.textContent = 'Add Task';
    addTaskBtn.classList.remove('update-mode');
    if (taskPrioritySelect) taskPrioritySelect.value = '';
}


function toggleTaskCompletion(id) {
    // Look up in O(1) Hash Table instead of searching array
    const task = taskDictionary[id];
    if (task) {
        task.completed = !task.completed;

        saveTasksToLocalStorage();
        updateDashboard();
        renderTasks();
    }
}

// 7. DELETE & STACK UNDO SYSTEM

function deleteTask(id) {
    // 1. Locate and retrieve task index in the array
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const taskToDelete = tasks[taskIndex];

    const action = {
        task: taskToDelete,
        index: taskIndex
    };

    // Stack Implementation (LIFO)
    deletedStack.push(action);

    // Store in deletedTasks list for drawer, saving original index
    deletedTasks.push(action);
    saveDeletedTasksToLocalStorage();

    // 2. Remove from Array
    tasks.splice(taskIndex, 1);

    // 3. Remove from Hash Table Dictionary
    delete taskDictionary[id];

    // 4. Remove from Search Index Table
    removeTaskFromSearchTable(taskToDelete);

    // Update Undo UI status
    updateUndoUI();

    // Sync to Storage and Update UI
    saveTasksToLocalStorage();
    updateDashboard();
    renderTasks();
}

function undoDeleteTask() {
    // Check if the stack contains items
    if (deletedStack.length === 0) return;

    // Pop the last deleted task
    const poppedAction = deletedStack.pop();
    const restoredTask = poppedAction.task;
    const restoredIndex = poppedAction.index;

    // 1. Restore task to its original index in the Array
    tasks.splice(restoredIndex, 0, restoredTask);

    // 2. Restore task in the Hash Table Dictionary
    taskDictionary[restoredTask.id] = restoredTask;

    // 3. Restore in Search Index Table
    insertTaskIntoSearchTable(restoredTask);

    // 4. Remove from deletedTasks array
    deletedTasks = deletedTasks.filter(item => item.task.id !== restoredTask.id);
    saveDeletedTasksToLocalStorage();

    // Update Undo UI status
    updateUndoUI();

    // Sync and refresh displays
    saveTasksToLocalStorage();
    updateDashboard();
    renderTasks();
}

// Refresh status of the Undo Button
function updateUndoUI() {
    if (deletedStack.length > 0) {
        const lastDeleted = deletedStack[deletedStack.length - 1].task;
        undoDeleteBtn.disabled = false;
        undoStatusMsg.textContent = `Undo delete: "${lastDeleted.name}"`;
    } else {
        undoDeleteBtn.disabled = true;
        undoStatusMsg.textContent = "No actions to undo";
    }
}

// Trigger Edit Mode (Pre-populates the input form fields)
function startEditTask(id) {
    // Quick lookup in dictionary
    const task = taskDictionary[id];
    if (!task) return;

    // Save ID of edited item
    editTaskId = id;

    // Populate UI inputs
    taskNameInput.value = task.name;
    taskDescInput.value = task.description || '';
    taskDueDateInput.value = task.dueDate;
    taskCategorySelect.value = task.category;
    if (taskPrioritySelect && task.priority) {
        taskPrioritySelect.value = task.priority;
    }
    taskAssigneeInput.value = task.assignedTo === 'Unassigned' ? '' : task.assignedTo;

    // Highlight form input side and update action text
    addTaskBtn.textContent = 'Update Task';
    addTaskBtn.classList.add('update-mode');

    // Open drawer sliding panel
    openDrawerPanel('task-creation-container');
}


// 8. SEARCH ALGORITHM (Hash Table Search Index)

function performHashTableSearch(nameQuery, categoryQuery, assigneeQuery) {
    let matchedTasks = null;

    // Intersection helper that compares tasks by unique id
    const intersect = (currentSet, newTasks) => {
        if (currentSet === null) {
            return newTasks;
        }
        const newIds = new Set(newTasks.map(t => t.id));
        return currentSet.filter(t => newIds.has(t.id));
    };

    // 1. Search by Name (Exact or Word matches)
    if (nameQuery) {
        const cleanQuery = nameQuery.trim().toLowerCase();

        // Exact name lookup
        let queryResults = taskSearchTable.get("name:" + cleanQuery);

        // Word-by-word intersection lookup
        if (queryResults.length === 0) {
            const words = cleanQuery.split(/\s+/);
            let wordResults = null;
            for (const word of words) {
                const cleanWord = word.replace(/[^a-z0-9]/g, '');
                if (cleanWord) {
                    const tasksForWord = taskSearchTable.get("word:" + cleanWord);
                    wordResults = intersect(wordResults, tasksForWord);
                }
            }
            queryResults = wordResults || [];
        }
        matchedTasks = intersect(matchedTasks, queryResults);
    }

    // 2. Search by Category
    if (categoryQuery) {
        const categoryTasks = taskSearchTable.get("category:" + categoryQuery.trim().toLowerCase());
        matchedTasks = intersect(matchedTasks, categoryTasks);
    }

    // 3. Search by Assignee
    if (assigneeQuery) {
        const cleanAssignee = assigneeQuery.trim().toLowerCase();
        let assigneeResults = taskSearchTable.get("assignee:" + cleanAssignee);

        if (assigneeResults.length === 0) {
            const words = cleanAssignee.split(/\s+/);
            let wordResults = null;
            for (const word of words) {
                const cleanWord = word.replace(/[^a-z0-9]/g, '');
                if (cleanWord) {
                    const tasksForWord = taskSearchTable.get("assignee_word:" + cleanWord);
                    wordResults = intersect(wordResults, tasksForWord);
                }
            }
            assigneeResults = wordResults || [];
        }
        matchedTasks = intersect(matchedTasks, assigneeResults);
    }

    // If no search filter is applied, return all active tasks (FIFO Queue order)
    if (matchedTasks === null) {
        return [...tasks];
    }

    // Intersected results need to preserve the original FIFO insertion order (by checking tasks order)
    const matchedIds = new Set(matchedTasks.map(t => t.id));
    return tasks.filter(t => matchedIds.has(t.id));
}

// 9. SORTING ALGORITHM (Merge Sort Implementation)

function performMergeSort(arr, criterion) {
    if (arr.length <= 1) {
        return arr;
    }

    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    return merge(performMergeSort(left, criterion), performMergeSort(right, criterion), criterion);
}

function merge(left, right, criterion) {
    const result = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
        let shouldSwap = false;

        if (criterion === 'dueDate') {
            shouldSwap = left[leftIndex].dueDate > right[rightIndex].dueDate;
        }
        else if (criterion === 'category') {
            shouldSwap = left[leftIndex].category.localeCompare(right[rightIndex].category) > 0;
        }
        else if (criterion === 'status') {
            // Pending (false) first, Completed (true) last
            shouldSwap = left[leftIndex].completed && !right[rightIndex].completed;
        }
        else if (criterion === 'name') {
            shouldSwap = left[leftIndex].name.localeCompare(right[rightIndex].name) > 0;
        }
        else if (criterion === 'priority') {
            const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
            const leftWeight = priorityWeight[left[leftIndex].priority?.toLowerCase()] || 0;
            const rightWeight = priorityWeight[right[rightIndex].priority?.toLowerCase()] || 0;
            shouldSwap = leftWeight < rightWeight; // Higher priority first
        }

        if (!shouldSwap) {
            result.push(left[leftIndex]);
            leftIndex++;
        } else {
            result.push(right[rightIndex]);
            rightIndex++;
        }
    }

    return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

// 10. DYNAMIC RENDERING PROCESS (Ruled Page Layout Rows)

function renderTasks() {
    // Clear list display area
    taskListContainer.innerHTML = '';

    // 1. Search tasks using the O(1) Hash Table
    const nameQuery = searchNameInput.value.trim();
    const categoryQuery = searchCategorySelect.value;
    const assigneeQuery = searchAssigneeInput.value.trim();
    let filteredList = performHashTableSearch(nameQuery, categoryQuery, assigneeQuery);

    // 2. Apply Filtering by Status (All / Completed / Pending)
    filteredList = filteredList.filter(task => {
        if (currentFilter === 'completed') return task.completed;
        if (currentFilter === 'pending') return !task.completed;
        return true; // 'all'
    });

    // 3. Apply Sorting using the recursive Merge Sort Algorithm ONLY if a sort option is selected
    if (currentSort !== 'none') {
        filteredList = performMergeSort(filteredList, currentSort);
    }

    // 4. Check for Empty Lists
    if (filteredList.length === 0) {
        emptyStateDiv.style.display = 'flex';
        return;
    } else {
        emptyStateDiv.style.display = 'none';
    }

    // 5. Build and Inject HTML Notebook List Items
    filteredList.forEach((task, index) => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.setAttribute('data-category', task.category);
        item.id = `task-card-${task.id}`;

        const serialNum = index + 1;

        item.innerHTML = `
            <div class="task-serial">${serialNum}</div>
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
                            <span class="task-badge-highlight badge-${task.priority ? task.priority.toLowerCase() : 'low'}">${task.priority || 'Low'}</span>
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

// Utility to escape HTML to prevent XSS vulnerability injects
function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 11. PRODUCTIVITY TRACKER & ANALYTICS

function updateDashboard() {
    const total = tasks.length;
    // Count matches using Array filters
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    // Percentage calculation (Handles division by zero case)
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update text content values
    totalTasksCount.textContent = total;
    completedTasksCount.textContent = completed;
    pendingTasksCount.textContent = pending;
    completionPercentage.textContent = `${percentage}%`;
    progressPercentageText.textContent = `${percentage}%`;

    // Update visual progress fill bar width
    progressBarFill.style.width = `${percentage}%`;
}

// 12. LOCAL STORAGE PERSISTENCE

// Saves the active task list into the user's web browser local memory.
function saveTasksToLocalStorage() {
    localStorage.setItem('tms_tasks', JSON.stringify(tasks));
}

// Loads tasks from the browser storage and populates the Dictionary, Array, and Search Index
function loadTasksFromLocalStorage() {
    const dataString = localStorage.getItem('tms_tasks');

    if (dataString) {
        try {
            tasks = JSON.parse(dataString);

            // Rebuild O(1) Hash Table dictionary and search table from array values
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
}

// Save deleted tasks to Local Storage
function saveDeletedTasksToLocalStorage() {
    localStorage.setItem('tms_deleted_tasks', JSON.stringify(deletedTasks));
}

// Load deleted tasks from Local Storage
function loadDeletedTasksFromLocalStorage() {
    const deletedString = localStorage.getItem('tms_deleted_tasks');
    if (deletedString) {
        try {
            deletedTasks = JSON.parse(deletedString);
            // Rebuild stack state for undo matching deletedTasks
            deletedStack = [...deletedTasks];
            updateUndoUI();
        } catch (e) {
            console.error("Error reading LocalStorage deleted tasks database: ", e);
            deletedTasks = [];
            deletedStack = [];
        }
    }
}

// 13. DELETED TASKS DRAWER RENDER & ACTIONS

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
                <span>Priority: <span class="task-badge-highlight badge-${task.priority ? task.priority.toLowerCase() : 'low'}">${task.priority || 'Low'}</span></span>
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
    const deletedItemIndex = deletedTasks.findIndex(item => item.task.id === id);
    if (deletedItemIndex === -1) return;

    const action = deletedTasks[deletedItemIndex];
    const restoredTask = action.task;
    const restoredIndex = action.index;

    // 1. Restore to tasks array at its original position
    tasks.splice(restoredIndex, 0, restoredTask);

    // 2. Restore to O(1) dictionary and Search table
    taskDictionary[restoredTask.id] = restoredTask;
    insertTaskIntoSearchTable(restoredTask);

    // 3. Remove from deleted lists
    deletedTasks.splice(deletedItemIndex, 1);
    deletedStack = deletedStack.filter(item => item.task.id !== id);

    // Update displays and storage
    saveDeletedTasksToLocalStorage();
    saveTasksToLocalStorage();
    updateUndoUI();
    updateDashboard();
    renderTasks();
    renderDeletedTasks();
}

function permanentlyDeleteTask(id) {
    // Remove from deleted list and stack
    deletedTasks = deletedTasks.filter(item => item.task.id !== id);
    deletedStack = deletedStack.filter(item => item.task.id !== id);

    // Update displays and storage
    saveDeletedTasksToLocalStorage();
    updateUndoUI();
    renderDeletedTasks();
}

// 14. TASK INDEX DRAWER RENDER

function renderIndex() {
    if (!indexListContainer) return;
    indexListContainer.innerHTML = '';

    // Show currently visible (filtered and searched) tasks or all tasks?
    // "Display only: Index Number, Task Name. Task names must be clickable."
    // Let's list all active tasks from the current task array (tasks)
    if (tasks.length === 0) {
        indexListContainer.innerHTML = `
            <div class="empty-state" style="margin-top: 10px; padding: 20px;">
                <p>No active tasks</p>
            </div>
        `;
        return;
    }

    tasks.forEach((task, index) => {
        const serialNum = index + 1;
        const link = document.createElement('div');
        link.className = 'index-task-link';
        link.textContent = `${serialNum}. ${task.name}`;
        link.addEventListener('click', () => {
            navigateToTask(task.id);
        });
        indexListContainer.appendChild(link);
    });
}

function navigateToTask(id) {
    // 1. Check if the task is currently rendered on screen.
    // If not (e.g. filtered out), reset filter to 'all' and clear searches to make it visible
    const taskEl = document.getElementById(`task-card-${id}`);
    if (!taskEl) {
        currentFilter = 'all';
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        searchNameInput.value = '';
        searchCategorySelect.value = '';
        searchAssigneeInput.value = '';
        renderTasks();
    }

    // Scroll to the task card
    setTimeout(() => {
        const targetEl = document.getElementById(`task-card-${id}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight the task
            targetEl.classList.add('highlight-task');
            setTimeout(() => {
                targetEl.classList.remove('highlight-task');
            }, 2500);
        }
    }, 100);

    // Auto-close index drawer
    closeDrawerPanel('index-container');
}
