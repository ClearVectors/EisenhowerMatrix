let tasks = [];
let categories = [];
let draggedTask = null;

// Toast notifications
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Due date status helper
function getDueStatus(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 7) return 'due-this-week';
    return 'future';
}

// Filtering system
function getFilterParameters() {
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    const showCompleted = document.getElementById('filterCompleted');
    
    const params = new URLSearchParams();
    if (dateFrom && dateFrom.value) params.append('date_from', dateFrom.value);
    if (dateTo && dateTo.value) params.append('date_to', dateTo.value);
    params.append('show_completed', showCompleted && showCompleted.checked || false);
    
    const categoryInputs = document.querySelectorAll('input[name="filterCategory"]:checked');
    if (categoryInputs) {
        Array.from(categoryInputs).forEach(input => params.append('categories', input.value));
    }
    
    return params;
}

function filterTasks(filter = 'all') {
    const params = getFilterParameters();
    params.append('filter', filter);
    loadTasks(filter);
}

function clearFilters() {
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterCompleted = document.getElementById('filterCompleted');

    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo) filterDateTo.value = '';
    if (filterCompleted) filterCompleted.checked = false;

    document.querySelectorAll('input[name="filterCategory"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    loadTasks();
}

function applyFilters() {
    loadTasks();
    const dropdown = document.querySelector('.filter-controls .dropdown');
    const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
    if (bsDropdown) bsDropdown.hide();
}

// Sorting system
let currentSortBy = 'due_date';
let currentSortOrder = 'asc';

function sortTasks(sortBy, sortOrder) {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    loadTasks();
}

// Category management
function updateFilterCategories() {
    const filterCategories = document.getElementById('filterCategories');
    if (!filterCategories) return;
    
    filterCategories.innerHTML = categories.map(category => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" 
                   value="${category.id}" 
                   id="filterCategory${category.id}"
                   name="filterCategory">
            <label class="form-check-label" for="filterCategory${category.id}">
                <i class="bi ${category.icon}" style="color: ${category.color}"></i>
                ${category.name}
            </label>
        </div>
    `).join('');
}

function updateCategoryList() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;

    categoryList.innerHTML = categories.map(category => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi ${category.icon} me-2" style="color: ${category.color}"></i>
                <span>${category.name}</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="editCategory(${category.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateCategoryDropdowns() {
    const taskCategory = document.getElementById('taskCategory');
    const editTaskCategory = document.getElementById('editTaskCategory');

    const options = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
    
    if (taskCategory) taskCategory.innerHTML = options;
    if (editTaskCategory) editTaskCategory.innerHTML = options;
}

// Task card creation
function createTaskCard(task) {
    const dueDate = new Date(task.due_date);
    const dueStatus = getDueStatus(dueDate);
    const formattedDueDate = dueDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const statusClass = `task-${dueStatus}`;
    const completedClass = task.completed ? 'task-completed' : '';

    return `
        <div class="task-card ${statusClass} ${completedClass}"
             draggable="true"
             data-task-id="${task.id}"
             ondragstart="handleDragStart(event)"
             ondragend="handleDragEnd(event)">
            <div class="status-indicator status-${dueStatus}"></div>
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span class="category-badge" style="background-color: ${task.category?.color || '#6B7280'}">
                    <i class="bi ${task.category?.icon || 'bi-tag'} category-icon"></i>
                    ${task.category?.name || 'Uncategorized'}
                </span>
                <span class="task-due-date">
                    <i class="bi bi-calendar-event"></i>
                    ${formattedDueDate}
                </span>
            </div>
            <div class="task-actions mt-3">
                <button class="btn btn-outline-secondary btn-sm" 
                        onclick="showEditTaskModal(${task.id})" 
                        title="Edit task">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-${task.completed ? 'warning' : 'success'} btn-sm" 
                        onclick="toggleTaskCompletion(${task.id}, ${task.completed})"
                        title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                    <i class="bi bi-${task.completed ? 'arrow-counterclockwise' : 'check-lg'}"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" 
                        onclick="deleteTask(${task.id})"
                        title="Delete task">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Task loading and management
function loadTasks(filter = 'all') {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    Object.values(quadrants).forEach(quadrant => {
        if (quadrant) {
            quadrant.innerHTML = '<div class="task-list-loading"><div class="spinner-border text-secondary"></div></div>';
        }
    });

    const params = getFilterParameters();
    params.append('filter', filter);
    params.append('sort_by', currentSortBy);
    params.append('sort_order', currentSortOrder);

    Promise.all([
        fetch('/tasks'),
        fetch(`/tasks?${params.toString()}`)
    ])
    .then(responses => Promise.all(responses.map(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
    })))
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;

        Object.entries(quadrants).forEach(([quadrantId, quadrant]) => {
            if (quadrant) {
                quadrant.innerHTML = '';
                const quadrantTasks = filteredTasks.filter(task => task.quadrant === quadrantId);
                quadrantTasks.forEach(task => {
                    quadrant.innerHTML += createTaskCard(task);
                });
            }
        });

        initializeDragAndDrop();
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        Object.values(quadrants).forEach(quadrant => {
            if (quadrant) {
                quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page to try again.</div>';
            }
        });
        showToast('Failed to load tasks', 'error');
    });
}

// Categories loading
function loadCategories() {
    fetch('/categories')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format received');
            }
            categories = data;
            updateCategoryList();
            updateCategoryDropdowns();
            document.dispatchEvent(new Event('categoriesLoaded'));
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories. Please refresh the page.', 'error');
        });
}

// Drag and drop functionality
function handleDragStart(event) {
    draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
    if (!draggedTask) return;

    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);

    requestAnimationFrame(() => {
        event.target.style.opacity = '0.5';
        event.target.style.transform = 'scale(0.95) rotate(-1deg)';
    });
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    event.target.style.opacity = '';
    event.target.style.transform = '';
    draggedTask = null;

    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
    const quadrant = event.currentTarget;
    if (quadrant && quadrant.classList.contains('matrix-quadrant')) {
        quadrant.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const quadrant = event.currentTarget;
    if (quadrant && quadrant.classList.contains('matrix-quadrant')) {
        quadrant.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    
    const quadrant = event.currentTarget;
    if (!quadrant || !quadrant.classList.contains('matrix-quadrant')) return;

    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId || !draggedTask) return;

    const newQuadrant = quadrant.querySelector('.task-list').id;

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quadrant: newQuadrant
        })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(() => {
        showToast('Task moved successfully');
        loadTasks();
    })
    .catch(error => {
        console.error('Error moving task:', error);
        showToast('Failed to move task', 'error');
        loadTasks();
    });
}

function initializeDragAndDrop() {
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.ondragover = handleDragOver;
        quadrant.ondragenter = handleDragEnter;
        quadrant.ondragleave = handleDragLeave;
        quadrant.ondrop = handleDrop;
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Define event handlers
    const newCategoryForm = document.getElementById('newCategoryForm');
    if (newCategoryForm) {
        newCategoryForm.addEventListener('submit', addCategory);
    }
    
    // Add filter button event listeners
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter || 'all';
            filterTasks(filter);
        });
    });
    
    // Load initial data
    loadCategories();
    loadTasks();
    
    // Setup category updates
    document.addEventListener('categoriesLoaded', updateFilterCategories);
});
