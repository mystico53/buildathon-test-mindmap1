const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002"],
  methods: ["GET", "POST"]
}));

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

const mindMapState = {
  nodes: [
    {
      id: '1',
      type: 'custom',
      position: { x: 250, y: 100 },
      data: { label: 'Central Idea', tags: ['main', 'core'], color: '#4CAF50' },
    },
    {
      id: '2',
      type: 'custom',
      position: { x: 100, y: 200 },
      data: { label: 'Branch 1', tags: ['idea', 'concept'], color: '#2196F3' },
    },
    {
      id: '3',
      type: 'custom',
      position: { x: 400, y: 200 },
      data: { label: 'Branch 2', tags: ['action', 'task'], color: '#FF9800' },
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
    { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
  ],
  users: new Map()
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-mindmap', (userData) => {
    mindMapState.users.set(socket.id, {
      id: socket.id,
      name: userData.name,
      color: userData.color,
      cursor: { x: 0, y: 0 }
    });
    
    console.log(`${userData.name} joined the mindmap. Sending state:`, {
      nodesCount: mindMapState.nodes.length,
      edgesCount: mindMapState.edges.length
    });
    
    socket.emit('mindmap-state', {
      nodes: mindMapState.nodes,
      edges: mindMapState.edges
    });
    
    io.emit('user-joined', {
      user: mindMapState.users.get(socket.id),
      users: Array.from(mindMapState.users.values())
    });
  });

  socket.on('node-update', (nodeData) => {
    const existingNodeIndex = mindMapState.nodes.findIndex(n => n.id === nodeData.id);
    
    if (existingNodeIndex >= 0) {
      console.log(`Updating existing node ${nodeData.id}`);
      mindMapState.nodes[existingNodeIndex] = nodeData;
    } else {
      console.log(`Adding new node ${nodeData.id}`);
      mindMapState.nodes.push(nodeData);
    }
    
    socket.broadcast.emit('node-updated', nodeData);
    console.log(`Node ${nodeData.id} broadcasted to ${socket.broadcast.sockets.size} other clients`);
  });

  socket.on('node-delete', (nodeId) => {
    mindMapState.nodes = mindMapState.nodes.filter(n => n.id !== nodeId);
    mindMapState.edges = mindMapState.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    socket.broadcast.emit('node-deleted', nodeId);
    console.log('Node deleted:', nodeId);
  });

  socket.on('edge-update', (edgeData) => {
    const existingEdgeIndex = mindMapState.edges.findIndex(e => e.id === edgeData.id);
    
    if (existingEdgeIndex >= 0) {
      mindMapState.edges[existingEdgeIndex] = edgeData;
    } else {
      mindMapState.edges.push(edgeData);
    }
    
    socket.broadcast.emit('edge-updated', edgeData);
    console.log('Edge updated:', edgeData.id);
  });

  socket.on('cursor-move', (cursorData) => {
    if (mindMapState.users.has(socket.id)) {
      const user = mindMapState.users.get(socket.id);
      user.cursor = cursorData;
      mindMapState.users.set(socket.id, user);
      
      socket.broadcast.emit('cursor-updated', {
        userId: socket.id,
        cursor: cursorData,
        user: user
      });
    }
  });

  socket.on('disconnect', () => {
    const user = mindMapState.users.get(socket.id);
    mindMapState.users.delete(socket.id);
    
    io.emit('user-left', {
      userId: socket.id,
      users: Array.from(mindMapState.users.values())
    });
    
    console.log('User disconnected:', socket.id, user?.name);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Mind Map server running on port ${PORT}`);
});