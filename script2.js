const taskGroups = document.getElementById("task-groups");
const inputBox = document.getElementById("input-box");
const addTaskBtn = document.getElementById("add-task-btn");
const taskModal = document.getElementById("task-modal");
const modalTitle = document.getElementById("modal-title");
const saveTaskBtn = document.getElementById("save-task");
const cancelTaskBtn = document.getElementById("cancel-task");
const themeToggle = document.getElementById("theme-toggle");
const categorySelect = document.getElementById("category-select");
const prioritySelect = document.getElementById("priority-select");
const statusSelect = document.getElementById("status-select");
const searchInput = document.getElementById("search-input");
const voiceInputBtn = document.getElementById("voice-input");
const snackbar = document.getElementById("snackbar");
const snackbarMessage = document.getElementById("snackbar-message");
const snackbarAction = document.getElementById("snackbar-action");
const voiceModal = document.getElementById("voice-modal");
const voiceText = document.querySelector(".voice-text");
const voiceTranscript = document.querySelector(".voice-transcript");
const stopVoiceBtn = document.getElementById("stop-voice");

let editingTaskId = null;
let deletedTasks = [];
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let recognition = null;
let isListening = false;
let commandTimeout = null;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        voiceModal.classList.add("show");
        document.querySelector(".voice-content").classList.add("recording");
        voiceText.textContent = "Listening...";
        stopVoiceBtn.classList.add("show");
    };

    recognition.onend = () => {
        isListening = false;
        voiceModal.classList.remove("show");
        document.querySelector(".voice-content").classList.remove("recording");
        voiceInputBtn.classList.remove("recording");
        stopVoiceBtn.classList.remove("show");
        if (commandTimeout) {
            clearTimeout(commandTimeout);
            commandTimeout = null;
        }
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join("");

        voiceTranscript.textContent = transcript;
        
        // Clear any existing timeout
        if (commandTimeout) {
            clearTimeout(commandTimeout);
        }
        
        // Set a new timeout to process the command after a brief pause
        commandTimeout = setTimeout(() => {
            processVoiceCommand(transcript.toLowerCase());
            // Auto-stop after processing the command
            if (isListening) {
                stopListening();
            }
        }, 1000); // Wait 1 second after last speech before processing
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            voiceText.textContent = "No speech detected. Try again.";
        } else {
            voiceText.textContent = `Error: ${event.error}`;
        }
        setTimeout(() => {
            recognition.stop();
        }, 1500);
    };
}

// Voice Input Button Events
voiceInputBtn.addEventListener("mousedown", startListening);
voiceInputBtn.addEventListener("mouseup", stopListening);
voiceInputBtn.addEventListener("mouseleave", stopListening);

// Touch Events for Mobile
voiceInputBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startListening();
});

voiceInputBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    stopListening();
});

stopVoiceBtn.addEventListener("click", () => {
    if (isListening) {
        stopListening();
        showSnackbar("Voice input stopped", null);
    }
});

function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
            voiceInputBtn.classList.add("recording");
        } catch (error) {
            console.error("Error starting recognition:", error);
            showSnackbar("Error starting voice recognition. Please try again.", null);
        }
    }
}

function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        voiceInputBtn.classList.remove("recording");
        if (commandTimeout) {
            clearTimeout(commandTimeout);
            commandTimeout = null;
        }
    }
}

function processVoiceCommand(transcript) {
    // Command patterns
    const addTaskPattern = /add task:?\s*(.+)/i;
    const setPriorityPattern = /set priority\s*(high|medium|low)/i;
    const setDueDatePattern = /(due|set due date)\s*(today|tomorrow|next week)/i;
    const setCategoryPattern = /category\s*(work|personal|urgent)/i;
    const markImportantPattern = /mark as important/i;
    const deleteTaskPattern = /delete task/i;
    const completeTaskPattern = /complete task/i;

    // Process "Add Task" command
    const addTaskMatch = transcript.match(addTaskPattern);
    if (addTaskMatch) {
        const taskText = addTaskMatch[1].trim();
        showModal();
        inputBox.value = taskText;
        voiceText.textContent = `Adding task: "${taskText}"`;
        return;
    }

    // Process "Set Priority" command
    const setPriorityMatch = transcript.match(setPriorityPattern);
    if (setPriorityMatch && taskModal.classList.contains("show")) {
        const priority = setPriorityMatch[1].toLowerCase();
        document.getElementById("task-priority").value = priority;
        voiceText.textContent = `Setting priority to ${priority}`;
        return;
    }

    // Process "Due Date" command
    const setDueDateMatch = transcript.match(setDueDatePattern);
    if (setDueDateMatch && taskModal.classList.contains("show")) {
        const dueDateText = setDueDateMatch[2].toLowerCase();
        const dueDate = new Date();
        
        switch (dueDateText) {
            case 'today':
                break;
            case 'tomorrow':
                dueDate.setDate(dueDate.getDate() + 1);
                break;
            case 'next week':
                dueDate.setDate(dueDate.getDate() + 7);
                break;
        }
        
        document.getElementById("task-due-date").value = dueDate.toISOString().split('T')[0];
        voiceText.textContent = `Setting due date to ${dueDateText}`;
        return;
    }

    // Process "Category" command
    const setCategoryMatch = transcript.match(setCategoryPattern);
    if (setCategoryMatch && taskModal.classList.contains("show")) {
        const category = setCategoryMatch[1].toLowerCase();
        document.getElementById("task-category").value = category;
        voiceText.textContent = `Setting category to ${category}`;
        return;
    }

    // Process "Mark as Important" command
    if (markImportantPattern.test(transcript) && taskModal.classList.contains("show")) {
        document.getElementById("task-important").checked = true;
        voiceText.textContent = "Marking task as important";
        return;
    }

    // Process "Delete Task" command
    if (deleteTaskPattern.test(transcript)) {
        const selectedTask = document.querySelector(".task-item.selected");
        if (selectedTask) {
            deleteTask(selectedTask.dataset.id);
            voiceText.textContent = "Deleting selected task";
        } else {
            voiceText.textContent = "No task selected";
        }
        return;
    }

    // Process "Complete Task" command
    if (completeTaskPattern.test(transcript)) {
        const selectedTask = document.querySelector(".task-item.selected");
        if (selectedTask) {
            toggleTask(selectedTask.dataset.id);
            voiceText.textContent = "Marking task as complete";
        } else {
            voiceText.textContent = "No task selected";
        }
        return;
    }

    // If no command matches, show the transcript
    voiceText.textContent = "Command not recognized";
}

// Close voice modal when clicking outside
voiceModal.addEventListener("click", (e) => {
    if (e.target === voiceModal) {
        stopListening();
    }
});

// Voice Input
voiceInputBtn.addEventListener("click", () => {
    if (recognition) {
        voiceInputBtn.classList.add('recording');
        recognition.start();
    } else {
        showSnackbar("Speech recognition is not supported in your browser", null);
    }
});

// Search functionality
searchInput.addEventListener("input", debounce(() => {
    renderTasks();
}, 300));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && document.activeElement === inputBox) {
        e.preventDefault();
        saveTaskBtn.click();
    }
    if (e.key === "Delete" && !taskModal.classList.contains("show")) {
        const selectedTask = document.querySelector(".task-item.selected");
        if (selectedTask) {
            deleteTask(selectedTask.dataset.id);
        }
    }
    if (e.key === "Escape") {
        hideModal();
        if (isListening) {
            stopListening();
        }
    }
    if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        navigateTask('next', document.querySelector('.task-item.selected'));
    }
    if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        navigateTask('prev', document.querySelector('.task-item.selected'));
    }
    if (e.key === " ") {
        e.preventDefault();
        const activeTask = document.querySelector('.task-item.selected');
        if (activeTask) {
            const checkbox = activeTask.querySelector('.checkbox');
            checkbox.click();
        }
    }
});

// Task management
function createTaskElement(task) {
    const div = document.createElement("div");
    div.className = `task-item ${task.completed ? 'checked' : ''} ${task.important ? 'important' : ''}`;
    div.dataset.id = task.id;
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date();
    
    div.innerHTML = `
        <div class="checkbox"></div>
        <div class="task-content">
            <div class="task-text">${task.text}</div>
            <div class="task-meta">
                <span class="task-category">${task.category}</span>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.recurring ? `<span class="task-recurring">${task.recurring}</span>` : ''}
                ${dueDate ? `<span class="task-due-date ${isOverdue ? 'urgent' : ''}">${formatDueDate(dueDate)}</span>` : ''}
            </div>
            ${task.subtasks && task.subtasks.length > 0 ? `
                <div class="subtasks">
                    ${task.subtasks.map(subtask => `
                        <div class="subtask-item ${subtask.completed ? 'checked' : ''}" data-subtask-id="${subtask.id}">
                            <div class="checkbox"></div>
                            <span>${subtask.text}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="task-actions">
            <button onclick="editTask('${task.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteTask('${task.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

function formatDueDate(date) {
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 7) return `Due in ${days} days`;
    return date.toLocaleDateString();
}

function showModal(isEdit = false) {
    modalTitle.textContent = isEdit ? "Edit Task" : "Add New Task";
    taskModal.classList.add("show");
    inputBox.focus();
}

function hideModal() {
    taskModal.classList.remove("show");
    inputBox.value = "";
    document.getElementById("task-due-date").value = "";
    document.getElementById("task-recurring").value = "none";
    document.getElementById("task-important").checked = false;
    document.querySelector(".subtasks-list").innerHTML = "";
    editingTaskId = null;
}

function addTask() {
    const text = inputBox.value.trim();
    if (!text) {
        showSnackbar("Please enter a task", null);
        return;
    }

    const task = {
        id: editingTaskId || Date.now().toString(),
        text: text,
        completed: false,
        category: document.getElementById("task-category").value,
        priority: document.getElementById("task-priority").value,
        dueDate: document.getElementById("task-due-date").value,
        recurring: document.getElementById("task-recurring").value,
        important: document.getElementById("task-important").checked,
        subtasks: Array.from(document.querySelectorAll(".subtask-input"))
            .map(input => ({
                id: Date.now().toString() + Math.random(),
                text: input.value.trim(),
                completed: false
            }))
            .filter(subtask => subtask.text),
        timestamp: Date.now()
    };

    if (editingTaskId) {
        const index = tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
            task.completed = tasks[index].completed;
            tasks[index] = task;
        }
    } else {
        tasks.push(task);
    }

    saveTasks();
    hideModal();
    renderTasks();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editingTaskId = id;
        inputBox.value = task.text;
        document.getElementById("task-category").value = task.category;
        document.getElementById("task-priority").value = task.priority;
        document.getElementById("task-due-date").value = task.dueDate || "";
        document.getElementById("task-recurring").value = task.recurring || "none";
        document.getElementById("task-important").checked = task.important || false;
        
        const subtasksList = document.querySelector(".subtasks-list");
        subtasksList.innerHTML = "";
        if (task.subtasks) {
            task.subtasks.forEach(subtask => {
                addSubtaskInput(subtask.text);
            });
        }
        
        showModal(true);
    }
}

function deleteTask(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        deletedTasks.push(deletedTask);
        saveTasks();
        renderTasks();
        showSnackbar("Task deleted", "Undo", () => {
            tasks.splice(taskIndex, 0, deletedTask);
            deletedTasks.pop();
            saveTasks();
            renderTasks();
        });
    }
}

function toggleTask(id, isSubtask = false, parentId = null) {
    if (isSubtask && parentId) {
        const parentTask = tasks.find(t => t.id === parentId);
        if (parentTask) {
            const subtask = parentTask.subtasks.find(s => s.id === id);
            if (subtask) {
                subtask.completed = !subtask.completed;
            }
        }
    } else {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
        }
    }
    saveTasks();
    renderTasks();
}

function addSubtaskInput(value = "") {
    const subtasksList = document.querySelector(".subtasks-list");
    const div = document.createElement("div");
    div.className = "subtask-input";
    div.innerHTML = `
        <input type="text" placeholder="Enter subtask" value="${value}">
        <button type="button" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    subtasksList.appendChild(div);
}

function filterTasks() {
    const category = categorySelect.value;
    const priority = prioritySelect.value;
    const status = statusSelect.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    return tasks.filter(task => {
        const categoryMatch = category === 'all' || task.category === category;
        const priorityMatch = priority === 'all' || task.priority === priority;
        const statusMatch = status === 'all' || 
            (status === 'completed' && task.completed) || 
            (status === 'pending' && !task.completed);
        const searchMatch = task.text.toLowerCase().includes(searchTerm);
        
        return categoryMatch && priorityMatch && statusMatch && searchMatch;
    });
}

function groupTasks(filteredTasks) {
    const groups = {};
    
    filteredTasks.forEach(task => {
        const groupKey = task.category;
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(task);
    });
    
    return groups;
}

function renderTasks() {
    const filteredTasks = filterTasks();
    const groups = groupTasks(filteredTasks);
    taskGroups.innerHTML = "";
    
    Object.entries(groups).forEach(([category, categoryTasks]) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "task-group";
        
        groupDiv.innerHTML = `
            <div class="group-header">
                <h3>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                    ${category} (${categoryTasks.length})
                </h3>
            </div>
            <div class="task-list">
                ${categoryTasks.map(task => createTaskElement(task).outerHTML).join('')}
            </div>
        `;
        
        taskGroups.appendChild(groupDiv);
    });
    
    updateStats();
    initializeGroupToggles();
}

function initializeGroupToggles() {
    document.querySelectorAll(".group-header").forEach(header => {
        header.addEventListener("click", () => {
            header.classList.toggle("collapsed");
            const taskList = header.nextElementSibling;
            taskList.classList.toggle("collapsed");
        });
    });
}

function showSnackbar(message, actionText, actionCallback = null) {
    snackbarMessage.textContent = message;
    
    if (actionText && actionCallback) {
        snackbarAction.textContent = actionText;
        snackbarAction.style.display = "block";
        snackbarAction.onclick = actionCallback;
    } else {
        snackbarAction.style.display = "none";
    }
    
    snackbar.classList.add("show");
    setTimeout(() => {
        snackbar.classList.remove("show");
    }, 3000);
}

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Event Listeners
addTaskBtn.addEventListener("click", () => showModal());
saveTaskBtn.addEventListener("click", addTask);
cancelTaskBtn.addEventListener("click", hideModal);
document.getElementById("add-subtask").addEventListener("click", () => addSubtaskInput());

categorySelect.addEventListener("change", renderTasks);
prioritySelect.addEventListener("change", renderTasks);
statusSelect.addEventListener("change", renderTasks);

taskGroups.addEventListener("click", (e) => {
    if (e.target.classList.contains("checkbox")) {
        const taskItem = e.target.closest(".task-item");
        const subtaskItem = e.target.closest(".subtask-item");
        
        if (subtaskItem && taskItem) {
            toggleTask(subtaskItem.dataset.subtaskId, true, taskItem.dataset.id);
        } else if (taskItem) {
            toggleTask(taskItem.dataset.id);
        }
    }
});

// Check for recurring tasks
setInterval(() => {
    const now = new Date();
    tasks.forEach(task => {
        if (task.recurring && task.completed) {
            const dueDate = new Date(task.dueDate);
            if (dueDate <= now) {
                switch (task.recurring) {
                    case 'daily':
                        task.dueDate = new Date(dueDate.setDate(dueDate.getDate() + 1)).toISOString();
                        break;
                    case 'weekly':
                        task.dueDate = new Date(dueDate.setDate(dueDate.getDate() + 7)).toISOString();
                        break;
                    case 'monthly':
                        task.dueDate = new Date(dueDate.setMonth(dueDate.getMonth() + 1)).toISOString();
                        break;
                }
                task.completed = false;
                saveTasks();
                renderTasks();
            }
        }
    });
}, 60000); // Check every minute

// Theme toggle
themeToggle.addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "" : "dark";
    localStorage.setItem("theme", document.body.dataset.theme);
    updateThemeIcon();
});

function updateThemeIcon() {
    const isDark = document.body.dataset.theme === "dark";
    themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
}

// Load saved theme
document.body.dataset.theme = localStorage.getItem("theme") || "";
updateThemeIcon();

// Initialize drag and drop for task groups
document.querySelectorAll('.task-list').forEach(taskList => {
    new Sortable(taskList, {
        animation: 150,
        ghostClass: 'dragging',
        group: 'tasks',
        onEnd: () => {
            updateTasksOrder();
            saveTasks();
        }
    });
});

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const progress = total === 0 ? 0 : (completed / total) * 100;
    const important = tasks.filter(task => task.important).length;
    const overdue = tasks.filter(task => {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }).length;

    document.getElementById("total-tasks").textContent = `Total: ${total}`;
    document.getElementById("completed-tasks").textContent = `Completed: ${completed}`;
    document.getElementById("progress").style.width = `${progress}%`;

    // Update stats in the header if elements exist
    const statsContainer = document.querySelector('.task-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <div class="stats">
                <span>Total: ${total}</span>
                <span>Completed: ${completed}</span>
                ${important ? `<span>Important: ${important}</span>` : ''}
                ${overdue ? `<span class="overdue">Overdue: ${overdue}</span>` : ''}
            </div>
        `;
    }
}

function updateTasksOrder() {
    document.querySelectorAll('.task-list').forEach(taskList => {
        const categoryName = taskList.closest('.task-group').querySelector('h3').textContent.split(' (')[0].trim();
        const taskElements = Array.from(taskList.children);
        
        taskElements.forEach((taskElement, index) => {
            const taskId = taskElement.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.order = index;
                task.category = categoryName;
            }
        });
    });
    
    // Sort tasks based on their new order
    tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    saveTasks();
}

// Handle keyboard shortcuts for task navigation
document.addEventListener('keydown', (e) => {
    if (taskModal.classList.contains('show')) return; // Don't handle if modal is open
    
    const activeTask = document.querySelector('.task-item.selected');
    
    switch(e.key) {
        case 'j':
        case 'ArrowDown':
            e.preventDefault();
            navigateTask('next', activeTask);
            break;
        case 'k':
        case 'ArrowUp':
            e.preventDefault();
            navigateTask('prev', activeTask);
            break;
        case ' ':
            e.preventDefault();
            if (activeTask) {
                const checkbox = activeTask.querySelector('.checkbox');
                checkbox.click();
            }
            break;
        case 'Escape':
            e.preventDefault();
            hideModal();
            if (isListening) {
                stopListening();
            }
            break;
    }
});

function navigateTask(direction, activeTask) {
    const tasks = Array.from(document.querySelectorAll('.task-item'));
    if (!tasks.length) return;
    
    if (!activeTask) {
        tasks[0].classList.add('selected');
        return;
    }
    
    const currentIndex = tasks.indexOf(activeTask);
    activeTask.classList.remove('selected');
    
    let newIndex;
    if (direction === 'next') {
        newIndex = currentIndex + 1 >= tasks.length ? 0 : currentIndex + 1;
    } else {
        newIndex = currentIndex - 1 < 0 ? tasks.length - 1 : currentIndex - 1;
    }
    
    tasks[newIndex].classList.add('selected');
    tasks[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Check for tasks that need notifications
function checkDueTasks() {
    const now = new Date();
    tasks.forEach(task => {
        if (task.dueDate && !task.completed && !task.notified) {
            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate - now;
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            if (minutesDiff <= 30 && minutesDiff > 0) {
                showSnackbar(`Task "${task.text}" is due in ${minutesDiff} minutes!`, null);
                task.notified = true;
                saveTasks();
            }
        }
    });
}

// Check for due tasks every minute
setInterval(checkDueTasks, 60000);

// Initial check for due tasks
checkDueTasks();

// Initial render
renderTasks();
