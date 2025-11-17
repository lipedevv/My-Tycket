import { Router } from "express";
import isAuth from "../middlewares/isAuth";
import * as FlowBuilderController from "../controllers/FlowBuilderController";

const routes = Router();

routes.get(
  "/",
  isAuth,
  FlowBuilderController.index
);

routes.get(
  "/:id",
  isAuth,
  FlowBuilderController.show
);

routes.post(
  "/",
  isAuth,
  FlowBuilderController.store
);

routes.put(
  "/:id",
  isAuth,
  FlowBuilderController.update
);

routes.delete(
  "/:id",
  isAuth,
  FlowBuilderController.delete
);

routes.post(
  "/:id/publish",
  isAuth,
  FlowBuilderController.publish
);

routes.post(
  "/:id/unpublish",
  isAuth,
  FlowBuilderController.unpublish
);

routes.post(
  "/:id/test",
  isAuth,
  FlowBuilderController.test
);

routes.post(
  "/:id/duplicate",
  isAuth,
  FlowBuilderController.duplicate
);

routes.get(
  "/:id/executions",
  isAuth,
  FlowBuilderController.listExecutions
);

routes.get(
  "/:id/executions/:executionId",
  isAuth,
  FlowBuilderController.getExecution
);

routes.post(
  "/:id/executions/:executionId/stop",
  isAuth,
  FlowBuilderController.stopExecution
);

routes.get(
  "/:id/analytics",
  isAuth,
  FlowBuilderController.getAnalytics
);

routes.post(
  "/:id/export",
  isAuth,
  FlowBuilderController.export
);

routes.post(
  "/import",
  isAuth,
  FlowBuilderController.import
);

routes.get(
  "/templates",
  isAuth,
  FlowBuilderController.listTemplates
);

routes.post(
  "/templates/:id/use",
  isAuth,
  FlowBuilderController.useTemplate
);

routes.get(
  "/categories",
  isAuth,
  FlowBuilderController.listCategories
);

routes.get(
  "/stats",
  isAuth,
  FlowBuilderController.getStats
);

routes.post(
  "/validate",
  isAuth,
  FlowBuilderController.validateFlow
);

routes.post(
  "/:id/execute",
  isAuth,
  FlowBuilderController.executeFlow
);

routes.get(
  "/node-types",
  isAuth,
  FlowBuilderController.getNodeTypes
);

routes.post(
  "/:id/clone",
  isAuth,
  FlowBuilderController.cloneFlow
);

routes.get(
  "/search",
  isAuth,
  FlowBuilderController.searchFlows
);

routes.post(
  "/:id/activate",
  isAuth,
  FlowBuilderController.activate
);

routes.post(
  "/:id/deactivate",
  isAuth,
  FlowBuilderController.deactivate
);

routes.get(
  "/:id/versions",
  isAuth,
  FlowBuilderController.listVersions
);

routes.post(
  "/:id/restore/:version",
  isAuth,
  FlowBuilderController.restoreVersion
);

routes.post(
  "/:id/schedule",
  isAuth,
  FlowBuilderController.scheduleExecution
);

routes.get(
  "/scheduled",
  isAuth,
  FlowBuilderController.listScheduled
);

routes.delete(
  "/scheduled/:id",
  isAuth,
  FlowBuilderController.deleteScheduled
);

routes.post(
  "/:id/webhook",
  isAuth,
  FlowBuilderController.handleWebhook
);

export default routes;