let tasks = [];
let toastTimeout;
let draggedTask = null;

function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Create new toast
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

    // Auto remove after 3 seconds
    toastTimeout = setTimeout(() => toast.remove(), 3000);
}

function handleDragStart(event) {
    draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
    
    // Add visual feedback
    event.target.style.opacity = '0.5';
    event.target.style.transform = 'scale(0.95)';
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    event.target.style.opacity = '';
    event.target.style.transform = '';
    draggedTask = null;
    
    // Remove all drag-over effects
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    event.dataTransfer.dropEffect = 'move';
    return false;
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
    if (!quadrant || !draggedTask) return;

    const newQuadrant = quadrant.querySelector('.task-list').id;
    if (draggedTask.quadrant !== newQuadrant) {
        // Update the task's quadrant locally first for immediate feedback
        const taskElement = document.querySelector(`[data-task-id="${draggedTask.id}"]`);
        if (taskElement) {
            quadrant.querySelector('.task-list').appendChild(taskElement);
        }

        // Then send the update to the server
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
            loadTasks(); // Refresh all tasks to ensure consistency
        })
        .catch(error => {
            console.error('Error moving task:', error);
            showToast(error.message || 'Failed to move task', 'error');
            loadTasks(); // Reload to restore original position
        });
    }

    quadrant.classList.remove('drag-over');
    return false;
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

function filterTasks(filter = 'all') {
    loadTasks(filter);
}

function createTaskCard(task) {
    const dueDate = new Date(task.due_date);
    const formattedDueDate = dueDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return `
        <div class="task-card ${task.completed ? 'task-completed' : ''}"
             draggable="true"
             data-task-id="${task.id}"
             ondragstart="handleDragStart(event)"
             ondragend="handleDragEnd(event)">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">${task.category}</span>
                <small class="text-muted">${formattedDueDate}</small>
            </div>
            <div class="task-actions mt-3">
                <button class="btn btn-outline-secondary btn-sm edit-task-btn" 
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

    // Show loading state
    Object.values(quadrants).forEach(quadrant => {
        quadrant.innerHTML = '<div class="text-center"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
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

        // Clear existing tasks
        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '';
        });

        // Display filtered tasks
        filteredTasks.forEach(task => {
            if (quadrants[task.quadrant]) {
                quadrants[task.quadrant].innerHTML += createTaskCard(task);
            }
        });

        // Add drag and drop event listeners to quadrants
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

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});
