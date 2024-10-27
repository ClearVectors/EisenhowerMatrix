// Global tasks array
let tasks = [];

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

// Task Card Creation
function createTaskCard(task) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    let statusClass = 'task-future';
    if (dueDate < now) {
        statusClass = 'task-overdue';
    } else if (dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        statusClass = 'task-due-today';
    } else if (dueDate <= weekFromNow) {
        statusClass = 'task-due-this-week';
    }

    return `
        <div class="task-card ${statusClass} ${task.completed ? 'task-completed' : ''}" 
             data-task-id="${task.id}" draggable="true">
            <div class="task-header d-flex justify-content-between align-items-start">
                <h5 class="task-title mb-2">${task.title}</h5>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editTask(${task.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <p class="task-description mb-2">${task.description || ''}</p>
            <div class="task-footer d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">
                    <i class="bi category-icon"></i>
                    ${task.category}
                </span>
                <span class="task-due-date">
                    <i class="bi bi-calendar"></i>
                    ${new Date(task.due_date).toLocaleDateString()}
                </span>
            </div>
            <div class="status-indicator status-${statusClass.replace('task-', '')}"></div>
        </div>
    `;
}

// Task Management Functions
function loadTasks() {
    const matrixRoot = document.getElementById('matrix-root');
    if (!matrixRoot) {
        console.error('Matrix root element not found');
        showToast('Error: Matrix container not found', 'danger');
        return;
    }

    // Show loading state in each quadrant
    const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    quadrants.forEach(quadrant => {
        const element = document.getElementById(quadrant);
        if (element) {
            const title = element.querySelector('.quadrant-title');
            const titleHtml = title ? title.outerHTML : '';
            element.innerHTML = `
                ${titleHtml}
                <div class="loading-spinner">
                    <div class="spinner-border text-secondary"></div>
                    <div class="loading-text">Loading tasks...</div>
                </div>
            `;
        }
    });

    fetch('/tasks')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(tasksData => {
            tasks = tasksData;
            updateTasksUI(tasks);
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            showToast('Failed to load tasks', 'danger');
            quadrants.forEach(quadrant => {
                const element = document.getElementById(quadrant);
                if (element) {
                    const title = element.querySelector('.quadrant-title');
                    const titleHtml = title ? title.outerHTML : '';
                    element.innerHTML = `
                        ${titleHtml}
                        <div class="alert alert-danger m-3">
                            Failed to load tasks. Please try refreshing the page.
                        </div>
                    `;
                }
            });
        });
}

function updateTasksUI(tasks) {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    // Clear existing tasks while preserving titles
    Object.values(quadrants).forEach(quadrant => {
        if (quadrant) {
            const title = quadrant.querySelector('.quadrant-title');
            quadrant.innerHTML = title ? title.outerHTML : '';
        }
    });

    // Add tasks to their respective quadrants
    tasks.forEach(task => {
        const quadrant = quadrants[task.quadrant];
        if (quadrant) {
            const taskElement = document.createElement('div');
            taskElement.innerHTML = createTaskCard(task);
            const taskCard = taskElement.firstElementChild;
            if (taskCard) {
                quadrant.appendChild(taskCard);
                initializeDragAndDrop(taskCard);
            }
        }
    });

    // Show empty state if no tasks in quadrant
    Object.entries(quadrants).forEach(([quadrantId, element]) => {
        if (element) {
            const tasks = element.querySelectorAll('.task-card');
            if (tasks.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'text-center text-muted py-3';
                emptyState.innerHTML = 'No tasks yet';
                element.appendChild(emptyState);
            }
        }
    });
}

// Initialize drag and drop
function initializeDragAndDrop(taskElement) {
    if (!taskElement) return;

    taskElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    });

    taskElement.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });
}

// Add Task function
function addTask() {
    const elements = {
        title: document.getElementById('taskTitle'),
        description: document.getElementById('taskDescription'),
        category: document.getElementById('taskCategory'),
        quadrant: document.getElementById('taskQuadrant'),
        dueDate: document.getElementById('taskDueDate')
    };

    const data = {
        title: elements.title?.value.trim(),
        description: elements.description?.value.trim(),
        category: elements.category?.value,
        quadrant: elements.quadrant?.value,
        due_date: elements.dueDate?.value
    };

    if (!data.title || !data.category || !data.quadrant || !data.due_date) {
        showToast('Please fill in all required fields', 'danger');
        return;
    }

    const addButton = document.querySelector('#addTaskModal .btn-primary');
    if (!addButton) return;

    const originalText = addButton.textContent;
    addButton.disabled = true;
    addButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to add task');
        return response.json();
    })
    .then(task => {
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        if (modal) modal.hide();
        const taskForm = document.getElementById('taskForm');
        if (taskForm) taskForm.reset();
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Failed to add task: ' + error.message, 'danger');
    })
    .finally(() => {
        addButton.disabled = false;
        addButton.innerHTML = originalText;
    });
}

// Filter functionality
function filterTasks(filter = 'all') {
    fetch(`/tasks?filter=${filter}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(filteredTasks => {
            updateTasksUI(filteredTasks);
        })
        .catch(error => {
            console.error('Error filtering tasks:', error);
            showToast('Failed to filter tasks', 'danger');
        });
}

// Export functionality
function exportTasks() {
    window.location.href = '/tasks/export';
}

// Initialize drop zones
function initializeDropZones() {
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        if (!quadrant) return;

        quadrant.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });

        quadrant.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });

        quadrant.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const newQuadrant = e.currentTarget.id;
            
            if (!taskId || !newQuadrant) return;

            fetch(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quadrant: newQuadrant })
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to update task');
                return response.json();
            })
            .then(() => {
                loadTasks();
                showToast('Task moved successfully');
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to move task', 'danger');
            });
        });
    });
}

// Initialize application
function initializeApp() {
    // Initialize matrix container
    const matrixRoot = document.getElementById('matrix-root');
    if (!matrixRoot) {
        console.error('Matrix root element not found');
        showToast('Error: Matrix container not found', 'danger');
        return;
    }

    // Initialize drop zones
    initializeDropZones();

    // Load initial tasks
    loadTasks();
    
    // Initialize Add Task modal events
    const addTaskModal = document.getElementById('addTaskModal');
    if (addTaskModal) {
        addTaskModal.addEventListener('show.bs.modal', function () {
            const categorySelect = document.getElementById('taskCategory');
            if (!categorySelect) return;

            categorySelect.innerHTML = '<option value="">Loading categories...</option>';
            categorySelect.disabled = true;

            fetch('/categories')
                .then(response => response.json())
                .then(categories => {
                    categorySelect.innerHTML = '<option value="">Select category</option>';
                    categories.forEach(category => {
                        categorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
                    });
                })
                .catch(error => {
                    console.error('Error loading categories:', error);
                    categorySelect.innerHTML = '<option value="">Failed to load categories</option>';
                })
                .finally(() => {
                    categorySelect.disabled = false;
                });
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
