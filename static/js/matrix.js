let tasks = [];
let toastTimeout;
let draggedTask = null;
let dragPlaceholder = null;

function getDueStatus(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 7) return 'due-this-week';
    return 'future';
}

function getCategoryIcon(category) {
    const icons = {
        'Health': 'bi-heart-pulse',
        'Work': 'bi-briefcase',
        'Personal': 'bi-person',
        'Learning': 'bi-book',
        'Shopping': 'bi-cart'
    };
    return icons[category] || 'bi-tag';
}

function createTaskCard(task) {
    const dueDate = new Date(task.due_date);
    const dueStatus = getDueStatus(dueDate);
    const formattedDueDate = dueDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const categoryIcon = getCategoryIcon(task.category);
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
                <span class="category-badge category-${task.category}">
                    <i class="bi ${categoryIcon} category-icon"></i>
                    ${task.category}
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

// Function to show toast messages
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    const toast = document.createElement('div');
    toast.className = `toast position-fixed bottom-0 end-0 m-4 ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body d-flex align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    document.body.appendChild(toast);

    toastTimeout = setTimeout(() => toast.remove(), 3000);
}

// Task management functions
function loadTasks(filter = 'all') {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    Object.values(quadrants).forEach(quadrant => {
        quadrant.innerHTML = '<div class="task-list-loading"><div class="spinner-border text-secondary"></div></div>';
    });

    Promise.all([
        fetch('/tasks').then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        }),
        fetch(`/tasks?filter=${filter}`).then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
    ])
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;
        console.log('Tasks loaded:', tasks);

        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '';
        });

        filteredTasks.forEach(task => {
            if (quadrants[task.quadrant]) {
                quadrants[task.quadrant].innerHTML += createTaskCard(task);
            }
        });

        document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
            quadrant.ondragover = handleDragOver;
            quadrant.ondragenter = handleDragEnter;
            quadrant.ondragleave = handleDragLeave;
            quadrant.ondrop = handleDrop;
        });
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page to try again.</div>';
        });
        showToast('Failed to load tasks', 'error');
    });
}

function validateTaskForm(formId = 'taskForm') {
    const title = document.getElementById(formId === 'taskForm' ? 'taskTitle' : 'editTaskTitle').value.trim();
    const dueDate = document.getElementById(formId === 'taskForm' ? 'taskDueDate' : 'editTaskDueDate').value;
    const quadrant = document.getElementById(formId === 'taskForm' ? 'taskQuadrant' : 'editTaskQuadrant').value;
    const errors = [];

    if (!title) errors.push('Title is required');
    if (!dueDate) errors.push('Due date is required');
    if (!quadrant) errors.push('Quadrant is required');

    return errors;
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    const errors = validateTaskForm();
    if (errors.length > 0) {
        showToast(errors.join(', '), 'error');
        return;
    }

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
            description,
            category,
            due_date: dueDate,
            quadrant
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();
    })
    .catch(error => {
        console.error('Error adding task:', error);
        showToast(error.message || 'Failed to add task', 'error');
    });
}

// Export functionality
function exportTasks() {
    window.location.href = '/tasks/export';
}

// Filter functionality
function filterTasks(filter = 'all') {
    loadTasks(filter);
}

// Drag and drop functionality
function handleDragStart(event) {
    draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
    if (!draggedTask) return;

    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
    
    dragPlaceholder = createPlaceholder();
    
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

    if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    }
    dragPlaceholder = null;

    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
    const quadrant = event.target.closest('.matrix-quadrant');
    if (quadrant && draggedTask) {
        quadrant.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const quadrant = event.target.closest('.matrix-quadrant');
    if (quadrant) {
        quadrant.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    
    const quadrant = event.target.closest('.matrix-quadrant');
    if (!quadrant || !draggedTask) return;

    const newQuadrant = quadrant.querySelector('.task-list').id;
    if (draggedTask.quadrant !== newQuadrant) {
        fetch(`/tasks/${draggedTask.id}`, {
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
        .then(data => {
            showToast('Task moved successfully');
            loadTasks();
        })
        .catch(error => {
            console.error('Error moving task:', error);
            showToast('Failed to move task', 'error');
            loadTasks();
        });
    }

    quadrant.classList.remove('drag-over');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});
