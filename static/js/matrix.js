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

function showAddTaskModal(quadrant = '') {
    console.log('Opening add task modal for quadrant:', quadrant);
    document.getElementById('taskQuadrant').value = quadrant;
    const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
    modal.show();
}

function addTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    if (!title || !dueDate) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const task = {
        title,
        description,
        category,
        due_date: dueDate,
        quadrant
    };

    console.log('Adding new task:', task);

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();
        showToast('Task added successfully');
    })
    .catch(error => {
        console.error('Error adding task:', error);
        showToast(error.message || 'Failed to add task', 'error');
    });
}

function showEditTaskModal(taskId) {
    console.log('Opening edit modal for task:', taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        showToast('Task not found', 'error');
        return;
    }

    try {
        // Format date for the input field (YYYY-MM-DD)
        const dueDate = new Date(task.due_date);
        const formattedDate = dueDate.toISOString().split('T')[0];

        // Set form values
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskCategory').value = task.category;
        document.getElementById('editTaskDueDate').value = formattedDate;
        document.getElementById('editTaskQuadrant').value = task.quadrant;

        console.log('Task data populated in edit form:', {
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            dueDate: formattedDate,
            quadrant: task.quadrant
        });

        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing edit modal:', error);
        showToast('Error loading task data', 'error');
    }
}

function validateTaskData(taskData) {
    console.log('Validating task data:', taskData);
    const errors = [];
    if (!taskData.title.trim()) errors.push('Title is required');
    if (!taskData.due_date) errors.push('Due date is required');
    if (!taskData.category) errors.push('Category is required');
    if (!taskData.quadrant) errors.push('Quadrant is required');
    return errors;
}

function updateTask() {
    const saveButton = document.querySelector('#editTaskModal .btn-primary');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveButton.disabled = true;

    const taskId = document.getElementById('editTaskId').value;
    const task = {
        title: document.getElementById('editTaskTitle').value.trim(),
        description: document.getElementById('editTaskDescription').value.trim(),
        category: document.getElementById('editTaskCategory').value,
        due_date: document.getElementById('editTaskDueDate').value,
        quadrant: document.getElementById('editTaskQuadrant').value
    };

    console.log('Updating task:', { taskId, task });

    // Validate form data
    const errors = validateTaskData(task);
    if (errors.length > 0) {
        showToast('Please correct the following errors:\n' + errors.join('\n'), 'error');
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        return;
    }

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Task updated successfully:', data);
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        loadTasks();
        showToast('Task updated successfully');
    })
    .catch(error => {
        console.error('Error updating task:', error);
        showToast(error.message || 'Failed to update task', 'error');
    })
    .finally(() => {
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    });
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    console.log('Deleting task:', taskId);

    fetch(`/tasks/${taskId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        loadTasks();
        showToast('Task deleted successfully');
    })
    .catch(error => {
        console.error('Error deleting task:', error);
        showToast(error.message || 'Failed to delete task', 'error');
    });
}

function toggleTaskCompletion(taskId, completed) {
    console.log('Toggling task completion:', { taskId, completed });

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completed })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        loadTasks();
        showToast(`Task marked as ${!completed ? 'completed' : 'incomplete'}`);
    })
    .catch(error => {
        console.error('Error updating task status:', error);
        showToast(error.message || 'Failed to update task status', 'error');
    });
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
                        data-task-id="${task.id}"
                        title="Edit task">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-${task.completed ? 'warning' : 'success'} btn-sm" 
                        onclick="toggleTaskCompletion(${task.id}, ${task.completed})"
                        title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="btn btn-outline-danger btn-sm" 
                        onclick="deleteTask(${task.id})"
                        title="Delete task">Delete</button>
            </div>
        </div>
    `;
}

function handleDragStart(event) {
    draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
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
        console.log('Moving task to new quadrant:', { taskId: draggedTask.id, newQuadrant });

        fetch(`/tasks/${draggedTask.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...draggedTask,
                quadrant: newQuadrant
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            loadTasks();
            showToast('Task moved successfully');
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

function loadTasks(filter = 'all') {
    console.log('Loading tasks with filter:', filter);

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
        console.log('Tasks loaded:', { allTasks, filteredTasks });
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

function filterTasks(filter) {
    loadTasks(filter);
}

function exportTasks() {
    window.location.href = '/tasks/export?filter=all';
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    loadTasks();
});
