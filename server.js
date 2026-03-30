require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'Storeroom-Request-main/frontend')));

const requests_db = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_request', (req_id) => {
        socket.join(`req_${req_id}`);
    });

    socket.on('join_storekeeper', () => {
        socket.join('storekeepers');
        socket.emit('requests_updated', Object.values(requests_db));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.post('/submit_request', (req, res) => {
    try {
        const data = req.body;
        console.log(`Received data:`, data);
        
        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const req_id = uuidv4();
        requests_db[req_id] = {
            id: req_id,
            name: data.name,
            course: data.course,
            supervisor: data.supervisor,
            tools: data.tools || [],
            status: 'pending'
        };
        console.log(`Request created: ${req_id}`);
        
        // Notify storekeepers
        io.to('storekeepers').emit('requests_updated', Object.values(requests_db));
        
        return res.status(200).json({ id: req_id, message: 'Request received' });
    } catch (e) {
        console.error(`Error in submit_request:`, e);
        return res.status(500).json({ error: e.message });
    }
});

app.get('/get_requests', (req, res) => {
    const active_requests = Object.values(requests_db);
    return res.status(200).json(active_requests);
});

app.post('/update_status', (req, res) => {
    const data = req.body;
    const req_id = data.id;
    const new_status = data.status;
    
    console.log(`Updating status for ${req_id} to ${new_status}`);

    if (requests_db[req_id]) {
        if (new_status === 'fulfilled') {
            delete requests_db[req_id];
        } else {
            requests_db[req_id].status = new_status;
        }
        
        // Notify specific worker
        io.to(`req_${req_id}`).emit('status_updated', { id: req_id, status: new_status });
        // Notify storekeepers
        io.to('storekeepers').emit('requests_updated', Object.values(requests_db));
        
        return res.status(200).json({ message: 'Status updated' });
    }
    return res.status(404).json({ message: 'Request not found' });
});

app.get('/check_status/:req_id', (req, res) => {
    const req_id = req.params.req_id;
    if (requests_db[req_id]) {
        return res.status(200).json({ status: requests_db[req_id].status });
    } else {
        return res.status(200).json({ status: 'fulfilled' });
    }
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    const validPassword = process.env.STOREKEEPER_PASSWORD || 'admin123';
    
    if (password === validPassword) {
        return res.status(200).json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Invalid password' });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
