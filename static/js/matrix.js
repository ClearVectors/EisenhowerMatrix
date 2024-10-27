// Add drag and drop functionality after the existing code
function initializeDragAndDrop() {
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.addEventListener('dragover', handleDragOver);
        quadrant.addEventListener('dragenter', handleDragEnter);
        quadrant.addEventListener('dragleave', handleDragLeave);
        quadrant.addEventListener('drop', handleDrop);
    });
}

let draggedTask = null;

function handleDragStart(event) {
    draggedTask = tasks.find(t => t.id === parseInt(event.target.dataset.taskId));
    if (!draggedTask) return;

    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', event.target.dataset.taskId);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedTask = null;

    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    if (!draggedTask) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
    if (!draggedTask) return;
    const quadrant = event.currentTarget;
    if (quadrant && quadrant.classList.contains('matrix-quadrant')) {
        quadrant.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const quadrant = event.currentTarget;
    if (quadrant && quadrant.classList.contains('matrix-quadrant')) {
        quadrant.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    
    const quadrant = event.currentTarget;
    if (!quadrant || !quadrant.classList.contains('matrix-quadrant')) return;

    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId || !draggedTask) return;

    const newQuadrant = quadrant.querySelector('.task-list').id;

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrant: newQuadrant })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast('Task moved successfully');
        loadTasks();
    })
    .catch(error => {
        console.error('Error moving task:', error);
        showToast('Failed to move task', 'error');
        loadTasks();
    });
}
