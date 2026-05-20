/**
 * Premium To-Do App
 * Vanilla JS Implementation
 */

// --- DOM Elements ---
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskDate = document.getElementById('task-date');
const taskPriority = document.getElementById('task-priority');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const totalCountEl = document.getElementById('total-count');
const completedCountEl = document.getElementById('completed-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const searchInput = document.getElementById('search-input');
const filtersContainer = document.getElementById('filters');
const liveTimeEl = document.getElementById('live-time');
const liveDateEl = document.getElementById('live-date');
const motivationalQuoteEl = document.getElementById('motivational-quote');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const loadingOverlay = document.getElementById('loading-overlay');
const successSound = document.getElementById('success-sound');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// --- State Management ---
let tasks = JSON.parse(localStorage.getItem('premium_tasks')) || [];
let currentFilter = 'all';
let searchQuery = '';
let draggedItemIndex = null;

// Quotes array
const quotes = [
    "The secret of getting ahead is getting started.",
    "It always seems impossible until it's done.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "Believe you can and you're halfway there.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones."
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Set random quote
    setRandomQuote();
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initial Render
    renderTasks();
    
    // Remove loading overlay
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
    }, 800);
});

// --- Core Functions ---

// Save to localStorage
function saveTasks() {
    localStorage.setItem('premium_tasks', JSON.stringify(tasks));
    updateProgress();
    updateCounters();
}

// Render Tasks
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks.filter(task => {
        const matchesFilter = 
            currentFilter === 'all' || 
            (currentFilter === 'completed' && task.completed) || 
            (currentFilter === 'pending' && !task.completed);
            
        const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filteredTasks.forEach((task, index) => {
            const li = createTaskElement(task, index);
            taskList.appendChild(li);
        });
    }
    
    updateCounters();
    updateProgress();
}

// Create single task DOM element
function createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    li.dataset.priority = task.priority;
    li.draggable = true;
    
    // Format Date
    let dateHtml = '';
    if (task.dueDate) {
        const isOverdue = new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && !task.completed;
        dateHtml = `<span class="due-date ${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-clock"></i> ${formatDate(task.dueDate)}</span>`;
    }

    li.innerHTML = `
        <div class="priority-indicator"></div>
        <label class="checkbox-container">
            <input type="checkbox" class="toggle-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="checkmark"></span>
        </label>
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
                <span><i class="fa-solid fa-flag"></i> ${capitalize(task.priority)}</span>
                ${dateHtml}
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-icon edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;

    // Drag and Drop Events
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('dragend', handleDragEnd);

    return li;
}

// Add Task
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        dueDate: taskDate.value,
        priority: taskPriority.value,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask); // Add to beginning
    saveTasks();
    renderTasks();
    
    // Reset form
    taskInput.value = '';
    taskDate.value = '';
    taskPriority.value = 'low';
});

// Event Delegation for Task Actions (Toggle, Edit, Delete)
taskList.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    const taskId = taskItem.dataset.id;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    // Delete
    if (e.target.closest('.delete-btn')) {
        taskItem.classList.add('removing');
        setTimeout(() => {
            tasks.splice(taskIndex, 1);
            saveTasks();
            renderTasks();
        }, 300); // Wait for animation
    }
    
    // Toggle Complete
    if (e.target.closest('.toggle-checkbox')) {
        const isChecked = e.target.closest('.toggle-checkbox').checked;
        tasks[taskIndex].completed = isChecked;
        
        if (isChecked) {
            playSound();
            checkAllCompleted();
        }
        
        saveTasks();
        renderTasks();
    }
    
    // Edit
    if (e.target.closest('.edit-btn')) {
        const newText = prompt('Edit task:', tasks[taskIndex].text);
        if (newText !== null && newText.trim() !== '') {
            tasks[taskIndex].text = newText.trim();
            saveTasks();
            renderTasks();
        }
    }
});

// Clear Completed
clearCompletedBtn.addEventListener('click', () => {
    const hasCompleted = tasks.some(t => t.completed);
    if (!hasCompleted) return;
    
    if (confirm('Are you sure you want to clear all completed tasks?')) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
    }
});

// Filter & Search
filtersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        currentFilter = e.target.dataset.filter;
        renderTasks();
    }
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTasks();
});

// --- UI Updates ---

function updateCounters() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    totalCountEl.textContent = `${total} task${total !== 1 ? 's' : ''}`;
    completedCountEl.textContent = `${completed} completed`;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    let percent = 0;
    if (total > 0) {
        percent = Math.round((completed / total) * 100);
    }
    
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
}

// Live Clock
function updateClock() {
    const now = new Date();
    liveTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    liveDateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Random Quote
function setRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    motivationalQuoteEl.textContent = `"${quotes[randomIndex]}"`;
}

// --- Drag and Drop Logic ---
let dragStartIndex;

function handleDragStart(e) {
    dragStartIndex = tasks.findIndex(t => t.id === this.dataset.id);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.innerHTML); // Required for Firefox
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    e.stopPropagation();
    const dragEndIndex = tasks.findIndex(t => t.id === this.dataset.id);
    
    if (dragStartIndex !== dragEndIndex) {
        swapTasks(dragStartIndex, dragEndIndex);
        saveTasks();
        renderTasks();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('over');
    });
}

function swapTasks(fromIndex, toIndex) {
    const itemOne = tasks[fromIndex];
    tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, itemOne);
}

// --- Extra Premium Features ---

// Audio 
function playSound() {
    try {
        successSound.currentTime = 0;
        successSound.volume = 0.5;
        const playPromise = successSound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Auto-play was prevented
                console.log("Audio play prevented:", error);
            });
        }
    } catch (e) {
        console.log("Audio error", e);
    }
}

// Check if all tasks completed (trigger confetti)
function checkAllCompleted() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    if (total > 0 && total === completed) {
        fireConfetti();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
});

// --- Utilities ---
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Vanilla JS Confetti Animation ---
let particles = [];
let isConfettiActive = false;

function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

function fireConfetti() {
    if (isConfettiActive) return;
    isConfettiActive = true;
    
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
    particles = [];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: confettiCanvas.width / 2,
            y: confettiCanvas.height / 2 + 100,
            r: Math.random() * 6 + 2,
            dx: Math.random() * 20 - 10,
            dy: Math.random() * -20 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
            tiltAngle: 0
        });
    }
    
    requestAnimationFrame(renderConfetti);
    
    // Stop after 3 seconds
    setTimeout(() => {
        isConfettiActive = false;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }, 4000);
}

function renderConfetti() {
    if (!isConfettiActive) return;
    
    requestAnimationFrame(renderConfetti);
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    particles.forEach((p, index) => {
        p.tiltAngle += p.tiltAngleIncrement;
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle) * 2;
        p.dy += 0.1; // gravity
        p.y += p.dy;
        p.x += p.dx;
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
    });
}
