import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { registerDatabaseRoutes } from "./controllers/database-controller.js";
import { apiErrorHandler } from "./middleware/error-handler.js";
import { registerHealthRoutes } from "./controllers/health-controller.js";
import { getServerEnv } from "./utils/env.js";

export function createApp() {
  const env = getServerEnv();
  const app = express();

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

  registerHealthRoutes(app);
  registerDatabaseRoutes(app);

  app.use(apiErrorHandler);

  return app;
}
