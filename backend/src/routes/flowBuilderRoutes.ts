import { Router } from "express";
import isAuth from "../middleware/isAuth";
import {
  index,
  store,
  show,
  update,
  remove,
  execute,
  stopExecution,
  getNodeTypes,
  validateFlow,
  duplicate,
  getExecutions,
  getExecutionLogs
} from "../controllers/FlowBuilderController";

const routes = Router();

// Rotas básicas do FlowBuilder
routes.get("/", isAuth, index);
routes.post("/", isAuth, store);
routes.get("/:id", isAuth, show);
routes.put("/:id", isAuth, update);
routes.delete("/:id", isAuth, remove);

// Execução de flows
routes.post("/:id/execute", isAuth, execute);
routes.post("/executions/:executionId/stop", isAuth, stopExecution);
routes.get("/:id/executions", isAuth, getExecutions);
routes.get("/:id/executions/:executionId/logs", isAuth, getExecutionLogs);

// Utilitários
routes.get("/node-types", isAuth, getNodeTypes);
routes.post("/:id/validate", isAuth, validateFlow);
routes.post("/:id/duplicate", isAuth, duplicate);

export default routes;