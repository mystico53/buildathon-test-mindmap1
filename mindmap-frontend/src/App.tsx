import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeMouseHandler,
  OnSelectionChangeParams,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button, Chip, Paper, Typography, Box } from '@mui/material';

const CustomNode = ({ data, selected }: any) => {
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '10px',
        border: selected ? '2px solid #007bff' : '1px solid #ccc',
        backgroundColor: data.color || '#9C27B0',
        color: 'white',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {data.label}
      </div>
      {data.tags && data.tags.length > 0 && (
        <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '4px' }}>
          {data.tags.map((tag: string, index: number) => (
            <Chip
              key={index}
              label={`#${tag}`}
              size="small"
              style={{
                backgroundColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                height: '16px',
                margin: '1px',
                fontSize: '9px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
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
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
];

const colorOptions = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#f44336', // Red
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingColor, setEditingColor] = useState<string>('#9C27B0');
  const [editingTags, setEditingTags] = useState<string>('');
  const [socket, setSocket] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [userCursors, setUserCursors] = useState<{[key: string]: {x: number, y: number, user: any}}>({});

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    const defaultUserName = `User${Math.floor(Math.random() * 1000)}`;
    const userColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    
    setUserName(defaultUserName);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-mindmap', {
        name: defaultUserName,
        color: userColor
      });
    });

    newSocket.on('mindmap-state', (state: any) => {
      if (state.nodes.length > 0) {
        setNodes(state.nodes);
      }
      if (state.edges.length > 0) {
        setEdges(state.edges);
      }
    });

    newSocket.on('node-updated', (nodeData: any) => {
      setNodes((currentNodes) => {
        const existingIndex = currentNodes.findIndex(n => n.id === nodeData.id);
        if (existingIndex >= 0) {
          const updatedNodes = [...currentNodes];
          updatedNodes[existingIndex] = nodeData;
          return updatedNodes;
        } else {
          return [...currentNodes, nodeData];
        }
      });
    });

    newSocket.on('node-deleted', (nodeId: any) => {
      setNodes((currentNodes) => currentNodes.filter(n => n.id !== nodeId));
      setEdges((currentEdges) => currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId));
    });

    newSocket.on('edge-updated', (edgeData: any) => {
      setEdges((currentEdges) => {
        const existingIndex = currentEdges.findIndex(e => e.id === edgeData.id);
        if (existingIndex >= 0) {
          const updatedEdges = [...currentEdges];
          updatedEdges[existingIndex] = edgeData;
          return updatedEdges;
        } else {
          return [...currentEdges, edgeData];
        }
      });
    });

    newSocket.on('user-joined', (data: any) => {
      setConnectedUsers(data.users);
    });

    newSocket.on('user-left', (data: any) => {
      setConnectedUsers(data.users);
      setUserCursors((cursors) => {
        const updatedCursors = { ...cursors };
        delete updatedCursors[data.userId];
        return updatedCursors;
      });
    });

    newSocket.on('cursor-updated', (data: any) => {
      setUserCursors((cursors) => ({
        ...cursors,
        [data.userId]: {
          x: data.cursor.x,
          y: data.cursor.y,
          user: data.user
        }
      }));
    });

    return () => {
      newSocket.close();
    };
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'smoothstep'
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      if (socket) {
        socket.emit('edge-update', newEdge);
      }
    },
    [setEdges, socket]
  );

  const onSelectionChange = useCallback(
    ({ nodes }: OnSelectionChangeParams) => {
      setSelectedNodes(nodes);
    },
    []
  );

  const addNode = () => {
    const colors = colorOptions;
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { label: `New Node ${nodes.length + 1}`, tags: [], color: randomColor },
    };
    setNodes((nds) => [...nds, newNode]);
    
    if (socket) {
      socket.emit('node-update', newNode);
    }
  };

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodeIds = selectedNodes.map(node => node.id);
    setNodes((nds) => nds.filter(node => !selectedNodeIds.includes(node.id)));
    setEdges((eds) => eds.filter(edge => 
      !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
    ));
    
    if (socket) {
      selectedNodeIds.forEach(nodeId => {
        socket.emit('node-delete', nodeId);
      });
    }
  }, [selectedNodes, setNodes, setEdges, socket]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (event, node) => {
      setEditingNode(node.id);
      setEditingText(node.data.label);
      setEditingColor(node.data.color || '#9C27B0');
      setEditingTags(node.data.tags?.join(', ') || '');
    },
    []
  );

  const handleNodeUpdate = (nodeId: string, newLabel: string, newColor: string, newTags: string) => {
    const tagsArray = newTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const updatedNode = nodes.find(node => node.id === nodeId);
    
    if (updatedNode) {
      const newNodeData = { 
        ...updatedNode, 
        data: { ...updatedNode.data, label: newLabel, tags: tagsArray, color: newColor }
      };
      
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? newNodeData : node
        )
      );
      
      if (socket) {
        socket.emit('node-update', newNodeData);
      }
    }
    
    setEditingNode(null);
    setEditingText('');
    setEditingColor('#9C27B0');
    setEditingTags('');
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNodes.length > 0) {
        deleteSelectedNodes();
      }
    },
    [selectedNodes, deleteSelectedNodes]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (socket && isConnected) {
        socket.emit('cursor-move', {
          x: event.clientX,
          y: event.clientY
        });
      }
    },
    [socket, isConnected]
  );

  const captureAndDownloadImage = useCallback(async () => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (reactFlowElement) {
      try {
        const canvas = await html2canvas(reactFlowElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
        const link = document.createElement('a');
        link.download = `mindmap-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Error capturing mindmap:', error);
      }
    }
  }, []);

  const captureAndDownloadPDF = useCallback(async () => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (reactFlowElement) {
      try {
        const canvas = await html2canvas(reactFlowElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`mindmap-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }} onKeyDown={handleKeyDown} onMouseMove={handleMouseMove} tabIndex={0}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <div style={{ 
          marginBottom: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#4CAF50' : '#f44336'
          }}></div>
          {isConnected ? `Connected as ${userName}` : 'Connecting...'}
        </div>
        
        <Button 
          variant="contained"
          color="success"
          onClick={addNode}
          style={{ marginRight: '10px' }}
        >
          Add Node
        </Button>
        <Button 
          variant="contained"
          color="error"
          onClick={deleteSelectedNodes}
          disabled={selectedNodes.length === 0}
          style={{ marginRight: '10px' }}
        >
          Delete Selected
        </Button>
        <Button 
          variant="contained"
          color="primary"
          onClick={captureAndDownloadImage}
          style={{ marginRight: '10px' }}
        >
          Export PNG
        </Button>
        <Button 
          variant="contained"
          style={{ backgroundColor: '#FF5722', color: 'white' }}
          onClick={captureAndDownloadPDF}
        >
          Export PDF
        </Button>
      </div>
      
      {editingNode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '350px',
        }}>
          <h3>Edit Node</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Text:</label>
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Color:</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {colorOptions.map((color) => (
                <div
                  key={color}
                  onClick={() => setEditingColor(color)}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: color,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: editingColor === color ? '3px solid black' : '2px solid #ccc',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tags (comma-separated):</label>
            <input
              type="text"
              value={editingTags}
              onChange={(e) => setEditingTags(e.target.value)}
              placeholder="e.g., important, urgent, work"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleNodeUpdate(editingNode, editingText, editingColor, editingTags)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Save
            </button>
            <button
              onClick={() => setEditingNode(null)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User Cursors */}
      {Object.entries(userCursors).map(([userId, cursor]) => (
        <div
          key={userId}
          style={{
            position: 'fixed',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: cursor.user.color,
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
          <div
            style={{
              marginTop: '5px',
              backgroundColor: cursor.user.color,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {cursor.user.name}
          </div>
        </div>
      ))}

      {/* Connected Users List */}
      {connectedUsers.length > 1 && (
        <Paper 
          elevation={3}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            padding: '12px',
            maxWidth: '200px'
          }}
        >
          <Typography variant="subtitle2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Online Users ({connectedUsers.length})
          </Typography>
          {connectedUsers.map((user) => (
            <Box key={user.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '4px' 
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: user.color
              }}></div>
              <Typography variant="caption">{user.name}</Typography>
            </Box>
          ))}
        </Paper>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </div>
  );
}

export default App;