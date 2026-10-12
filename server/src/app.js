import { requestLimits, accountLoginLimits } from "./middlewares/requestLimits.js";
// Punto de entrada del servidor Express.
// Monta middlewares, expone rutas API y sirve uploads locales de respaldo.
import { mediaUrls } from "./middlewares/mediaUrls.js";
import searchRoutes from "./routes/searchRoutes.js";
import readerExperienceRoutes from './routes/readerExperienceRoutes.js';
import experienceRoutes from './routes/experienceRoutes.js';
import launchRoutes from './routes/launchRoutes.js';
import publicPages from './routes/publicPages.js';
import {fileURLToPath} from 'node:url';
import {operationalAlert} from './utils/operationalAlerts.js';
import collaborationRoutes from "./routes/collaborationRoutes.js";
import cors from "cors";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import recoveryRoutes from './routes/recoveryRoutes.js';
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
// QA's API listens only on loopback behind its own Vite proxy.
// Keep real devices distinct without trusting forwarding headers in the main site.
if (['qa-local', 'staging'].includes(process.env.APP_ENV)) app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox");
  }
  next();
});

const allowedOrigins=new Set((process.env.CORS_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://127.0.0.1:5182,http://127.0.0.1:5192').split(',').map(x=>x.trim()).filter(Boolean));
app.use(cors({origin(origin,callback){if(!origin||allowedOrigins.has(origin))return callback(null,true);callback(Object.assign(new Error('Origen no permitido.'),{status:403}));}}));
app.use(requestLimits);
app.use(express.json({ limit: "1mb" }));
app.use(accountLoginLimits);
app.use(attachAuthUser);
app.use(mediaUrls);
app.use(
  `/${env.uploadFallbackDir}`,
  express.static(env.uploadAbsoluteDir)
);

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    service: "histopad-server",
    storage: isSupabaseEnabled() ? "supabase" : "local-fallback",
    environment: process.env.APP_ENV||'development'
  });
});

app.use("/api/workspace", workspaceRoutes);
app.use('/api/reader',readerExperienceRoutes);
app.use('/api/experience',experienceRoutes);
app.use('/api/launch',launchRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/collaborations", collaborationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/illustrations", illustrationRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use(publicPages);
if(process.env.NODE_ENV==='production')app.use(express.static(fileURLToPath(new URL('../../client/dist/',import.meta.url))));

app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));

app.use((error, request, response, next) => {
  const status = error.status || (error.code === "LIMIT_FILE_SIZE" ? 413 : error.code?.startsWith('LIMIT_') ? 400 : 500);
  if (status >= 500) console.error({ event: 'request.failed', status, method: request.method });
  if(status>=500)operationalAlert('api.error','La API registró un error de servidor.').catch(()=>{});
  response.status(status).json({
    ...(error.code&&['MFA_REQUIRED','REAUTHENTICATION_REQUIRED','INVALID_REAUTH_CODE'].includes(error.code)?{code:error.code}:{}),
    message: error.type === 'entity.parse.failed' ? 'JSON inválido.' : status >= 500 ? "No se pudo completar la solicitud. Reintenta más tarde." : error.message || "Error interno del servidor"
  });
});

export default app;
