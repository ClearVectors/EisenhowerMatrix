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
            showToast('Failed to load categories', 'error');
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
                if (response.status === 405) {
                    throw new Error('Category editing is not available');
                }
                throw new Error(`Failed to load category: ${response.statusText}`);
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
            showToast(error.message || 'Failed to load category details', 'error');
            hideEditCategoryForm();
        });
}

function hideEditCategoryForm() {
    document.getElementById('editCategoryFormElement').reset();
    document.getElementById('editCategoryForm').style.display = 'none';
    document.getElementById('categoryList').style.display = 'block';
}

function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const icon = document.getElementById('categoryIcon').value;

    if (!name || !color || !icon) {
        showToast('Please fill in all required fields', 'error');
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
            throw new Error(`Failed to add category: ${response.statusText}`);
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
        showToast(error.message || 'Failed to add category', 'error');
    })
    .finally(() => {
        addButton.disabled = false;
        addButton.innerHTML = originalText;
    });
}

function updateCategory() {
    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryName').value.trim();
    const color = document.getElementById('editCategoryColor').value;
    const icon = document.getElementById('editCategoryIcon').value;

    if (!name || !color || !icon) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const saveButton = document.querySelector('#editCategoryForm .btn-primary');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    fetch(`/categories/${id}`, {
        method: 'PUT',
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
            throw new Error(`Failed to update category: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        showToast('Category updated successfully');
        hideEditCategoryForm();
        loadCategories();
    })
    .catch(error => {
        console.error('Error updating category:', error);
        showToast(error.message || 'Failed to update category', 'error');
    })
    .finally(() => {
        saveButton.disabled = false;
        saveButton.innerHTML = originalText;
    });
}

function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    fetch(`/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Failed to delete category: ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        showToast('Category deleted successfully');
        loadCategories();
    })
    .catch(error => {
        console.error('Error deleting category:', error);
        showToast(error.message || 'Failed to delete category', 'error');
    });
}

// Initialize categories when modal is shown
document.getElementById('categoriesModal').addEventListener('show.bs.modal', function () {
    loadCategories();
});

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
            showToast('Failed to load tasks', 'error');
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
            quadrant.innerHTML = '';
        }
    });

    // Add tasks to their respective quadrants
    tasks.forEach(task => {
        if (quadrants[task.quadrant]) {
            quadrants[task.quadrant].innerHTML += createTaskCard(task);
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
            showToast('Failed to filter tasks', 'error');
        });
}
