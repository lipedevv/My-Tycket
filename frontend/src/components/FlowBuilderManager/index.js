import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  IconButton,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  CircularProgress,
} from "@material-ui/core";
import {
  Add,
  Delete,
  Edit,
  PlayArrow,
  Stop,
  Visibility,
  Settings,
  Timeline,
  AccountTree,
  Speed,
  Memory,
  Code,
  CheckCircle,
  Error,
  Warning,
} from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import WhatsAppProviderSelector from "../WhatsAppProviderSelector";

const useStyles = makeStyles(theme => ({
  root: {
    "& .MuiDialogTitle-root": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  statsCard: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    marginBottom: theme.spacing(2),
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  statLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  flowItem: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
  },
  flowItemActive: {
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
  flowItemInactive: {
    borderLeft: `4px solid ${theme.palette.grey[400]}`,
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  formControl: {
    width: '100%',
    marginBottom: theme.spacing(1),
  },
  dialogContent: {
    padding: theme.spacing(3),
  },
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },
  tabButton: {
    minWidth: 120,
    textTransform: 'none',
  },
  tabButtonActive: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
}));

const FlowBuilderManager = ({ open, onClose, ticketId }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para gerenciamento de fluxos
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [flowConfig, setFlowConfig] = useState({
    isActive: false,
    flowId: null,
    providerId: null,
    queueId: null,
    settings: {},
  });

  // Estatísticas do FlowBuilder
  const [stats, setStats] = useState({
    totalFlows: 0,
    activeFlows: 0,
    totalExecutions: 0,
    successRate: 0,
  });

  // Carregar dados
  useEffect(() => {
    if (!open || !ticketId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Carregar configurações atuais do ticket
        const { data: ticketData } = await api.get(`/tickets/${ticketId}`);

        if (ticketData.flowIntegrationId) {
          setFlowConfig({
            isActive: ticketData.isFlowActive || false,
            flowId: ticketData.flowIntegrationId,
            providerId: ticketData.providerId || null,
            queueId: ticketData.queueId || null,
            settings: ticketData.flowSettings || {},
          });
        }

        // Carregar fluxos disponíveis
        const { data: flowsData } = await api.get('/flowbuilder', {
          params: { companyId: user.companyId }
        });
        setFlows(flowsData.flows || []);

        // Carregar estatísticas
        const { data: statsData } = await api.get('/flowbuilder/stats', {
          params: { companyId: user.companyId }
        });
        setStats(statsData || {});

      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, ticketId, user.companyId]);

  const handleTabChange = (tabIndex) => {
    setCurrentTab(tabIndex);
  };

  const handleFlowConfigChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFlowConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveFlowConfig = async () => {
    if (!ticketId) return;

    try {
      setSaving(true);

      const payload = {
        isFlowActive: flowConfig.isActive,
        flowIntegrationId: flowConfig.flowId || null,
        providerId: flowConfig.providerId,
        queueId: flowConfig.queueId,
        flowSettings: flowConfig.settings,
      };

      await api.put(`/tickets/${ticketId}/flow-config`, payload);

      toast.success('Configuração do FlowBuilder atualizada com sucesso');
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartFlow = async (flowId) => {
    if (!ticketId) return;

    try {
      await api.post(`/flowbuilder/${flowId}/start`, {
        ticketId,
        companyId: user.companyId,
      });

      toast.success('Fluxo iniciado com sucesso');

      // Atualizar configuração
      setFlowConfig(prev => ({
        ...prev,
        isActive: true,
        flowId,
      }));
    } catch (err) {
      toastError(err);
    }
  };

  const handleStopFlow = async () => {
    if (!ticketId) return;

    try {
      await api.post(`/flowbuilder/stop`, {
        ticketId,
        companyId: user.companyId,
      });

      toast.success('Fluxo parado com sucesso');

      // Atualizar configuração
      setFlowConfig(prev => ({
        ...prev,
        isActive: false,
      }));
    } catch (err) {
      toastError(err);
    }
  };

  const renderStatusIcon = (flow) => {
    if (!flow.isActive) {
      return <Stop color="error" />;
    }

    switch (flow.status) {
      case 'running':
        return <PlayArrow color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  const renderFlowItem = (flow) => {
    const isSelected = flowConfig.flowId === flow.id;

    return (
      <Paper
        key={flow.id}
        className={`${classes.flowItem} ${isSelected ? classes.flowItemActive : classes.flowItemInactive}`}
        onClick={() => setFlowConfig(prev => ({ ...prev, flowId: flow.id }))}
        style={{ cursor: 'pointer' }}
      >
        <ListItem>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center">
                <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
                  {flow.name}
                </Typography>
                {renderStatusIcon(flow)}
                <Chip
                  label={`${flow.nodeCount || 0} nós`}
                  size="small"
                  color="primary"
                  className={classes.statusChip}
                />
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="caption" color="textSecondary">
                  {flow.description || 'Sem descrição'}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Criado: {new Date(flow.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <Box display="flex" gap={1}>
              <Tooltip title="Visualizar fluxo">
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/flowbuilder/${flow.id}/view`, '_blank');
                }}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Editar fluxo">
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/flowbuilder/${flow.id}/edit`, '_blank');
                }}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>

              {isSelected && (
                <Tooltip title={flowConfig.isActive ? "Parar fluxo" : "Iniciar fluxo"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      flowConfig.isActive ? handleStopFlow() : handleStartFlow(flow.id);
                    }}
                    color={flowConfig.isActive ? "secondary" : "primary"}
                  >
                    {flowConfig.isActive ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </ListItemSecondaryAction>
        </ListItem>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>FlowBuilder Manager</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} maxWidth="lg" fullWidth className={classes.root}>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AccountTree />
          FlowBuilder Manager - Ticket #{ticketId}
        </Box>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <div className={classes.form}>
          {/* Tabs de navegação */}
          <div className={classes.tabsContainer}>
            <Box display="flex" gap={1}>
              <Button
                className={`${classes.tabButton} ${currentTab === 0 ? classes.tabButtonActive : ''}`}
                onClick={() => handleTabChange(0)}
                startIcon={<Settings />}
              >
                Configuração
              </Button>
              <Button
                className={`${classes.tabButton} ${currentTab === 1 ? classes.tabButtonActive : ''}`}
                onClick={() => handleTabChange(1)}
                startIcon={<AccountTree />}
              >
                Fluxos Disponíveis
              </Button>
              <Button
                className={`${classes.tabButton} ${currentTab === 2 ? classes.tabButtonActive : ''}`}
                onClick={() => handleTabChange(2)}
                startIcon={<Speed />}
              >
                Estatísticas
              </Button>
            </Box>
          </div>

          {/* Tab 0: Configuração */}
          {currentTab === 0 && (
            <>
              <Box>
                <Typography className={classes.sectionTitle}>
                  <Settings />
                  Configuração do FlowBuilder
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={flowConfig.isActive}
                      onChange={handleFlowConfigChange('isActive')}
                      color="primary"
                    />
                  }
                  label="Ativar FlowBuilder para este ticket"
                />

                {flowConfig.isActive && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <WhatsAppProviderSelector
                        value={flowConfig.providerId}
                        onChange={(value) => setFlowConfig(prev => ({ ...prev, providerId: value }))}
                        label="Provider WhatsApp"
                        required
                        helperText="Provider que será usado para executar o fluxo"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl variant="outlined" className={classes.formControl}>
                        <InputLabel>Fila</InputLabel>
                        <Select
                          value={flowConfig.queueId || ''}
                          onChange={handleFlowConfigChange('queueId')}
                          label="Fila"
                        >
                          <MenuItem value="">
                            <em>Nenhuma fila específica</em>
                          </MenuItem>
                          {/* Aqui você pode carregar as filas dinamicamente */}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                )}
              </Box>

              {flowConfig.flowId && (
                <Box>
                  <Typography className={classes.sectionTitle}>
                    <Memory />
                    Fluxo Atual
                  </Typography>
                  <Paper className={classes.flowItem}>
                    <Typography variant="subtitle2">
                      {flows.find(f => f.id === flowConfig.flowId)?.name || 'Fluxo não encontrado'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Status: {flowConfig.isActive ? 'Ativo' : 'Inativo'}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </>
          )}

          {/* Tab 1: Fluxos Disponíveis */}
          {currentTab === 1 && (
            <>
              <Box>
                <Typography className={classes.sectionTitle}>
                  <AccountTree />
                  Fluxos Disponíveis
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Selecione um fluxo para associar a este ticket
                </Typography>

                {flows.length === 0 ? (
                  <Paper className={classes.flowItem}>
                    <Typography color="textSecondary" align="center">
                      Nenhum fluxo encontrado. Crie um fluxo no FlowBuilder primeiro.
                    </Typography>
                  </Paper>
                ) : (
                  <List>
                    {flows.map(renderFlowItem)}
                  </List>
                )}
              </Box>
            </>
          )}

          {/* Tab 2: Estatísticas */}
          {currentTab === 2 && (
            <>
              <Box>
                <Typography className={classes.sectionTitle}>
                  <Speed />
                  Estatísticas do FlowBuilder
                </Typography>

                <div className={classes.statsCard}>
                  <Typography variant="subtitle2" gutterBottom>
                    Visão Geral
                  </Typography>
                  <div className={classes.statsGrid}>
                    <div className={classes.statItem}>
                      <div className={classes.statValue}>{stats.totalFlows}</div>
                      <div className={classes.statLabel}>Total de Fluxos</div>
                    </div>
                    <div className={classes.statItem}>
                      <div className={classes.statValue}>{stats.activeFlows}</div>
                      <div className={classes.statLabel}>Fluxos Ativos</div>
                    </div>
                    <div className={classes.statItem}>
                      <div className={classes.statValue}>{stats.totalExecutions}</div>
                      <div className={classes.statLabel}>Execuções</div>
                    </div>
                    <div className={classes.statItem}>
                      <div className={classes.statValue}>{stats.successRate}%</div>
                      <div className={classes.statLabel}>Taxa de Sucesso</div>
                    </div>
                  </div>
                </div>

                <Typography variant="body2" color="textSecondary">
                  Para estatísticas detalhadas, acesse o painel do FlowBuilder.
                </Typography>
              </Box>
            </>
          )}
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        {currentTab === 0 && (
          <Button
            onClick={handleSaveFlowConfig}
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderManager;