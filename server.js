const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
// Render assigns a PORT environment variable - use that or fallback to 3000
const PORT = process.env.PORT || 3000;

// Define data file path - for Render we'll use the /tmp directory as it's writable in their free tier
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// Middleware
app.use(express.json());

// Enable CORS for Netlify frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow your Netlify URL or all origins during development
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Create data directory if it doesn't exist
async function ensureDataDirectoryExists() {
    try {
        await fs.access(DATA_DIR);
    } catch (error) {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Read tasks from file
async function readTasks() {
    try {
        await ensureDataDirectoryExists();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
}

// Write tasks to file
async function writeTasks(tasks) {
    await ensureDataDirectoryExists();
    await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}

// Routes
// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await readTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { text, completed = false } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Task text is required' });
        }
        
        const tasks = await readTasks();
        const newTask = {
            id: uuidv4(),
            text,
            completed,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        await writeTasks(tasks);
        
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update a task
app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Update the task with new properties
        const updatedTask = { ...tasks[taskIndex], ...updates, updatedAt: new Date().toISOString() };
        tasks[taskIndex] = updatedTask;
        
        await writeTasks(tasks);
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const tasks = await readTasks();
        const filteredTasks = tasks.filter(task => task.id !== id);
        
        if (filteredTasks.length === tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        await writeTasks(filteredTasks);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});