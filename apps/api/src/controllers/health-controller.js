export function registerHealthRoutes(app) {
  app.get("/api/v1/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "api"
    });
  });
}
