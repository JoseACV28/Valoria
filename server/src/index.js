// Punto de entrada del servidor Express.
// Monta middlewares, expone rutas API y sirve uploads locales de respaldo.
import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./config/env.js";
import { isSupabaseEnabled } from "./config/supabase.js";
import illustrationRoutes from "./routes/illustrationRoutes.js";
import { attachAuthUser } from "./middlewares/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(attachAuthUser);
app.use(
  `/${env.uploadFallbackDir}`,
  express.static(path.resolve("server", env.uploadFallbackDir))
);

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    service: "histopad-server",
    storage: isSupabaseEnabled() ? "supabase" : "local-fallback"
  });
});

app.use("/api/stories", storyRoutes);
app.use("/api/illustrations", illustrationRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);

app.use((error, request, response, next) => {
  console.error(error);

  response.status(500).json({
    message: error.message || "Error interno del servidor"
  });
});

app.listen(env.port, () => {
  console.log(`HistoPad server listening on http://localhost:${env.port}`);
});
