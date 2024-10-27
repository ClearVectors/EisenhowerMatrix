// Keep existing code at the top...

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
            categoryList.innerHTML = '';
            categories.forEach(category => {
                categoryList.innerHTML += createCategoryListItem(category);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
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
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
            showToast('Failed to load category details', 'error');
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Category added successfully');
        hideAddCategoryForm();
        loadCategories();
    })
    .catch(error => {
        console.error('Error adding category:', error);
        showToast('Failed to add category', 'error');
    })
    .finally(() => {
        addButton.disabled = false;
        addButton.textContent = originalText;
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Category updated successfully');
        hideEditCategoryForm();
        loadCategories();
    })
    .catch(error => {
        console.error('Error updating category:', error);
        showToast('Failed to update category', 'error');
    })
    .finally(() => {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        showToast('Category deleted successfully');
        loadCategories();
    })
    .catch(error => {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    });
}

// Initialize categories when modal is shown
document.getElementById('categoriesModal').addEventListener('show.bs.modal', function () {
    loadCategories();
});

// Keep existing code and initialization...
