let tasks = [];
let toastTimeout;
let draggedTask = null;
let dragPlaceholder = null;

// Define utility functions at top level
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
    if (addButton) {
        if (loading) {
            addButton.disabled = true;
            addButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        } else {
            addButton.disabled = false;
            addButton.innerHTML = 'Add Task';
        }
    }
}

function validateAddTaskForm() {
    const title = document.getElementById('taskTitle').value.trim();
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;
    const errors = [];

    // Reset previous validation state
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');

    if (!title) {
        errors.push('Title is required');
        document.getElementById('taskTitle').classList.add('is-invalid');
        document.getElementById('taskTitle').nextElementSibling.style.display = 'block';
    }
    if (!dueDate) {
        errors.push('Due date is required');
        document.getElementById('taskDueDate').classList.add('is-invalid');
        document.getElementById('taskDueDate').nextElementSibling.style.display = 'block';
    }
    if (!quadrant) {
        errors.push('Please select a quadrant');
        document.getElementById('taskQuadrant').classList.add('is-invalid');
        document.getElementById('taskQuadrant').nextElementSibling.style.display = 'block';
    }

    return errors;
}

// Define main task functions
function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

    console.log('Adding task with:', { title, description, category, dueDate, quadrant });

    const errors = validateAddTaskForm();
    if (errors.length > 0) {
        showToast(errors.join(', '), 'error');
        return;
    }

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
        if (data.error) {
            throw new Error(data.error);
        }
        console.log('Task added successfully:', data);
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

function loadTasks() {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    // Show loading state in each quadrant
    Object.values(quadrants).forEach(quadrant => {
        if (quadrant) {
            quadrant.innerHTML = '<div class="text-center"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        }
    });

    // Fetch tasks
    Promise.all([
        fetch('/tasks'),
        fetch('/tasks?filter=all')
    ])
    .then(responses => Promise.all(responses.map(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })))
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;
        console.log('Tasks loaded:', tasks);

        // Clear quadrants
        Object.values(quadrants).forEach(quadrant => {
            if (quadrant) quadrant.innerHTML = '';
        });

        // Add tasks to quadrants
        filteredTasks.forEach(task => {
            if (quadrants[task.quadrant]) {
                quadrants[task.quadrant].innerHTML += createTaskCard(task);
            }
        });
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        Object.values(quadrants).forEach(quadrant => {
            if (quadrant) {
                quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page.</div>';
            }
        });
        showToast('Failed to load tasks', 'error');
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
             data-task-id="${task.id}">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">${task.category}</span>
                <small class="text-muted">${formattedDueDate}</small>
            </div>
        </div>
    `;
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modals
    const addTaskModal = document.getElementById('addTaskModal');
    if (addTaskModal) {
        addTaskModal.addEventListener('show.bs.modal', () => {
            document.getElementById('taskForm').reset();
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        });

        // Add form submit handler
        const addTaskButton = document.querySelector('#addTaskModal .btn-primary');
        if (addTaskButton) {
            addTaskButton.onclick = addTask;
        }

        // Add change event listener for quadrant selection
        const taskQuadrant = document.getElementById('taskQuadrant');
        if (taskQuadrant) {
            taskQuadrant.addEventListener('change', function() {
                this.classList.remove('is-invalid');
                if (this.nextElementSibling) {
                    this.nextElementSibling.style.display = 'none';
                }
            });
        }
    }

    // Load initial tasks
    loadTasks();
});
