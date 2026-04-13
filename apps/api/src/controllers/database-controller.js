import { getDatabaseHealth } from "../services/database-service.js";

export function registerDatabaseRoutes(app) {
  app.get("/health/database", async (_request, response, next) => {
    try {
      const database = await getDatabaseHealth();

      response.status(200).json({
        status: "ok",
        database
      });
    } catch (error) {
      next(error);
    }
  });
}
