# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collaborative real-time mindmap application with a React frontend and Node.js backend. Users can create, edit, and share interactive mind maps with real-time collaboration features including live cursor tracking and synchronized node/edge updates.

## Architecture

### Frontend (`mindmap-frontend/`)
- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI) v7
- **Flow Diagram**: ReactFlow library for interactive node-based interfaces
- **Real-time Communication**: Socket.IO client
- **Export Capabilities**: html2canvas + jsPDF for PNG/PDF export
- **Port**: 3000 (development)

### Backend (`mindmap-server/`)
- **Framework**: Node.js with Express
- **Real-time Communication**: Socket.IO server
- **State Management**: In-memory storage (nodes, edges, users)
- **Port**: 3001

## Development Commands

### Frontend Development
```bash
cd mindmap-frontend
npm install          # Install dependencies
npm start           # Start development server (localhost:3000)
npm run build       # Build for production
npm test            # Run tests
```

### Backend Development
```bash
cd mindmap-server
npm install          # Install dependencies
npm start           # Start production server
npm run dev         # Start development server with nodemon
```

### Full Application Startup
Both servers need to be running simultaneously:
1. Start backend: `cd mindmap-server && npm run dev`
2. Start frontend: `cd mindmap-frontend && npm start`

## Key Components and Architecture Patterns

### Real-time Collaboration System
- **Socket Events**: `node-update`, `node-delete`, `edge-update`, `cursor-move`, `user-joined`, `user-left`
- **State Synchronization**: Server broadcasts changes to all connected clients except sender
- **User Management**: Each connection tracked with unique ID, name, color, and cursor position

### Custom Node System
- **CustomNode Component**: Styled nodes with tags, colors, and labels
- **Node Types**: Registered in ReactFlow with `nodeTypes` object
- **Interactive Features**: Double-click to edit, drag to move, delete key to remove

### Export System
- **PNG Export**: Uses html2canvas to capture ReactFlow viewport
- **PDF Export**: Combines html2canvas with jsPDF, auto-detects orientation
- **File Naming**: Timestamped exports (e.g., `mindmap-2024-01-15T14-30-25.pdf`)

### State Management Patterns
- **Frontend**: React hooks (`useNodesState`, `useEdgesState`) for ReactFlow integration
- **Backend**: Simple in-memory state object with nodes/edges/users Maps
- **Persistence**: No database - state resets on server restart

## Key Files and Their Purpose

- `mindmap-frontend/src/App.tsx`: Main React component with all mindmap logic
- `mindmap-server/server.js`: Complete Socket.IO server implementation
- Node positioning uses random placement for new nodes
- Color system: Predefined palette of 8 colors for nodes and users
- Socket connection automatically assigns random usernames (User123 format)

## Testing and Quality

Frontend includes standard Create React App testing setup with Jest and React Testing Library. No custom test scripts are currently implemented for the backend.