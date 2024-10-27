let tasks = [];
let toastTimeout;

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

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    // Validate required fields
    if (!title || !dueDate || !quadrant) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    const addButton = document.querySelector('#addTaskModal .btn-primary');
    const originalText = addButton.textContent;
    addButton.disabled = true;
    addButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

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
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();  // Refresh task list
    })
    .catch(error => {
        console.error('Error adding task:', error);
        showToast('Failed to add task: ' + error.message, 'error');
    })
    .finally(() => {
        // Reset button state
        addButton.disabled = false;
        addButton.textContent = originalText;
    });
}

function toggleTaskCompletion(taskId, currentStatus) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            completed: !currentStatus
        })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast(`Task marked as ${!currentStatus ? 'complete' : 'incomplete'}`);
        loadTasks();
    })
    .catch(error => {
        console.error('Error updating task:', error);
        showToast('Failed to update task status', 'error');
    });
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Task deleted successfully');
        loadTasks();
    })
    .catch(error => {
        console.error('Error deleting task:', error);
        showToast('Failed to delete task', 'error');
    });
}

function showEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        showToast('Task not found', 'error');
        return;
    }

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskCategory').value = task.category;
    document.getElementById('editTaskQuadrant').value = task.quadrant;
    
    // Format date for input
    const dueDate = new Date(task.due_date);
    const formattedDate = dueDate.toISOString().split('T')[0];
    document.getElementById('editTaskDueDate').value = formattedDate;

    const editModal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    editModal.show();
}

function updateTask() {
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const category = document.getElementById('editTaskCategory').value;
    const dueDate = document.getElementById('editTaskDueDate').value;
    const quadrant = document.getElementById('editTaskQuadrant').value;

    if (!title || !dueDate || !quadrant) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    const saveButton = document.querySelector('#editTaskModal .btn-primary');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
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
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Task updated successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        loadTasks();
    })
    .catch(error => {
        console.error('Error updating task:', error);
        showToast('Failed to update task: ' + error.message, 'error');
    })
    .finally(() => {
        // Reset button state
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
}

// Drag and drop functionality
function handleDragStart(event) {
    const taskId = parseInt(event.target.dataset.taskId);
    draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);

    requestAnimationFrame(() => {
        event.target.style.opacity = '0.5';
        event.target.style.transform = 'scale(0.95) rotate(-1deg)';
    });
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    event.target.style.opacity = '';
    event.target.style.transform = '';

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
    if (quadrant) {
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
    if (!quadrant) return;

    const taskId = event.dataTransfer.getData('text/plain');
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

// Export functionality
function exportTasks() {
    window.location.href = '/tasks/export';
}

// Filter functionality
function filterTasks(filter = 'all') {
    loadTasks(filter);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});
