// Adding the new functions right after the existing loadCategories function

function updateFilterCategories() {
    const filterCategories = document.getElementById('filterCategories');
    if (!filterCategories) return;
    
    filterCategories.innerHTML = categories.map(category => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" 
                   value="${category.id}" 
                   id="filterCategory${category.id}"
                   name="filterCategory">
            <label class="form-check-label" for="filterCategory${category.id}">
                <i class="bi ${category.icon}" style="color: ${category.color}"></i>
                ${category.name}
            </label>
        </div>
    `).join('');
}

function getFilterParameters() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const showCompleted = document.getElementById('filterCompleted').checked;
    const selectedCategories = Array.from(document.querySelectorAll('input[name="filterCategory"]:checked'))
        .map(input => input.value);

    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('show_completed', showCompleted);
    selectedCategories.forEach(cat => params.append('categories', cat));
    
    return params;
}

function clearFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterCompleted').checked = false;
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

let currentSortBy = 'due_date';
let currentSortOrder = 'asc';

function sortTasks(sortBy, sortOrder) {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    loadTasks();
}

// Update the existing loadTasks function
function loadTasks(filter = 'all') {
    const quadrants = {
        'urgent-important': document.getElementById('urgent-important'),
        'not-urgent-important': document.getElementById('not-urgent-important'),
        'urgent-not-important': document.getElementById('urgent-not-important'),
        'not-urgent-not-important': document.getElementById('not-urgent-not-important')
    };

    Object.values(quadrants).forEach(quadrant => {
        quadrant.innerHTML = '<div class="task-list-loading"><div class="spinner-border text-secondary"></div></div>';
    });

    // Combine all parameters
    const params = getFilterParameters();
    params.append('filter', filter);
    params.append('sort_by', currentSortBy);
    params.append('sort_order', currentSortOrder);

    Promise.all([
        fetch('/tasks').then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        }),
        fetch(`/tasks?${params.toString()}`).then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
    ])
    .then(([allTasks, filteredTasks]) => {
        tasks = allTasks;
        console.log('Tasks loaded:', tasks);

        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '';
        });

        filteredTasks.forEach(task => {
            if (quadrants[task.quadrant]) {
                quadrants[task.quadrant].innerHTML += createTaskCard(task);
            }
        });

        document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
            quadrant.ondragover = handleDragOver;
            quadrant.ondragenter = handleDragEnter;
            quadrant.ondragleave = handleDragLeave;
            quadrant.ondrop = handleDrop;
        });
    })
    .catch(error => {
        console.error('Error loading tasks:', error);
        Object.values(quadrants).forEach(quadrant => {
            quadrant.innerHTML = '<div class="alert alert-danger">Failed to load tasks. Please refresh the page to try again.</div>';
        });
        showToast('Failed to load tasks', 'error');
    });
}

// Update the document ready event handler
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadTasks();
    
    document.getElementById('newCategoryForm').addEventListener('submit', addCategory);
    // Add event listener to update filter categories when categories are loaded
    document.addEventListener('categoriesLoaded', updateFilterCategories);
});

// Add event dispatch in loadCategories function
function loadCategories() {
    fetch('/categories')
        .then(response => response.json())
        .then(data => {
            categories = data;
            updateCategoryList();
            updateCategoryDropdowns();
            // Dispatch event when categories are loaded
            document.dispatchEvent(new Event('categoriesLoaded'));
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        });
}
