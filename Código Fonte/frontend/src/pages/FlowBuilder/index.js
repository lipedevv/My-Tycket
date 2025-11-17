import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Toolbar,
  AppBar,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
} from '@material-ui/core';
import {
  Save,
  PlayArrow,
  Stop,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Settings,
  Publish,
  GetApp,
  Delete,
  MoreVert,
  Message,
  CallSplit,
  CompareArrows,
  Timer,
  Api,
  Code,
  Dashboard,
  Loyalty,
  Send,
  WhatsApp,
  Telegram,
  Instagram,
  Facebook,
  Chat,
  Poll,
  Assignment,
  Label,
  Group,
  Person,
  Refresh,
  CheckCircle,
  Error,
  Warning,
} from '@material-ui/icons';

import MainContainer from '../../components/MainContainer';
import MainHeader from '../../components/MainHeader';
import Title from '../../components/Title';
import { FlowEditor } from '../../components/FlowEditor';
import { NodePanel } from '../../components/FlowBuilder/NodePanel';
import { PropertiesPanel } from '../../components/FlowBuilder/PropertiesPanel';
import { FlowToolbar } from '../../components/FlowBuilder/FlowToolbar';
import { FlowSettings } from '../../components/FlowBuilder/FlowSettings';

import api from '../../services/api';
import toastError from '../../errors/toastError';
import { SocketManager } from '../../context/Socket/SocketContext';
import { Can } from '../../components/Can';
import { AuthContext } from '../../context/Auth/AuthContext';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.primary.main,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.palette.background.default,
  },
  drawer: {
    width: 280,
    flexShrink: 0,
  },
  drawerPaper: {
    width: 280,
  },
  propertiesDrawer: {
    width: 320,
    flexShrink: 0,
  },
  propertiesDrawerPaper: {
    width: 320,
  },
  nodeTypeItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  nodeTypeIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  saveButton: {
    marginLeft: theme.spacing(2),
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  miniFab: {
    margin: theme.spacing(0.5),
  },
}));

const FlowBuilder = () => {
  const classes = useStyles();
  const { id } = useParams();
  const history = useHistory();
  const { user } = React.useContext(AuthContext);
  const socketManager = SocketManager;

  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [flowSettings, setFlowSettings] = useState({
    name: '',
    description: '',
    category: 'custom',
    isActive: true,
    triggerType: 'message',
    triggerConfig: {},
  });
  const [showSettings, setShowSettings] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const editorRef = useRef(null);

  // Node types for drag and drop
  const nodeTypes = [
    {
      type: 'start',
      label: 'Início',
      icon: <PlayArrow />,
      description: 'Ponto inicial do fluxo',
      category: 'control',
    },
    {
      type: 'end',
      label: 'Fim',
      icon: <Stop />,
      description: 'Ponto final do fluxo',
      category: 'control',
    },
    {
      type: 'sendMessage',
      label: 'Enviar Mensagem',
      icon: <Message />,
      description: 'Envia uma mensagem de texto',
      category: 'messaging',
    },
    {
      type: 'sendMedia',
      label: 'Enviar Mídia',
      icon: <Send />,
      description: 'Envia imagem, vídeo ou documento',
      category: 'messaging',
    },
    {
      type: 'condition',
      label: 'Condição',
      icon: <CallSplit />,
      description: 'Caminho baseado em condições',
      category: 'logic',
    },
    {
      type: 'menu',
      label: 'Menu Interativo',
      icon: <Poll />,
      description: 'Apresenta opções ao usuário',
      category: 'interaction',
    },
    {
      type: 'delay',
      label: 'Esperar',
      icon: <Timer />,
      description: 'Pausa por um tempo definido',
      category: 'utility',
    },
    {
      type: 'apiCall',
      label: 'Chamada API',
      icon: <Api />,
      description: 'Faz requisição HTTP',
      category: 'integration',
    },
    {
      type: 'webhook',
      label: 'Webhook',
      icon: <Code />,
      description: 'Envia dados para webhook',
      category: 'integration',
    },
    {
      type: 'variable',
      label: 'Variável',
      icon: <Assignment />,
      description: 'Manipula variáveis',
      category: 'data',
    },
    {
      type: 'validation',
      label: 'Validação',
      icon: <CheckCircle />,
      description: 'Valida dados de entrada',
      category: 'logic',
    },
    {
      type: 'tag',
      label: 'Tag',
      icon: <Label />,
      description: 'Adiciona/remove tags',
      category: 'data',
    },
    {
      type: 'queue',
      label: 'Fila',
      icon: <Group />,
      description: 'Transferir para fila',
      category: 'routing',
    },
    {
      type: 'humanHandoff',
      label: 'Transferir Humano',
      icon: <Person />,
      description: 'Transferir para atendente',
      category: 'routing',
    },
    {
      type: 'analytics',
      label: 'Analytics',
      icon: <Dashboard />,
      description: 'Registra eventos',
      category: 'analytics',
    },
  ];

  // Load flow data
  useEffect(() => {
    if (id) {
      loadFlow(id);
    } else {
      // Create new flow
      setFlow({
        id: null,
        name: 'Novo Fluxo',
        description: '',
        nodes: [],
        edges: [],
        variables: {},
        settings: {},
      });
      setFlowSettings({
        name: 'Novo Fluxo',
        description: '',
        category: 'custom',
        isActive: true,
        triggerType: 'message',
        triggerConfig: {},
      });
    }
  }, [id]);

  // Socket integration
  useEffect(() => {
    if (!user?.companyId) return;

    const socket = socketManager.getSocket(user.companyId);

    const handleFlowExecutionUpdate = (data) => {
      console.log('Flow execution update:', data);
      // Update execution status in UI
    };

    socket.on('flow_execution_update', handleFlowExecutionUpdate);

    return () => {
      socket.off('flow_execution_update', handleFlowExecutionUpdate);
    };
  }, [user?.companyId, socketManager]);

  const loadFlow = async (flowId) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/flowbuilder/${flowId}`);

      setFlow(data);
      setFlowSettings({
        name: data.name,
        description: data.description,
        category: data.category,
        isActive: data.isActive,
        triggerType: data.triggerType,
        triggerConfig: data.getTriggerConfig(),
      });

      // Initialize history
      setHistory([{
        nodes: data.getNodes(),
        edges: data.getEdges(),
      }]);
      setHistoryIndex(0);

    } catch (error) {
      toastError(error);
      history.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const saveFlow = async () => {
    try {
      setSaving(true);

      const payload = {
        ...flowSettings,
        nodes: flow.nodes,
        edges: flow.edges,
        variables: flow.variables,
        settings: flow.settings,
        version: flow.version ? flow.version + 1 : 1,
      };

      let response;
      if (id) {
        response = await api.put(`/flowbuilder/${id}`, payload);
      } else {
        response = await api.post('/flowbuilder', payload);
        history.push(`/flowbuilder/${response.data.id}`);
      }

      setFlow(response.data);
      setHasUnsavedChanges(false);
      showSnackbar('Fluxo salvo com sucesso!', 'success');

    } catch (error) {
      toastError(error);
      showSnackbar('Erro ao salvar fluxo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testFlow = async () => {
    try {
      setSaving(true);

      const { data } = await api.post(`/flowbuilder/${flow.id}/test`, {
        testMessage: 'Mensagem de teste',
        testContact: {
          number: '5511999998888',
          name: 'Contato Teste'
        }
      });

      showSnackbar('Teste iniciado com sucesso!', 'success');
      console.log('Test execution:', data);

    } catch (error) {
      toastError(error);
      showSnackbar('Erro ao testar fluxo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishFlow = async () => {
    try {
      setSaving(true);

      await api.post(`/flowbuilder/${flow.id}/publish`);

      setFlow(prev => ({ ...prev, isPublished: true, publishedAt: new Date() }));
      showSnackbar('Fluxo publicado com sucesso!', 'success');

    } catch (error) {
      toastError(error);
      showSnackbar('Erro ao publicar fluxo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNodeDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleFlowChange = useCallback((changes) => {
    setFlow(prev => {
      const newFlow = { ...prev, ...changes };
      setHasUnsavedChanges(true);

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        nodes: newFlow.nodes,
        edges: newFlow.edges,
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      return newFlow;
    });
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setFlow(prev => ({
        ...prev,
        nodes: prevState.nodes,
        edges: prevState.edges,
      }));
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setFlow(prev => ({
        ...prev,
        nodes: nextState.nodes,
        edges: nextState.edges,
      }));
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleMenuClick = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleExportFlow = async () => {
    try {
      const { data } = await api.get(`/flowbuilder/${flow.id}/export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${flow.name}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showSnackbar('Fluxo exportado com sucesso!', 'success');
    } catch (error) {
      toastError(error);
      showSnackbar('Erro ao exportar fluxo', 'error');
    }
  };

  const getStatusColor = () => {
    if (flow?.isPublished) return 'primary';
    if (flow?.isActive) return 'secondary';
    return 'default';
  };

  const getStatusText = () => {
    if (flow?.isPublished) return 'Publicado';
    if (flow?.isActive) return 'Ativo';
    return 'Rascunho';
  };

  if (loading) {
    return (
      <MainContainer>
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography>Carregando FlowBuilder...</Typography>
        </Box>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <AppBar position="static" className={classes.appBar}>
        <Toolbar className={classes.toolbar}>
          <div className={classes.toolbarLeft}>
            <Button
              variant="text"
              color="inherit"
              onClick={() => history.goBack()}
              startIcon={<WhatsApp />}
            >
              FlowBuilder
            </Button>

            <Typography variant="h6" style={{ flexGrow: 0, minWidth: 200 }}>
              {flowSettings.name || 'Novo Fluxo'}
            </Typography>

            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              className={classes.statusChip}
            />
          </div>

          <div className={classes.toolbarRight}>
            <Tooltip title="Desfazer">
              <IconButton
                color="inherit"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={classes.miniFab}
              >
                <Undo />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refazer">
              <IconButton
                color="inherit"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={classes.miniFab}
              >
                <Redo />
              </IconButton>
            </Tooltip>

            <Tooltip title="Reduzir">
              <IconButton
                color="inherit"
                onClick={handleZoomOut}
                className={classes.miniFab}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>

            <Tooltip title="Aumentar">
              <IconButton
                color="inherit"
                onClick={handleZoomIn}
                className={classes.miniFab}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>

            <Tooltip title="Configurações">
              <IconButton
                color="inherit"
                onClick={() => setShowSettings(true)}
                className={classes.miniFab}
              >
                <Settings />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="secondary"
              onClick={testFlow}
              disabled={saving}
              startIcon={<PlayArrow />}
            >
              Testar
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={saveFlow}
              disabled={saving}
              startIcon={<Save />}
              className={classes.saveButton}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>

            <IconButton
              color="inherit"
              onClick={handleMenuClick}
            >
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={publishFlow}>
                <Publish style={{ marginRight: 8 }} />
                Publicar
              </MenuItem>
              <MenuItem onClick={handleExportFlow}>
                <GetApp style={{ marginRight: 8 }} />
                Exportar
              </MenuItem>
              <MenuItem onClick={() => {
                if (window.confirm('Tem certeza que deseja duplicar este fluxo?')) {
                  // Implementar duplicação
                  showSnackbar('Função de duplicação em desenvolvimento', 'info');
                }
              }}>
                <ContentCopy style={{ marginRight: 8 }} />
                Duplicar
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => {
                if (window.confirm('Tem certeza que deseja excluir este fluxo?')) {
                  // Implementar exclusão
                  showSnackbar('Função de exclusão em desenvolvimento', 'info');
                }
              }}>
                <Delete style={{ marginRight: 8 }} />
                Excluir
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <div className={classes.content}>
        {/* Left Sidebar - Node Palette */}
        <Drawer
          variant="permanent"
          anchor="left"
          className={classes.drawer}
          classes={{ paper: classes.drawerPaper }}
        >
          <NodePanel
            nodeTypes={nodeTypes}
            onNodeDragStart={handleNodeDragStart}
          />
        </Drawer>

        {/* Main Editor */}
        <div className={classes.editorContainer}>
          <FlowEditor
            ref={editorRef}
            flow={flow}
            onNodeSelect={handleNodeSelect}
            onFlowChange={handleFlowChange}
            zoom={zoom}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <Drawer
          variant="permanent"
          anchor="right"
          className={classes.propertiesDrawer}
          classes={{ paper: classes.propertiesDrawerPaper }}
        >
          <PropertiesPanel
            selectedNode={selectedNode}
            flow={flow}
            onFlowChange={handleFlowChange}
          />
        </Drawer>
      </div>

      {/* Flow Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configurações do Fluxo</DialogTitle>
        <DialogContent>
          <FlowSettings
            settings={flowSettings}
            onChange={setFlowSettings}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setShowSettings(false);
              setHasUnsavedChanges(true);
            }}
            variant="contained"
            color="primary"
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainContainer>
  );
};

export default FlowBuilder;