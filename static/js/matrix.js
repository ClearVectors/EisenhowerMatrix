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

function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const quadrant = document.getElementById('taskQuadrant').value;

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

// Add event listeners for form fields
document.addEventListener('DOMContentLoaded', () => {
    const addTaskModal = document.getElementById('addTaskModal');
    if (addTaskModal) {
        addTaskModal.addEventListener('show.bs.modal', () => {
            document.getElementById('taskForm').reset();
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        });

        // Add change event listener for quadrant selection
        document.getElementById('taskQuadrant').addEventListener('change', function() {
            this.classList.remove('is-invalid');
            this.nextElementSibling.style.display = 'none';
        });
    }
    
    loadTasks();
});

[Rest of the file remains unchanged...]
