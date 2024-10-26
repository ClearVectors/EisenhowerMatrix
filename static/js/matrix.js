// Initialize tasks from server data
document.addEventListener('DOMContentLoaded', () => {
    fetch('/tasks')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(tasks => {
            tasks.forEach(task => createTaskElement(task));
            checkDueReminders();
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            alert('Failed to load tasks. Please refresh the page.');
        });
});

// Modal handling
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));

function showAddTask(quadrant) {
    document.getElementById('quadrantInput').value = quadrant;
    document.getElementById('taskInput').value = '';
    document.getElementById('dueDateInput').value = '';
    document.getElementById('reminderCheck').checked = false;
    taskModal.show();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function addTask() {
    const title = document.getElementById('taskInput').value.trim();
    const quadrant = document.getElementById('quadrantInput').value;
    const dueDate = document.getElementById('dueDateInput').value;
    const reminderSet = document.getElementById('reminderCheck').checked;
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            title, 
            quadrant, 
            due_date: dueDate,
            reminder_set: reminderSet
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(task => {
        createTaskElement(task);
        taskModal.hide();
    })
    .catch(error => {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    });
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.id = `task-${task.id}`;
    taskElement.draggable = true;
    
    const dueDate = task.due_date ? formatDate(task.due_date) : '';
    const reminderBadge = task.reminder_set ? '<span class="badge bg-info ms-2">⏰</span>' : '';
    
    taskElement.innerHTML = `
        <div>
            <span>${task.title}</span>
            ${reminderBadge}
            ${dueDate ? `<small class="text-muted d-block">${dueDate}</small>` : ''}
        </div>
        <div>
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   onclick="toggleComplete(${task.id}, this.checked)">
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

// Check for due tasks every minute
setInterval(checkDueReminders, 60000);

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
