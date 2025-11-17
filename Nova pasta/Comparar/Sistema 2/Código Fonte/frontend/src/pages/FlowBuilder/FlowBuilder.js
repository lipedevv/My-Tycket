import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Tooltip,
  Divider
} from '@material-ui/core';
import {
  Save,
  Publish,
  PlayArrow,
  Stop,
  Settings,
  ViewList,
  Close,
  Menu,
  Add,
  Edit,
  Delete,
  ContentCopy,
  Visibility
} from '@material-ui/icons';

import FlowEditor from '../../components/FlowEditor';
import NodePalette from './components/NodePalette';
import PropertiesPanel from './components/PropertiesPanel';
import FlowControls from './components/FlowControls';
import FlowSettings from './components/FlowSettings';
import FlowPreview from './components/FlowPreview';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { hasFeature } from '../../services/featureFlags';
import { useSocket } from '../../hooks/useSocket';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2)
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  editorContainer: {
    flex: 1,
    position: 'relative'
  },
  sidebar: {
    width: 320,
    backgroundColor: theme.palette.background.paper,
    borderLeft: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarContent: {
    flex: 1,
    overflow: 'auto'
  },
  toolbar: {
    display: 'flex',
    padding: theme.spacing(1),
    gap: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 600
  },
  versionBadge: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.spacing(1),
    fontSize: '0.75rem',
    marginLeft: theme.spacing(1)
  },
  statusBadge: {
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.spacing(1),
    fontSize: '0.75rem',
    marginLeft: theme.spacing(1),
    fontWeight: 600
  },
  published: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText
  },
  draft: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText
  }
}));

const FlowBuilder = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const history = useHistory();
  const { id } = useParams();
  const isNew = id === 'new';

  // States
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('nodes');
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Refs
  const editorRef = useRef(null);

  // Socket for real-time updates
  const socket = useSocket();

  // Feature flags
  const [hasAdvancedFeatures, setHasAdvancedFeatures] = useState(false);

  useEffect(() => {
    checkFeatures();
    if (!isNew) {
      loadFlow();
    }
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.on('flow_change', handleFlowChange);
      socket.on('execution_change', handleExecutionChange);

      return () => {
        socket.off('flow_change', handleFlowChange);
        socket.off('execution_change', handleExecutionChange);
      };
    }
  }, [socket]);

  const checkFeatures = async () => {
    try {
      const advancedEnabled = await hasFeature('FLOWBUILDER_ADVANCED');
      setHasAdvancedFeatures(advancedEnabled);
    } catch (error) {
      console.error('Error checking features:', error);
    }
  };

  const loadFlow = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/flows/${id}`);
      setFlow(response.data);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar fluxo',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFlowChange = useCallback((event, data) => {
    if (event === 'flow_updated' && data.flow.id === id) {
      loadFlow();
    }
  }, [id]);

  const handleExecutionChange = useCallback((event, data) => {
    if (event === 'execution_started' && data.execution.flowId === id) {
      setSnackbar({
        open: true,
        message: 'Nova execução iniciada',
        severity: 'info'
      });
    }
  }, [id]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setActiveTab('properties');
    if (isMobile) {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  const handleEdgeSelect = useCallback((edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setActiveTab('properties');
    if (isMobile) {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  const handleFlowChange = useCallback((newFlow) => {
    setFlow(prevFlow => ({
      ...prevFlow,
      ...newFlow
    }));
    setIsDirty(true);
  }, []);

  const validateFlow = () => {
    if (!flow) return false;

    const errors = [];

    // Check if has start node
    const hasStartNode = flow.nodes?.some(node => node.type === 'start');
    if (!hasStartNode) {
      errors.push('Fluxo precisa ter um nó de início');
    }

    // Check if has end node
    const hasEndNode = flow.nodes?.some(node => node.type === 'end');
    if (!hasEndNode) {
      errors.push('Fluxo precisa ter pelo menos um nó de fim');
    }

    // Check connections
    if (flow.nodes && flow.edges) {
      const connectedNodes = new Set();
      flow.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });

      const orphanNodes = flow.nodes.filter(node =>
        node.type !== 'start' && !connectedNodes.has(node.id)
      );

      if (orphanNodes.length > 0) {
        errors.push('Existem nós desconectados');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!flow) return;

    try {
      setSaving(true);

      if (isNew) {
        const response = await api.post('/flows', flow);
        setFlow(response.data);
        history.replace(`/flowbuilder/${response.data.id}`);
        setSnackbar({
          open: true,
          message: 'Fluxo criado com sucesso',
          severity: 'success'
        });
      } else {
        await api.put(`/flows/${id}`, flow);
        setSnackbar({
          open: true,
          message: 'Fluxo salvo com sucesso',
          severity: 'success'
        });
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Error saving flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar fluxo',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateFlow()) {
      setSnackbar({
        open: true,
        message: 'Corrija os erros antes de publicar',
        severity: 'error'
      });
      return;
    }

    try {
      await api.post(`/flows/${id}/publish`);
      await loadFlow();
      setSnackbar({
        open: true,
        message: 'Fluxo publicado com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error publishing flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao publicar fluxo',
        severity: 'error'
      });
    }
  };

  const handleTest = async () => {
    if (!validateFlow()) {
      setSnackbar({
        open: true,
        message: 'Corrija os erros antes de testar',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await api.post(`/flows/${id}/test`, {
        contactNumber: '+5511999998888',
        contactName: 'Teste'
      });

      setSnackbar({
        open: true,
        message: 'Teste iniciado com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error testing flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao testar fluxo',
        severity: 'error'
      });
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await api.post(`/flows/${id}/clone`, {
        name: `${flow.name} (Cópia)`
      });

      history.push(`/flowbuilder/${response.data.id}`);
      setSnackbar({
        open: true,
        message: 'Fluxo duplicado com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error duplicating flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao duplicar fluxo',
        severity: 'error'
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este fluxo?')) {
      return;
    }

    try {
      await api.delete(`/flows/${id}`);
      history.push('/flows');
      setSnackbar({
        open: true,
        message: 'Fluxo excluído com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting flow:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao excluir fluxo',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!flow) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Fluxo não encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Paper className={classes.header} elevation={1}>
        <Box className={classes.headerLeft}>
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)}>
              <Menu />
            </IconButton>
          )}
          <Typography className={classes.title}>
            {isNew ? 'Novo Fluxo' : flow.name}
          </Typography>
          {!isNew && (
            <>
              <span className={classes.versionBadge}>v{flow.version || 1}</span>
              <span className={`${classes.statusBadge} ${flow.isPublished ? classes.published : classes.draft}`}>
                {flow.isPublished ? 'Publicado' : 'Rascunho'}
              </span>
            </>
          )}
        </Box>

        <Box className={classes.headerRight}>
          <Tooltip title="Salvar">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving || !isDirty}
              size="small"
            >
              {isMobile ? '' : 'Salvar'}
            </Button>
          </Tooltip>

          {!isNew && (
            <>
              <Tooltip title="Testar">
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={handleTest}
                  size="small"
                >
                  {isMobile ? '' : 'Testar'}
                </Button>
              </Tooltip>

              <Tooltip title="Publicar">
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Publish />}
                  onClick={handlePublish}
                  disabled={flow.isPublished}
                  size="small"
                >
                  {isMobile ? '' : 'Publicar'}
                </Button>
              </Tooltip>

              <Tooltip title="Duplicar">
                <IconButton onClick={handleDuplicate} size="small">
                  <ContentCopy />
                </IconButton>
              </Tooltip>

              <Tooltip title="Configurações">
                <IconButton onClick={() => setShowSettings(true)} size="small">
                  <Settings />
                </IconButton>
              </Tooltip>

              <Tooltip title="Visualizar">
                <IconButton onClick={() => setShowPreview(true)} size="small">
                  <Visibility />
                </IconButton>
              </Tooltip>

              <Tooltip title="Excluir">
                <IconButton onClick={handleDelete} color="error" size="small">
                  <Delete />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Paper>

      {/* Main Content */}
      <Box className={classes.mainContent}>
        {/* Editor */}
        <Box className={classes.editorContainer}>
          {validationErrors.length > 0 && (
            <Alert severity="error" style={{ margin: 16 }}>
              <Typography variant="h6">Erros de validação:</Typography>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <FlowEditor
            ref={editorRef}
            flow={flow}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onFlowChange={handleFlowChange}
          />
        </Box>

        {/* Sidebar (Desktop) */}
        {!isMobile && (
          <Paper className={classes.sidebar} square>
            <Box className={classes.toolbar}>
              <Button
                variant={activeTab === 'nodes' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('nodes')}
                size="small"
                fullWidth
              >
                Nós
              </Button>
              <Button
                variant={activeTab === 'properties' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('properties')}
                size="small"
                fullWidth
              >
                Propriedades
              </Button>
              <Button
                variant={activeTab === 'controls' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('controls')}
                size="small"
                fullWidth
              >
                Controles
              </Button>
            </Box>

            <Box className={classes.sidebarContent}>
              {activeTab === 'nodes' && <NodePalette />}
              {activeTab === 'properties' && (
                <PropertiesPanel
                  node={selectedNode}
                  edge={selectedEdge}
                  flow={flow}
                  onFlowChange={handleFlowChange}
                />
              )}
              {activeTab === 'controls' && (
                <FlowControls
                  flow={flow}
                  onFlowChange={handleFlowChange}
                  onValidate={() => validateFlow()}
                  onTest={handleTest}
                />
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box width={320} height="100%" display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="h6">Editor</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          <Box className={classes.toolbar}>
            <Button
              variant={activeTab === 'nodes' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('nodes')}
              size="small"
              fullWidth
            >
              Nós
            </Button>
            <Button
              variant={activeTab === 'properties' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('properties')}
              size="small"
              fullWidth
            >
              Propriedades
            </Button>
            <Button
              variant={activeTab === 'controls' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('controls')}
              size="small"
              fullWidth
            >
              Controles
            </Button>
          </Box>

          <Box className={classes.sidebarContent}>
            {activeTab === 'nodes' && <NodePalette />}
            {activeTab === 'properties' && (
              <PropertiesPanel
                node={selectedNode}
                edge={selectedEdge}
                flow={flow}
                onFlowChange={handleFlowChange}
              />
            )}
            {activeTab === 'controls' && (
              <FlowControls
                flow={flow}
                onFlowChange={handleFlowChange}
                onValidate={() => validateFlow()}
                onTest={handleTest}
              />
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Settings Modal */}
      {showSettings && (
        <FlowSettings
          flow={flow}
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleFlowChange}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <FlowPreview
          flow={flow}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FlowBuilder;