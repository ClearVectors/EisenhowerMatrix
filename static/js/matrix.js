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
    .then(response => response.json())
    .then(data => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();
    })
    .catch(error => console.error('Error:', error));
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    fetch(`/tasks/${taskId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadTasks();
        }
    })
    .catch(error => console.error('Error:', error));
}

function toggleTaskCompletion(taskId, completed) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completed })
    })
    .then(response => response.json())
    .then(data => {
        loadTasks();
    })
    .catch(error => console.error('Error:', error));
}

function createTaskCard(task) {
    return `
        <div class="task-card">
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">${task.category}</span>
                <small class="text-muted">${new Date(task.due_date).toLocaleDateString()}</small>
            </div>
            <div class="task-actions">
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleTaskCompletion(${task.id}, ${task.completed})">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        </div>
    `;
}

function loadTasks(filter = 'all') {
    Promise.all([
        fetch('/tasks').then(response => response.json()),
        fetch(`/tasks?filter=${filter}`).then(response => response.json())
    ])
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;

        const quadrants = {
            'urgent-important': document.getElementById('urgent-important'),
            'not-urgent-important': document.getElementById('not-urgent-important'),
            'urgent-not-important': document.getElementById('urgent-not-important'),
            'not-urgent-not-important': document.getElementById('not-urgent-not-important')
        };

        // Clear existing tasks
        for (const quadrant in quadrants) {
            quadrants[quadrant].innerHTML = '';
        }

        // Display filtered tasks
        filteredTasks.forEach(task => {
            if (quadrants[task.quadrant]) {
                quadrants[task.quadrant].innerHTML += createTaskCard(task);
            }
        });
    })
    .catch(error => console.error('Error:', error));
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
