// Theme handling
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update toggle button icons
    const lightIcon = document.querySelector('.theme-icon-light');
    const darkIcon = document.querySelector('.theme-icon-dark');
    
    if (theme === 'light') {
        lightIcon.classList.remove('d-none');
        darkIcon.classList.add('d-none');
    } else {
        lightIcon.classList.add('d-none');
        darkIcon.classList.remove('d-none');
    }

    // Force a redraw of task items to ensure proper styling
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        item.style.display = 'none';
        item.offsetHeight; // Force reflow
        item.style.display = '';
    });
}

// Rest of the existing code remains the same...
