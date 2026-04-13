import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { API_PREFIX } from "@blocknote/shared";
import { registerAuthRoutes } from "./controllers/auth-controller.js";
import { registerDatabaseRoutes } from "./controllers/database-controller.js";
import { apiErrorHandler } from "./middleware/error-handler.js";
import { registerHealthRoutes } from "./controllers/health-controller.js";
import { getServerEnv } from "./utils/env.js";

export function createApp() {
  const env = getServerEnv();
  const app = express();
  const apiRouter = express.Router();

  app.use(
    cors({
      origin: env.webOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  registerHealthRoutes(apiRouter);
  registerDatabaseRoutes(apiRouter);
  registerAuthRoutes(apiRouter);

  app.use(API_PREFIX, apiRouter);

  app.use(apiErrorHandler);

  return app;
}
