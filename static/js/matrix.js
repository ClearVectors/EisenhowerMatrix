[Previous content up to line 260]

// Task editing
function showEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskCategory').value = task.category?.id || '';
    document.getElementById('editTaskDueDate').value = task.due_date.split('T')[0];
    document.getElementById('editTaskQuadrant').value = task.quadrant;

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
}

function updateTask() {
    const taskId = document.getElementById('editTaskId').value;
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDescription').value.trim();
    const category = document.getElementById('editTaskCategory').value;
    const dueDate = document.getElementById('editTaskDueDate').value;
    const quadrant = document.getElementById('editTaskQuadrant').value;

    if (!title || !dueDate || !quadrant) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title,
            description,
            category_id: category,
            due_date: dueDate,
            quadrant
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast('Task updated successfully');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        loadTasks();
    })
    .catch(error => {
        console.error('Error updating task:', error);
        showToast(error.message || 'Failed to update task', 'error');
    });
}

// Category management
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').classList.remove('d-none');
}

function hideAddCategoryForm() {
    document.getElementById('addCategoryForm').classList.add('d-none');
    document.getElementById('newCategoryForm').reset();
}

function addCategory(event) {
    event.preventDefault();
    const name = document.getElementById('categoryName').value.trim();
    const color = document.getElementById('categoryColor').value;
    const icon = document.getElementById('categoryIcon').value;

    fetch('/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color, icon })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast('Category added successfully');
        hideAddCategoryForm();
        loadCategories();
    })
    .catch(error => {
        console.error('Error adding category:', error);
        showToast(error.message || 'Failed to add category', 'error');
    });
}

function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryIcon').value = category.icon;
    showAddCategoryForm();
}

function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    fetch(`/categories/${categoryId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast('Category deleted successfully');
        loadCategories();
    })
    .catch(error => {
        console.error('Error deleting category:', error);
        showToast(error.message || 'Failed to delete category', 'error');
    });
}

// Task completion
function toggleTaskCompletion(taskId, currentStatus) {
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            completed: !currentStatus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        showToast(`Task marked as ${!currentStatus ? 'complete' : 'incomplete'}`);
        loadTasks();
    })
    .catch(error => {
        console.error('Error updating task:', error);
        showToast('Failed to update task status', 'error');
    });
}

// Export functionality
function exportTasks() {
    window.location.href = '/tasks/export';
}

[Previous initialization code remains unchanged]
