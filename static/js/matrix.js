// Initialize tasks when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
});

let tasks = [];

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

// Task Card Creation
function createTaskCard(task) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    let statusClass = 'task-future';
    if (dueDate < now) {
        statusClass = 'task-overdue';
    } else if (dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        statusClass = 'task-due-today';
    } else if (dueDate <= weekFromNow) {
        statusClass = 'task-due-this-week';
    }

    return `
        <div class="task-card ${statusClass} ${task.completed ? 'task-completed' : ''}" 
             data-task-id="${task.id}" draggable="true">
            <div class="task-header d-flex justify-content-between align-items-start">
                <h5 class="task-title mb-2">${task.title}</h5>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editTask(${task.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <p class="task-description mb-2">${task.description || ''}</p>
            <div class="task-footer d-flex justify-content-between align-items-center">
                <span class="category-badge category-${task.category}">
                    <i class="bi category-icon"></i>
                    ${task.category}
                </span>
                <span class="task-due-date">
                    <i class="bi bi-calendar"></i>
                    ${new Date(task.due_date).toLocaleDateString()}
                </span>
            </div>
            <div class="status-indicator status-${statusClass.replace('task-', '')}"></div>
        </div>
    `;
}

// Category Management Functions
function loadCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '<div class="text-center"><div class="spinner-border text-secondary"></div></div>';

    fetch('/categories')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(categories => {
            categoryList.innerHTML = categories.length ? '' : '<div class="text-center text-muted">No categories found</div>';
            categories.forEach(category => {
                categoryList.innerHTML += createCategoryListItem(category);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            categoryList.innerHTML = '<div class="alert alert-danger">Failed to load categories</div>';
            showToast('Failed to load categories', 'danger');
        });
}

function createCategoryListItem(category) {
    return `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
                <i class="bi ${category.icon}" style="color: ${category.color}"></i>
                <span>${category.name}</span>
            </div>
            <div class="btn-group">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="showEditCategoryForm(${category.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Category form management
function showAddCategoryForm() {
    document.getElementById('categoryList').style.display = 'none';
    document.getElementById('addCategoryForm').style.display = 'block';
}

function hideAddCategoryForm() {
    document.getElementById('categoryForm').reset();
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('categoryList').style.display = 'block';
}

function showEditCategoryForm(categoryId) {
    fetch(`/categories/${categoryId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.status === 404 ? 'Category not found' : 'Failed to load category');
            }
            return response.json();
        })
        .then(category => {
            document.getElementById('editCategoryId').value = category.id;
            document.getElementById('editCategoryName').value = category.name;
            document.getElementById('editCategoryColor').value = category.color;
            document.getElementById('editCategoryIcon').value = category.icon;

            document.getElementById('categoryList').style.display = 'none';
            document.getElementById('editCategoryForm').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading category:', error);
            showToast(error.message, 'danger');
        });
}

function hideEditCategoryForm() {
    document.getElementById('editCategoryFormElement').reset();
    document.getElementById('editCategoryForm').style.display = 'none';
    document.getElementById('categoryList').style.display = 'block';
}

// Category CRUD operations
function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const icon = document.getElementById('categoryIcon').value;

    if (!name || !color || !icon) {
        showToast('Please fill in all required fields', 'danger');
        return;
    }

    const addButton = document.querySelector('#addCategoryForm .btn-primary');
    const originalText = addButton.textContent;
    addButton.disabled = true;
    addButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';

    fetch('/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color, icon })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error('Category name must be unique');
            }
            throw new Error('Failed to add category');
        }
        return response.json();
    })
    .then(data => {
        showToast('Category added successfully');
        hideAddCategoryForm();
        loadCategories();
    })
    .catch(error => {
        console.error('Error adding category:', error);
        showToast(error.message, 'danger');
    })
    .finally(() => {
        addButton.disabled = false;
        addButton.innerHTML = originalText;
    });
}

// Task Management Functions
function loadTasks() {
    fetch('/tasks')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(tasksData => {
            tasks = tasksData;
            updateTasksUI(tasks);
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
            showToast('Failed to load tasks', 'danger');
        });
}

function updateTasksUI(tasks) {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    // Clear existing tasks
    Object.values(quadrants).forEach(quadrant => {
        if (quadrant) {
            const title = quadrant.querySelector('.quadrant-title');
            quadrant.innerHTML = '';
            if (title) quadrant.appendChild(title);
        }
    });

    // Add tasks to their respective quadrants
    tasks.forEach(task => {
        if (quadrants[task.quadrant]) {
            const taskElement = document.createElement('div');
            taskElement.innerHTML = createTaskCard(task);
            quadrants[task.quadrant].appendChild(taskElement.firstElementChild);
        }
    });
}

// Export functionality
function exportTasks() {
    window.location.href = '/tasks/export';
}

// Filter functionality
function filterTasks(filter = 'all') {
    fetch(`/tasks?filter=${filter}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(filteredTasks => {
            updateTasksUI(filteredTasks);
        })
        .catch(error => {
            console.error('Error filtering tasks:', error);
            showToast('Failed to filter tasks', 'danger');
        });
}

// Add Task function
function addTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const quadrant = document.getElementById('taskQuadrant').value;
    const dueDate = document.getElementById('taskDueDate').value;

    if (!title || !category || !quadrant || !dueDate) {
        showToast('Please fill in all required fields', 'danger');
        return;
    }

    const addButton = document.querySelector('#addTaskModal .btn-primary');
    const originalText = addButton.textContent;
    addButton.disabled = true;
    addButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';

    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
            description,
            category,
            quadrant,
            due_date: dueDate
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to add task');
        return response.json();
    })
    .then(task => {
        showToast('Task added successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        document.getElementById('taskForm').reset();
        loadTasks();
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Failed to add task: ' + error.message, 'danger');
    })
    .finally(() => {
        addButton.disabled = false;
        addButton.innerHTML = originalText;
    });
}

// Initialize categories when Add Task modal is shown
document.getElementById('addTaskModal').addEventListener('show.bs.modal', function () {
    const categorySelect = document.getElementById('taskCategory');
    categorySelect.innerHTML = '<option value="">Loading categories...</option>';
    categorySelect.disabled = true;

    fetch('/categories')
        .then(response => response.json())
        .then(categories => {
            categorySelect.innerHTML = '<option value="">Select category</option>';
            categories.forEach(category => {
                categorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            categorySelect.innerHTML = '<option value="">Failed to load categories</option>';
        })
        .finally(() => {
            categorySelect.disabled = false;
        });
});

// Initialize categories when Categories modal is shown
document.getElementById('categoriesModal').addEventListener('show.bs.modal', function () {
    loadCategories();
});
