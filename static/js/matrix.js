// Theme handling
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update toggle button icons
    const lightIcon = document.querySelector('.theme-icon-light');
    const darkIcon = document.querySelector('.theme-icon-dark');
    
    if (theme === 'light') {
        lightIcon.classList.remove('d-none');
        darkIcon.classList.add('d-none');
    } else {
        lightIcon.classList.add('d-none');
        darkIcon.classList.remove('d-none');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Initialize tasks from server data
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadTasks();
    checkDueReminders();
    
    // Add theme toggle event listener
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// Keep track of all unique tags
let allTags = new Set();

function loadTasks(searchQuery = '', filterType = 'all', tagFilter = '') {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.append('search', searchQuery);
    if (filterType) queryParams.append('filter', filterType);
    if (tagFilter) queryParams.append('tag', tagFilter);

    fetch(`/tasks?${queryParams.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(tasks => {
            // Clear existing tasks
            document.querySelectorAll('.task-list').forEach(list => {
                // Keep the "Add Task" button
                const addButton = list.querySelector('.add-task');
                list.innerHTML = '';
                if (addButton) list.appendChild(addButton);
            });

            // Reset and update tags
            allTags.clear();
            tasks.forEach(task => {
                if (task.tags) {
                    task.tags.forEach(tag => allTags.add(tag));
                }
                createTaskElement(task);
            });

            // Update tag filters
            updateTagFilters();
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            alert('Failed to load tasks. Please refresh the page.');
        });
}

function updateTagFilters() {
    const tagFiltersContainer = document.getElementById('tagFilters');
    tagFiltersContainer.innerHTML = '<span class="me-2">Filter by tag:</span>';
    
    allTags.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-info btn-sm me-2 mb-2';
        button.textContent = tag;
        button.onclick = () => filterByTag(tag);
        tagFiltersContainer.appendChild(button);
    });
}

function filterByTag(tag) {
    loadTasks(document.getElementById('searchInput').value.trim(), 
              document.querySelector('.btn-group .active').textContent.toLowerCase(),
              tag);
}

// Search functionality
function searchTasks() {
    const searchQuery = document.getElementById('searchInput').value.trim();
    const activeFilter = document.querySelector('.btn-group .active').textContent.toLowerCase();
    loadTasks(searchQuery, activeFilter);
}

// Filter functionality
function filterTasks(filterType) {
    // Update active button state
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(filterType)) {
            btn.classList.add('active');
        }
    });

    const searchQuery = document.getElementById('searchInput').value.trim();
    loadTasks(searchQuery, filterType);
}

// Export functionality
function exportTasks() {
    const searchQuery = document.getElementById('searchInput').value.trim();
    const activeFilter = document.querySelector('.btn-group .active').textContent.toLowerCase();
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.append('search', searchQuery);
    if (activeFilter) queryParams.append('filter', activeFilter);
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = `/tasks/export?${queryParams.toString()}`;
    link.download = `tasks_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Modal handling
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));

function showAddTask(quadrant) {
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('quadrantInput').value = quadrant;
    document.getElementById('taskInput').value = '';
    document.getElementById('dueDateInput').value = '';
    document.getElementById('tagsInput').value = '';
    document.getElementById('reminderCheck').checked = false;
    document.getElementById('taskForm').setAttribute('data-action', 'add');
    document.getElementById('taskForm').removeAttribute('data-task-id');
    taskModal.show();
}

function showEditTask(task) {
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('quadrantInput').value = task.quadrant;
    document.getElementById('taskInput').value = task.title;
    document.getElementById('dueDateInput').value = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '';
    document.getElementById('tagsInput').value = task.tags ? task.tags.join(', ') : '';
    document.getElementById('reminderCheck').checked = task.reminder_set;
    document.getElementById('taskForm').setAttribute('data-action', 'edit');
    document.getElementById('taskForm').setAttribute('data-task-id', task.id);
    taskModal.show();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function saveTask() {
    const title = document.getElementById('taskInput').value.trim();
    const quadrant = document.getElementById('quadrantInput').value;
    const dueDate = document.getElementById('dueDateInput').value;
    const reminderSet = document.getElementById('reminderCheck').checked;
    const tags = document.getElementById('tagsInput').value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }

    const taskForm = document.getElementById('taskForm');
    const isEdit = taskForm.getAttribute('data-action') === 'edit';
    const taskId = isEdit ? taskForm.getAttribute('data-task-id') : null;
    
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/tasks/${taskId}` : '/tasks';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            title, 
            quadrant, 
            due_date: dueDate,
            reminder_set: reminderSet,
            tags
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        taskModal.hide();
        loadTasks();
    })
    .catch(error => {
        console.error('Error saving task:', error);
        alert('Failed to save task. Please try again.');
    });
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        fetch(`/tasks/${taskId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(() => {
            loadTasks();
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        });
    }
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.id = `task-${task.id}`;
    taskElement.draggable = true;
    
    const dueDate = task.due_date ? formatDate(task.due_date) : '';
    const reminderBadge = task.reminder_set ? '<span class="badge bg-info ms-2">⏰</span>' : '';
    const tagBadges = task.tags ? task.tags.map(tag => 
        `<span class="badge bg-secondary me-1">${tag}</span>`).join('') : '';
    
    taskElement.innerHTML = `
        <div class="task-content">
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                ${reminderBadge}
            </div>
            <div class="mt-1">${tagBadges}</div>
            ${dueDate ? `<small class="text-muted d-block">${dueDate}</small>` : ''}
        </div>
        <div class="task-actions">
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" onclick="showEditTask(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="deleteTask(${task.id})">
                    <i class="bi bi-trash"></i>
                </button>
                <input type="checkbox" class="btn-check" id="complete-${task.id}" ${task.completed ? 'checked' : ''} 
                       onclick="toggleComplete(${task.id}, this.checked)">
                <label class="btn btn-outline-success" for="complete-${task.id}">
                    <i class="bi bi-check2"></i>
                </label>
            </div>
        </div>
    `;

    taskElement.addEventListener('dragstart', drag);
    const taskList = document.querySelector(`#${task.quadrant} .task-list`);
    if (taskList) {
        taskList.appendChild(taskElement);
    }
}

function toggleComplete(taskId, completed) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
            taskElement.classList.toggle('completed', completed);
        }
    })
    .catch(error => {
        console.error('Error updating task:', error);
        alert('Failed to update task. Please try again.');
    });
}

// Check for due tasks every minute
setInterval(checkDueReminders, 60000);

function checkDueReminders() {
    fetch('/tasks')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(tasks => {
            const now = new Date();
            tasks.forEach(task => {
                if (task.reminder_set && !task.completed && task.due_date) {
                    const dueDate = new Date(task.due_date);
                    const timeDiff = dueDate - now;
                    // Show reminder if due within next hour
                    if (timeDiff > 0 && timeDiff <= 3600000) {
                        showReminder(task);
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error checking reminders:', error);
        });
}

function showReminder(task) {
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification(`Task Due Soon: ${task.title}`, {
                body: `Due at ${formatDate(task.due_date)}`,
                icon: '/static/favicon.ico'
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission()
                .then(permission => {
                    if (permission === "granted") {
                        showReminder(task);
                    }
                });
        }
    }
}

// Drag and Drop functionality
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text");
    const taskElement = document.getElementById(taskId);
    const targetElement = ev.target.closest('.task-list');
    const quadrantElement = ev.target.closest('.matrix-quadrant');
    
    if (!taskElement || !quadrantElement || !targetElement) return;
    
    const newQuadrant = quadrantElement.id;
    const id = taskId.split('-')[1];
    
    fetch(`/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quadrant: newQuadrant })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        targetElement.appendChild(taskElement);
    })
    .catch(error => {
        console.error('Error moving task:', error);
        alert('Failed to move task. Please try again.');
    });
}
