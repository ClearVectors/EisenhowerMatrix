let tasks = [];
let toastTimeout;
let draggedTask = null;
let dragPlaceholder = null;

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

function setAddTaskLoadingState(loading) {
    const addButton = document.querySelector('#addTaskModal .btn-primary');
    if (loading) {
        addButton.disabled = true;
        addButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
    } else {
        addButton.disabled = false;
        addButton.innerHTML = 'Add Task';
    }
}

function validateAddTaskForm() {
    const title = document.getElementById('taskTitle').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;
    const errors = [];

    console.log('Validating form with values:', { title, dueDate, quadrant });

    // Reset previous validation state
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    if (!title) {
        errors.push('Title is required');
        document.getElementById('taskTitle').classList.add('is-invalid');
    }
    if (!dueDate) {
        errors.push('Due date is required');
        document.getElementById('taskDueDate').classList.add('is-invalid');
    }
    if (!quadrant) {
        errors.push('Please select a quadrant');
        document.getElementById('taskQuadrant').classList.add('is-invalid');
    }

    return errors;
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    console.log('Adding task with values:', {
        title,
        description,
        category,
        dueDate,
        quadrant
    });

    const errors = validateAddTaskForm();
    if (errors.length > 0) {
        showToast(errors.join(', '), 'error');
        return;
    }

    setAddTaskLoadingState(true);

    const taskData = {
        title,
        description,
        category,
        due_date: dueDate,
        quadrant
    };

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
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
        if (data.error) {
            throw new Error(data.error);
        }
        console.log('Task added successfully:', data);
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        document.getElementById('taskQuadrant').value = '';
        loadTasks();
    })
    .catch(error => {
        console.error('Error adding task:', error);
        showToast(error.message || 'Failed to add task', 'error');
    })
    .finally(() => {
        setAddTaskLoadingState(false);
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

function exportTasks() {
    window.location.href = '/tasks/export';
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
        showToast('Failed to update task', 'error');
    });
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

function createPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'task-card task-placeholder';
    placeholder.innerHTML = '<div class="text-center">Drop here</div>';
    return placeholder;
}

function handleDragStart(event) {
    try {
        draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
        if (!draggedTask) {
            console.error('Task not found:', event.target.dataset.taskId);
            return;
        }

        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', event.target.dataset.taskId);

        dragPlaceholder = createPlaceholder();
        
        event.target.style.opacity = '0.5';
        event.target.style.transform = 'scale(0.95) rotate(-1deg)';

        requestAnimationFrame(() => {
            event.target.style.opacity = '0.5';
        });
    } catch (error) {
        console.error('Error in handleDragStart:', error);
    }
}

function handleDragEnd(event) {
    try {
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
    } catch (error) {
        console.error('Error in handleDragEnd:', error);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(event) {
    try {
        const quadrant = event.target.closest('.matrix-quadrant');
        if (quadrant && draggedTask) {
            quadrant.classList.add('drag-over');
            
            const taskList = quadrant.querySelector('.task-list');
            if (taskList && !taskList.querySelector('.task-placeholder')) {
                taskList.appendChild(dragPlaceholder);
            }
        }
    } catch (error) {
        console.error('Error in handleDragEnter:', error);
    }
}

function handleDragLeave(event) {
    try {
        const quadrant = event.target.closest('.matrix-quadrant');
        if (quadrant) {
            quadrant.classList.remove('drag-over');
            
            const placeholder = quadrant.querySelector('.task-placeholder');
            if (placeholder && !quadrant.contains(event.relatedTarget)) {
                placeholder.remove();
            }
        }
    } catch (error) {
        console.error('Error in handleDragLeave:', error);
    }
}

function handleDrop(event) {
    event.preventDefault();
    
    try {
        const quadrant = event.target.closest('.matrix-quadrant');
        if (!quadrant || !draggedTask) return;

        const newQuadrant = quadrant.querySelector('.task-list').id;
        if (draggedTask.quadrant !== newQuadrant) {
            const taskElement = document.querySelector(`[data-task-id="${draggedTask.id}"]`);
            if (taskElement) {
                taskElement.style.opacity = '0.5';
                quadrant.querySelector('.task-list').appendChild(taskElement);
                
                requestAnimationFrame(() => {
                    taskElement.style.opacity = '1';
                    taskElement.style.transform = 'none';
                });
            }

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
    } catch (error) {
        console.error('Error in handleDrop:', error);
        showToast('Error moving task', 'error');
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});