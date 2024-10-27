let tasks = [];
let toastTimeout;
let draggedTask = null;

// [Previous functions remain unchanged up to createTaskCard]

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

// [Rest of the file remains unchanged]
