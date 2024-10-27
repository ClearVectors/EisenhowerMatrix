let tasks = [];
let toastTimeout;
let draggedTask = null;
let dragPlaceholder = null;

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

    if (!title) errors.push('Title is required');
    if (!dueDate) errors.push('Due date is required');
    if (!quadrant) errors.push('Please select a quadrant');

    return errors;
}

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    console.log('Adding task with quadrant:', quadrant); // Debug log

    // Validate form
    const errors = validateAddTaskForm();
    if (errors.length > 0) {
        showToast(errors.join(', '), 'error');
        return;
    }

    // Show loading state
    setAddTaskLoadingState(true);

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
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Task added successfully:', data); // Debug log
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
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

// Drag and drop related functions
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

        // Create and store placeholder
        dragPlaceholder = createPlaceholder();
        
        // Add visual feedback
        event.target.style.opacity = '0.5';
        event.target.style.transform = 'scale(0.95) rotate(-1deg)';

        // Delay to ensure proper visual feedback
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

        // Remove placeholder if it exists
        if (dragPlaceholder && dragPlaceholder.parentNode) {
            dragPlaceholder.parentNode.removeChild(dragPlaceholder);
        }
        dragPlaceholder = null;

        // Remove all drag-over effects
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
            
            // Add placeholder at the end of the task list
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
            
            // Remove placeholder if mouse leaves the quadrant
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
            // Show loading state
            const taskElement = document.querySelector(`[data-task-id="${draggedTask.id}"]`);
            if (taskElement) {
                taskElement.style.opacity = '0.5';
                quadrant.querySelector('.task-list').appendChild(taskElement);
                
                // Smooth animation for task movement
                requestAnimationFrame(() => {
                    taskElement.style.opacity = '1';
                    taskElement.style.transform = 'none';
                });
            }

            // Send update to server
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
                showToast('Failed to move task', 'error');
                loadTasks(); // Reload to restore original position
            });
        }

        quadrant.classList.remove('drag-over');
    } catch (error) {
        console.error('Error in handleDrop:', error);
        showToast('Error moving task', 'error');
    }
    return false;
}

// Rest of the existing functions remain the same...
[Previous content from line 228 to the end remains exactly the same]
