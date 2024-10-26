let tasks = [];

function showAddTaskModal(quadrant = '') {
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
        alert('Please fill in all required fields');
        return;
    }

    const task = {
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
        body: JSON.stringify(task)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to add task. Please try again.');
    });
}

function showEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        alert('Task not found.');
        return;
    }

    // Format date for the input field (YYYY-MM-DD)
    const dueDate = new Date(task.due_date);
    const formattedDate = dueDate.toISOString().split('T')[0];

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskCategory').value = task.category;
    document.getElementById('editTaskDueDate').value = formattedDate;
    document.getElementById('editTaskQuadrant').value = task.quadrant;

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
}

function validateTaskData(taskData) {
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

    // Validate form data
    const errors = validateTaskData(task);
    if (errors.length > 0) {
        alert('Please correct the following errors:\n' + errors.join('\n'));
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update task. Please try again.');
    })
    .finally(() => {
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    });
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    fetch(`/tasks/${taskId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to delete task. Please try again.');
    });
}

function toggleTaskCompletion(taskId, completed) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completed })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update task status. Please try again.');
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
        <div class="task-card">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">${task.category}</span>
                <small class="text-muted">${formattedDueDate}</small>
            </div>
            <div class="task-actions mt-3">
                <button class="btn btn-outline-secondary btn-sm edit-task-btn" onclick="showEditTaskModal(${task.id})" data-task-id="${task.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-${task.completed ? 'warning' : 'success'} btn-sm" onclick="toggleTaskCompletion(${task.id}, ${task.completed})">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
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
    })
    .catch(error => {
        console.error('Error:', error);
        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page to try again.</div>';
        });
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
    loadTasks();
});
