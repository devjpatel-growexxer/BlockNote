export function registerHealthRoutes(app) {
  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "api"
    });
  });
}
