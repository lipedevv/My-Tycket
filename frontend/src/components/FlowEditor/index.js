import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { getLayoutedElements } from './utils/layout';
import { validateFlow } from './utils/validation';

const nodeTypes = {
  start: CustomNode,
  end: CustomNode,
  sendMessage: CustomNode,
  sendMedia: CustomNode,
  condition: CustomNode,
  menu: CustomNode,
  delay: CustomNode,
  apiCall: CustomNode,
  webhook: CustomNode,
  variable: CustomNode,
  validation: CustomNode,
  tag: CustomNode,
  queue: CustomNode,
  humanHandoff: CustomNode,
  analytics: CustomNode,
};

const edgeTypes = {
  default: CustomEdge,
  button: CustomEdge,
  condition: CustomEdge,
};

const FlowEditor = React.forwardRef(({ flow, onNodeSelect, onEdgeSelect, onFlowChange, zoom = 1 }, ref) => {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow?.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Update nodes and edges when flow changes
  useEffect(() => {
    if (flow) {
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    }
  }, [flow]);

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'default',
        animated: true,
        style: {
          stroke: '#2DDD7F',
          strokeWidth: 2,
        },
        labelStyle: {
          fill: '#333',
          fontSize: 12,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      onFlowChange({ edges: [...edges, newEdge] });
    },
    [edges, onFlowChange]
  );

  const onNodeDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = event.target.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: getNodeLabel(type),
          config: getDefaultNodeConfig(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      onFlowChange({ nodes: [...nodes, newNode] });
    },
    [reactFlowInstance, nodes, onFlowChange]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      onNodeSelect(node);
      onEdgeSelect(null);
    },
    [onNodeSelect, onEdgeSelect]
  );

  const onEdgeClick = useCallback(
    (event, edge) => {
      onEdgeSelect(edge);
      onNodeSelect(null);
    },
    [onNodeSelect, onEdgeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  const onNodeDragStop = useCallback((event, node) => {
    // Update node position in flow
    const updatedNodes = nodes.map(n =>
      n.id === node.id ? { ...n, position: node.position } : n
    );
    onFlowChange({ nodes: updatedNodes });
  }, [nodes, onFlowChange]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    onFlowChange({ edges: edges.filter(e => !deletedEdges.includes(e)) });
  }, [edges, onFlowChange]);

  const onNodesDelete = useCallback((deletedNodes) => {
    onFlowChange({ nodes: nodes.filter(n => !deletedNodes.includes(n)) });
  }, [nodes, onFlowChange]);

  const autoLayout = useCallback(() => {
    const layoutedNodes = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    onFlowChange({ nodes: layoutedNodes });

    // Fit view after layout
    setTimeout(() => {
      fitView({ includeHiddenNodes: true });
    }, 100);
  }, [nodes, edges, onFlowChange, fitView]);

  const validateCurrentFlow = useCallback(() => {
    return validateFlow({ nodes, edges });
  }, [nodes, edges]);

  const getNodeLabel = (type) => {
    const labels = {
      start: 'Início',
      end: 'Fim',
      sendMessage: 'Enviar Mensagem',
      sendMedia: 'Enviar Mídia',
      condition: 'Condição',
      menu: 'Menu',
      delay: 'Esperar',
      apiCall: 'Chamada API',
      webhook: 'Webhook',
      variable: 'Variável',
      validation: 'Validação',
      tag: 'Tag',
      queue: 'Fila',
      humanHandoff: 'Humano',
      analytics: 'Analytics',
    };
    return labels[type] || type;
  };

  const getDefaultNodeConfig = (type) => {
    const configs = {
      start: {},
      end: {},
      sendMessage: {
        message: '',
        messageType: 'text',
      },
      sendMedia: {
        mediaUrl: '',
        mediaType: 'image',
        caption: '',
      },
      condition: {
        conditions: [],
      },
      menu: {
        title: '',
        options: [],
        waitForResponse: true,
      },
      delay: {
        delay: 5,
        delayUnit: 'seconds',
      },
      apiCall: {
        url: '',
        method: 'GET',
        headers: {},
        body: '',
      },
      webhook: {
        url: '',
        method: 'POST',
        headers: {},
        body: '',
        secret: '',
      },
      variable: {
        operation: 'set',
        variableName: '',
        value: '',
      },
      validation: {
        validations: [],
      },
      tag: {
        operation: 'add',
        tags: [],
      },
      queue: {
        queueId: null,
      },
      humanHandoff: {
        reason: '',
      },
      analytics: {
        event: '',
        data: {},
      },
    };
    return configs[type] || {};
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    autoLayout,
    validateFlow: validateCurrentFlow,
    fitView: () => fitView({ includeHiddenNodes: true }),
    getNodes: () => nodes,
    getEdges: () => edges,
    addNode: (type, position) => {
      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: getNodeLabel(type),
          config: getDefaultNodeConfig(type),
        },
      };
      setNodes(prev => [...prev, newNode]);
      return newNode;
    },
    deleteNode: (nodeId) => {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    },
    deleteEdge: (edgeId) => {
      setEdges(prev => prev.filter(e => e.id !== edgeId));
    }
  }), [nodes, edges, autoLayout, validateCurrentFlow, fitView]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onNodeDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[20, 20]}
        defaultViewport={{ x: 0, y: 0, zoom }}
        fitView
        style={{
          background: '#f8f9fa',
        }}
      >
        <Background
          color="#e0e0e0"
          gap={20}
          size={1}
        />

        <Controls
          style={{
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        />

        <MiniMap
          style={{
            height: 120,
            backgroundColor: '#ffffff',
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#4CAF50';
              case 'end':
                return '#F44336';
              case 'sendMessage':
              case 'sendMedia':
                return '#2196F3';
              case 'condition':
                return '#FF9800';
              case 'menu':
                return '#9C27B0';
              case 'apiCall':
              case 'webhook':
                return '#795548';
              case 'variable':
                return '#607D8B';
              default:
                return '#2DDD7F';
            }
          }}
          nodeBorderRadius={8}
        />

        {/* Welcome Panel */}
        {nodes.length === 0 && (
          <Panel
            position="top-left"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              maxWidth: '300px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                Bem-vindo ao FlowBuilder!
              </h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                Arraste nós do painel esquerdo para começar a construir seu fluxo.
              </p>
            </div>
          </Panel>
        )}

        {/* Validation Warnings */}
        {nodes.length > 0 && (
          <Panel
            position="top-right"
            style={{
              background: '#fff3cd',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #ffeaa7',
              maxWidth: '400px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={validateCurrentFlow}
                style={{
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Validar Fluxo
              </button>
              <button
                onClick={autoLayout}
                style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Auto Layout
              </button>
            </div>
          </Panel>
        )}

        {/* Stats Panel */}
        {nodes.length > 0 && (
          <Panel
            position="bottom-left"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '12px',
              color: '#666',
            }}
          >
            <div>
              Nós: {nodes.length} | Conexões: {edges.length}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
});

FlowEditor.displayName = 'FlowEditor';

export default FlowEditor;