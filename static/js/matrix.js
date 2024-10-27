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
                <button class="btn btn-outline-secondary btn-sm" 
                        onclick="showEditTaskModal(${task.id})" 
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

function exportTasks() {
    window.location.href = '/tasks/export?filter=all';
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    loadTasks();
});
