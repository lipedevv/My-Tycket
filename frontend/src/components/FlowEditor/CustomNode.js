import React from 'react';
import { Handle, Position } from 'reactflow';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
} from '@material-ui/core';
import {
  Message,
  Send,
  CallSplit,
  Poll,
  Timer,
  Api,
  Code,
  Assignment,
  CheckCircle,
  Label,
  Group,
  Person,
  Dashboard,
  PlayArrow,
  Stop,
  Settings,
  Edit,
  Delete,
} from '@material-ui/icons';

const getNodeIcon = (type) => {
  const icons = {
    start: <PlayArrow />,
    end: <Stop />,
    sendMessage: <Message />,
    sendMedia: <Send />,
    condition: <CallSplit />,
    menu: <Poll />,
    delay: <Timer />,
    apiCall: <Api />,
    webhook: <Code />,
    variable: <Assignment />,
    validation: <CheckCircle />,
    tag: <Label />,
    queue: <Group />,
    humanHandoff: <Person />,
    analytics: <Dashboard />,
  };
  return icons[type] || <Settings />;
};

const getNodeColor = (type) => {
  const colors = {
    start: '#4CAF50',
    end: '#F44336',
    sendMessage: '#2196F3',
    sendMedia: '#2196F3',
    condition: '#FF9800',
    menu: '#9C27B0',
    delay: '#795548',
    apiCall: '#795548',
    webhook: '#795548',
    variable: '#607D8B',
    validation: '#FFC107',
    tag: '#4CAF50',
    queue: '#3F51B5',
    humanHandoff: '#E91E63',
    analytics: '#00BCD4',
  };
  return colors[type] || '#2DDD7F';
};

const getCategoryLabel = (type) => {
  const categories = {
    start: 'Controle',
    end: 'Controle',
    sendMessage: 'Mensagem',
    sendMedia: 'Mensagem',
    condition: 'Lógica',
    menu: 'Interação',
    delay: 'Utilidade',
    apiCall: 'Integração',
    webhook: 'Integração',
    variable: 'Dados',
    validation: 'Lógica',
    tag: 'Dados',
    queue: 'Roteamento',
    humanHandoff: 'Roteamento',
    analytics: 'Analytics',
  };
  return categories[type] || 'Outro';
};

const CustomNode = ({ data, selected }) => {
  const { type, label } = data;

  const getNodeStatus = () => {
    if (data.config?.disabled) return 'disabled';
    if (data.config?.hasError) return 'error';
    return 'active';
  };

  const getStatusColor = () => {
    const status = getNodeStatus();
    switch (status) {
      case 'disabled':
        return '#9e9e9e';
      case 'error':
        return '#f44336';
      default:
        return getNodeColor(type);
    }
  };

  const getStatusText = () => {
    const status = getNodeStatus();
    switch (status) {
      case 'disabled':
        return 'Desabilitado';
      case 'error':
        return 'Erro';
      default:
        return '';
    }
  };

  const showSourceHandle = type !== 'start';
  const showTargetHandle = type !== 'end';

  return (
    <Card
      style={{
        minWidth: 200,
        border: selected ? `2px solid ${getNodeColor(type)}` : '1px solid #e0e0e0',
        backgroundColor: getNodeStatus() === 'disabled' ? '#f5f5f5' : '#ffffff',
        boxShadow: selected ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: getStatusColor(),
            border: '2px solid #ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      )}

      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getStatusColor(),
            border: '2px solid #ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      )}

      <CardContent style={{ padding: '12px', paddingBottom: '8px' }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: getNodeStatus() === 'disabled' ? '#e0e0e0' : `${getNodeColor(type)}20`,
              color: getNodeStatus() === 'disabled' ? '#9e9e9e' : getNodeColor(type),
              mr: 1,
            }}
          >
            {getNodeIcon(type)}
          </Box>

          <Box flex={1} minWidth={0}>
            <Typography
              variant="subtitle2"
              style={{
                fontWeight: 600,
                color: getNodeStatus() === 'disabled' ? '#9e9e9e' : '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label || type}
            </Typography>
          </Box>

          {getStatusText() && (
            <Tooltip title={getStatusText()}>
              <Chip
                label={getStatusText()}
                size="small"
                color={getNodeStatus() === 'error' ? 'secondary' : 'default'}
                style={{ fontSize: '10px', height: 20 }}
              />
            </Tooltip>
          )}
        </Box>

        <Chip
          label={getCategoryLabel(type)}
          size="small"
          style={{
            fontSize: '10px',
            height: 20,
            backgroundColor: `${getNodeColor(type)}10`,
            color: getNodeColor(type),
          }}
        />

        {/* Preview of node config */}
        {type === 'sendMessage' && data.config?.message && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '11px',
              }}
            >
              "{data.config.message.substring(0, 50)}{data.config.message.length > 50 ? '...' : ''}"
            </Typography>
          </Box>
        )}

        {type === 'condition' && data.config?.conditions?.length > 0 && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ fontSize: '11px' }}
            >
              {data.config.conditions.length} condição(ões)
            </Typography>
          </Box>
        )}

        {type === 'menu' && data.config?.options?.length > 0 && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ fontSize: '11px' }}
            >
              {data.config.options.length} opção(ões)
            </Typography>
          </Box>
        )}

        {type === 'delay' && data.config?.delay && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ fontSize: '11px' }}
            >
              Esperar {data.config.delay} {data.config.delayUnit || 'segundos'}
            </Typography>
          </Box>
        )}

        {type === 'apiCall' && data.config?.url && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '11px',
              }}
            >
              {data.config.url.substring(0, 30)}{data.config.url.length > 30 ? '...' : ''}
            </Typography>
          </Box>
        )}

        {type === 'variable' && data.config?.variableName && (
          <Box mt={1}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ fontSize: '11px' }}
            >
              {data.config.operation || 'set'}: {data.config.variableName}
            </Typography>
          </Box>
        )}

        {/* Action buttons on hover */}
        <Box
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          className="node-actions"
        >
          <Tooltip title="Editar">
            <IconButton
              size="small"
              style={{ padding: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit
              }}
            >
              <Edit style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Duplicar">
            <IconButton
              size="small"
              style={{ padding: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle duplicate
              }}
            >
              <ContentCopy style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Excluir">
            <IconButton
              size="small"
              style={{ padding: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete
              }}
            >
              <Delete style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>

      {/* Node type label */}
      <Box
        style={{
          position: 'absolute',
          top: -8,
          left: 16,
          backgroundColor: getNodeColor(type),
          color: '#ffffff',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {type}
      </Box>

      {/* Validation indicator */}
      {data.config?.validationStatus === 'warning' && (
        <Box
          style={{
            position: 'absolute',
            top: -8,
            right: 16,
            backgroundColor: '#ff9800',
            color: '#ffffff',
            width: 16,
            height: 16,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          !
        </Box>
      )}

      {/* Execution indicator for running flows */}
      {data.isExecuting && (
        <Box
          style={{
            position: 'absolute',
            bottom: -8,
            right: 16,
            backgroundColor: '#4CAF50',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            animation: 'pulse 1.5s infinite',
          }}
        >
          Executando
        </Box>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </Card>
  );
};

export default CustomNode;