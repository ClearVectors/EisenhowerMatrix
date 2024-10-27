// Keep existing code and add the following at the end

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

// Update the initialization to load categories
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadCategories();
});
