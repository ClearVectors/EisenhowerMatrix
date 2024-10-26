// Initialize tasks from server data
document.addEventListener('DOMContentLoaded', () => {
    fetch('/tasks')
        .then(response => response.json())
        .then(tasks => {
            tasks.forEach(task => createTaskElement(task));
        });
});

// Modal handling
const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));

function showAddTask(quadrant) {
    document.getElementById('quadrantInput').value = quadrant;
    document.getElementById('taskInput').value = '';
    taskModal.show();
}

function addTask() {
    const title = document.getElementById('taskInput').value.trim();
    const quadrant = document.getElementById('quadrantInput').value;
    
    if (!title) return;

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, quadrant })
    })
    .then(response => response.json())
    .then(task => {
        createTaskElement(task);
        taskModal.hide();
    });
}

function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.id = `task-${task.id}`;
    taskElement.draggable = true;
    
    taskElement.innerHTML = `
        <span>${task.title}</span>
        <div>
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   onclick="toggleComplete(${task.id}, this.checked)">
        </div>
    `;

    taskElement.addEventListener('dragstart', drag);
    document.querySelector(`#${task.quadrant} .task-list`).appendChild(taskElement);
}

function toggleComplete(taskId, completed) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed })
    })
    .then(() => {
        const taskElement = document.getElementById(`task-${taskId}`);
        taskElement.classList.toggle('completed', completed);
    });
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
    const newQuadrant = ev.target.closest('.matrix-quadrant').id;
    
    if (taskElement && newQuadrant) {
        const id = taskId.split('-')[1];
        fetch(`/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quadrant: newQuadrant })
        })
        .then(() => {
            ev.target.closest('.task-list').appendChild(taskElement);
        });
    }
}
