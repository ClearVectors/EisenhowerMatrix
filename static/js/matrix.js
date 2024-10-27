function loadTasks() {
    fetch('/tasks')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(tasks => {
            // Clear existing tasks
            document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
            
            // Sort tasks by due date
            tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            
            // Add tasks to appropriate quadrants
            tasks.forEach(task => {
                const taskElement = createTaskElement(task);
                document.getElementById(task.quadrant).appendChild(taskElement);
            });
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            showToast('Failed to load tasks', 'error');
        });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-card';
    taskDiv.id = `task-${task.id}`;
    taskDiv.draggable = true;
    
    // Add drag event listeners
    taskDiv.addEventListener('dragstart', handleDragStart);
    taskDiv.addEventListener('dragend', handleDragEnd);
    
    // Calculate due date status
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    let statusClass = '';
    if (dueDate < today) {
        statusClass = 'overdue';
    } else if (dueDate < tomorrow) {
        statusClass = 'due-today';
    } else if (dueDate < nextWeek) {
        statusClass = 'due-this-week';
    }
    
    if (statusClass) {
        taskDiv.classList.add(statusClass);
    }
    
    taskDiv.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${task.title}</h3>
            <div class="task-actions">
                <button class="btn btn-sm btn-outline-secondary" onclick="editTask(${task.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        <p class="task-description">${task.description || ''}</p>
        <div class="task-footer">
            <span class="category-badge" style="--category-color: ${getCategoryColor(task.category)}">
                <i class="bi ${getCategoryIcon(task.category)}"></i>
                ${task.category}
            </span>
            <span class="due-date">${formatDate(task.due_date)}</span>
        </div>
    `;
    
    return taskDiv;
}

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getCategoryColor(categoryName) {
    const category = categories.find(c => c.name === categoryName);
    return category ? category.color : '#6C757D';
}

function getCategoryIcon(categoryName) {
    const category = categories.find(c => c.name === categoryName);
    return category ? category.icon : 'bi-tag';
}

// Toast notification function
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast show ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// Drag and Drop handlers
let draggedTask = null;

function handleDragStart(event) {
    draggedTask = event.target;
    event.target.style.opacity = '0.4';
    event.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(event) {
    event.target.style.opacity = '';
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    event.preventDefault();
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

    const taskId = draggedTask.id.split('-')[1];
    const newQuadrant = quadrant.querySelector('.task-list').id;

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quadrant: newQuadrant })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(() => {
        showToast('Task moved successfully');
        loadTasks();
    })
    .catch(error => {
        console.error('Error moving task:', error);
        showToast('Failed to move task', 'error');
        loadTasks();
    });

    quadrant.classList.remove('drag-over');
    return false;
}

// Category Management
let categories = [];
let editingCategoryId = null;

function loadCategories() {
    return fetch('/categories')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            categories = data;
            updateCategorySelects();
            updateCategoryList();
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        });
}

function updateCategorySelects() {
    const selects = ['taskCategory', 'editTaskCategory'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = categories.map(category => 
                `<option value="${category.name}" data-color="${category.color}" data-icon="${category.icon}">
                    ${category.name}
                </option>`
            ).join('');
        }
    });
}

function updateCategoryList() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;

    categoryList.innerHTML = categories.map(category => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <i class="bi ${category.icon}" style="color: ${category.color}"></i>
                <span class="ms-2">${category.name}</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary" onclick="editCategory(${category.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showAddCategoryForm() {
    editingCategoryId = null;
    const form = document.getElementById('categoryForm');
    form.classList.remove('d-none');
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryColor').value = '#6C757D';
    document.getElementById('categoryIcon').value = 'bi-tag';
}

function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    editingCategoryId = categoryId;
    const form = document.getElementById('categoryForm');
    form.classList.remove('d-none');
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryIcon').value = category.icon;
}

function cancelCategoryEdit() {
    editingCategoryId = null;
    document.getElementById('categoryForm').classList.add('d-none');
}

function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const icon = document.getElementById('categoryIcon').value;

    if (!name) {
        showToast('Category name is required', 'error');
        return;
    }

    const method = editingCategoryId ? 'PUT' : 'POST';
    const url = editingCategoryId ? `/categories/${editingCategoryId}` : '/categories';

    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color, icon })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(() => {
        showToast(`Category ${editingCategoryId ? 'updated' : 'added'} successfully`);
        loadCategories();
        cancelCategoryEdit();
    })
    .catch(error => {
        console.error('Error saving category:', error);
        showToast(`Failed to ${editingCategoryId ? 'update' : 'add'} category`, 'error');
    });
}

function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    fetch(`/categories/${categoryId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(() => {
        showToast('Category deleted successfully');
        loadCategories();
    })
    .catch(error => {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadCategories();

    // Set up drag and drop handlers for quadrants
    document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
        quadrant.addEventListener('dragover', handleDragOver);
        quadrant.addEventListener('dragenter', handleDragEnter);
        quadrant.addEventListener('dragleave', handleDragLeave);
        quadrant.addEventListener('drop', handleDrop);
    });
});
