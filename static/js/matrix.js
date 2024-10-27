let tasks = [];
let categories = [];

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Filtering system
function getFilterParameters() {
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    const showCompleted = document.getElementById('filterCompleted');
    
    const params = new URLSearchParams();
    if (dateFrom && dateFrom.value) params.append('date_from', dateFrom.value);
    if (dateTo && dateTo.value) params.append('date_to', dateTo.value);
    params.append('show_completed', showCompleted && showCompleted.checked || false);
    
    const categoryInputs = document.querySelectorAll('input[name="filterCategory"]:checked');
    if (categoryInputs) {
        Array.from(categoryInputs).forEach(input => params.append('categories', input.value));
    }
    
    return params;
}

function filterTasks(filter = 'all') {
    const params = getFilterParameters();
    params.append('filter', filter);
    loadTasks(filter);
}

function clearFilters() {
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo = document.getElementById('filterDateTo');
    const filterCompleted = document.getElementById('filterCompleted');

    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo) filterDateTo.value = '';
    if (filterCompleted) filterCompleted.checked = false;

    document.querySelectorAll('input[name="filterCategory"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    loadTasks();
}

function applyFilters() {
    loadTasks();
    const dropdown = document.querySelector('.filter-controls .dropdown');
    const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
    if (bsDropdown) bsDropdown.hide();
}

// Sorting system
let currentSortBy = 'due_date';
let currentSortOrder = 'asc';

function sortTasks(sortBy, sortOrder) {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    loadTasks();
}

// Task loading and management
function loadTasks(filter = 'all') {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    Object.values(quadrants).forEach(quadrant => {
        if (quadrant) {
            quadrant.innerHTML = '<div class="task-list-loading"><div class="spinner-border text-secondary"></div></div>';
        }
    });

    const params = getFilterParameters();
    params.append('filter', filter);
    params.append('sort_by', currentSortBy);
    params.append('sort_order', currentSortOrder);

    Promise.all([
        fetch('/tasks'),
        fetch(`/tasks?${params.toString()}`)
    ])
    .then(responses => Promise.all(responses.map(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
    })))
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;

        Object.entries(quadrants).forEach(([quadrantId, quadrant]) => {
            if (quadrant) {
                quadrant.innerHTML = '';
                const quadrantTasks = filteredTasks.filter(task => task.quadrant === quadrantId);
                quadrantTasks.forEach(task => {
                    quadrant.innerHTML += createTaskCard(task);
                });
            }
        });

        initializeDragAndDrop();
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        Object.values(quadrants).forEach(quadrant => {
            if (quadrant) {
                quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page to try again.</div>';
            }
        });
        showToast('Failed to load tasks', 'error');
    });
}

// Categories loading and management
function loadCategories() {
    fetch('/categories')
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Categories endpoint not available');
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            categories = Array.isArray(data) ? data : [];
            updateCategoryList();
            updateCategoryDropdowns();
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            categories = [];
            showToast('Failed to load categories', 'error');
        });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadCategories();
    loadTasks();

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Category form
    const newCategoryForm = document.getElementById('newCategoryForm');
    if (newCategoryForm) {
        newCategoryForm.addEventListener('submit', addCategory);
    }

    // Filter form
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter || 'all';
            filterTasks(filter);
        });
    });
}

// Add the rest of the existing functions (createTaskCard, addCategory, etc.)
[Previous functions for task editing, category management, etc. remain unchanged]
