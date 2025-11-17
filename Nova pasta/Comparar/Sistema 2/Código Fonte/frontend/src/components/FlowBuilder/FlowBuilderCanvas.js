import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MiniMap,
  Connection,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';

// Import node types
import './FlowNodeTypes';
import './FlowBuilder.css';

import { nodeTypes } from './FlowNodeTypes';
import Sidebar from './FlowSidebar';
import FlowSettings from './FlowSettings';
import FlowPreview from './FlowPreview';

const initialNodes = [
  {
    id: '1',
    type: 'sendMessage',
    position: { x: 250, y: 25 },
    data: {
      message: 'Olá! Como posso ajudar?',
      label: 'Enviar Mensagem'
    }
  },
  {
    id: '2',
    type: 'condition',
    position: { x: 100, y: 125 },
    data: {
      condition: '{{menu_selection}} == "Suporte"',
      label: 'Condição'
    }
  },
  {
    id: '3',
    type: 'sendMessage',
    position: { x: 400, y: 125 },
    data: {
      message: 'Transferindo para o suporte técnico...',
      label: 'Enviar Mensagem'
    }
  }
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep'
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: true
  }
];

const FlowBuilderCanvas = ({ flowId, onSave, flowData = null }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(flowData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData?.edges || initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // States
  const [isDirty, setIsDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [flowName, setFlowName] = useState(flowData?.name || 'Novo Fluxo');
  const [flowDescription, setFlowDescription] = useState(flowData?.description || '');
  const [isPublic, setIsPublic] = useState(flowData?.isPublic || false);

  // Menu states
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onInit = useCallback((rfi) => {
    setReactFlowInstance(rfi);
  }, []);

  const onNodesChangeHandler = useCallback(
    (changes) => {
      onNodesChange(changes);
      setIsDirty(true);
    },
    [onNodesChange]
  );

  const onEdgesChangeHandler = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setIsDirty(true);
    },
    [onEdgesChange]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.data.getNodeType();

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top
      });

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: getNodeTypeLabel(type)
        }
      };

      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.data.dropEffect = 'move';
  }, []);

  const getNodeTypeLabel = (type) => {
    const labels = {
      sendMessage: 'Enviar Mensagem',
      condition: 'Condição',
      menu: 'Menu Interativo',
      apiCall: 'Chamada API',
      transferQueue: 'Transferir Fila',
      transferUser: 'Transferir Usuário',
      setVariable: 'Definir Variável',
      input: 'Receber Input',
      sendMedia: 'Enviar Mídia',
      addTag: 'Adicionar Tag',
      removeTag: 'Remover Tag',
      closeTicket: 'Fechar Ticket',
      validateInput: 'Validar Input',
      delay: 'Aguardar',
      endFlow: 'Fim do Fluxo'
    };
    return labels[type] || type;
  };

  const saveFlow = async () => {
    try {
      const flowDefinition = {
        name: flowName,
        description: flowDescription,
        isPublic,
        nodes,
        edges,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          nodeCount: nodes.length,
          edgeCount: edges.length
        }
      };

      if (onSave) {
        await onSave(flowDefinition);
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Error saving flow:', error);
    }
  };

  const executeFlow = async () => {
    try {
      // Implementar execução do fluxo
      console.log('Executing flow:', { nodes, edges });
    } catch (error) {
      console.error('Error executing flow:', error);
    }
  };

  const duplicateFlow = () => {
    // Implementar duplicação do fluxo
    const duplicatedNodes = nodes.map((node) => ({
      ...node,
      id: `${node.type}_${Date.now()}_${Math.random()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50
      }
    }));

    const duplicatedEdges = edges.map((edge) => ({
      ...edge,
      id: `e_${Date.now()}_${Math.random()}`,
      source: edge.source.replace(/_\d+$/, '') + `_${Date.now()}`,
      target: edge.target.replace(/_\d+$/, '') + `_${Date.now()}`
    }));

    setNodes(duplicatedNodes);
    setEdges(duplicatedEdges);
    setIsDirty(true);
  };

  const clearFlow = () => {
    if (window.confirm('Tem certeza que deseja limpar o fluxo?')) {
      setNodes([]);
      setEdges([]);
      setIsDirty(true);
    }
  };

  const exportFlow = () => {
    const flowData = {
      name: flowName,
      description: flowDescription,
      nodes,
      edges,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `flow_${flowName}_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSettingsMenuClick = (event) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={1} square>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {flowName}
          </Typography>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Salvar Fluxo">
              <IconButton
                onClick={saveFlow}
                disabled={!isDirty}
                color={isDirty ? 'primary' : 'default'}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Executar Fluxo">
              <IconButton onClick={executeFlow} color="success">
                <PlayIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Prévia">
              <IconButton onClick={() => setPreviewOpen(true)}>
                <PreviewIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Duplicar">
              <IconButton onClick={duplicateFlow}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Configurações">
              <IconButton onClick={handleSettingsMenuClick}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {/* Settings Menu */}
            <Menu
              anchorEl={settingsMenuAnchor}
              open={Boolean(settingsMenuAnchor)}
              onClose={handleSettingsMenuClose}
            >
              <MenuItem onClick={() => { setSettingsOpen(true); handleSettingsMenuClose(); }}>
                Editar Configurações
              </MenuItem>
              <MenuItem onClick={exportFlow}>Exportar Fluxo</MenuItem>
              <MenuItem onClick={clearFlow} sx={{ color: 'error.main' }}>
                Limpar Fluxo
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            ref={reactFlowWrapper}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeHandler}
            onEdgesChange={onEdgesChangeHandler}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap
              nodeStrokeColor="#374151"
              nodeColor="#f3f4f6"
              nodeBorderRadius={2}
              pannable
              zoomable
            />
            <Background color="#aaa" gap={16} />

            <Panel position="top-left">
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Nós: {nodes.length} | Conexões: {edges.length}
                </Typography>
              </Paper>
            </Panel>

            {isDirty && (
              <Panel position="top-right">
                <Paper sx={{ p: 1, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                  <Typography variant="body2">
                Não salvo
                  </Typography>
                </Paper>
              </Panel>
            )}
          </ReactFlow>
        </Box>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurações do Fluxo</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome do Fluxo"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Descrição"
            value={flowDescription}
            onChange={(e) => setFlowDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            }
            label="Fluxo Público"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancelar</Button>
          <Button onClick={() => setSettingsOpen(false)} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Prévia do Fluxo</DialogTitle>
        <DialogContent>
          <FlowPreview nodes={nodes} edges={edges} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation for unsaved changes */}
      {isDirty && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1000
          }}
        >
          <Paper sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
            <Typography variant="body2">
              Você tem alterações não salvas
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={saveFlow}
              sx={{ mt: 1 }}
            >
              Salvar Agora
            </Button>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default FlowBuilderCanvas;