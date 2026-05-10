import './config/env'; // valide les variables d'environnement en premier
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initSocket } from './config/socket';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import themesRoutes from './routes/themes.routes';
import choixRoutes from './routes/choix.routes';
import binomesRoutes from './routes/binomes.routes';
import affectationsRoutes from './routes/affectations.routes';
import soutenancesRoutes from './routes/soutenances.routes';
import sessionsRoutes from './routes/sessions.routes';
import specialitesRoutes from './routes/specialites.routes';
import statsRoutes from './routes/stats.routes';
import notificationsRoutes from './routes/notifications.routes';
import searchRoutes from './routes/search.routes';
import annoncesRoutes from './routes/annonces.routes';

const app = express();
const httpServer = http.createServer(app);

// ─── Middlewares globaux ────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard' },
});
app.use('/api', limiter);

// ─── Routes ─────────────────────────────────────────────────────────────────

const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/themes`, themesRoutes);
app.use(`${API}/choix`, choixRoutes);
app.use(`${API}/binomes`, binomesRoutes);
app.use(`${API}/affectations`, affectationsRoutes);
app.use(`${API}/soutenances`, soutenancesRoutes);
app.use(`${API}/sessions`, sessionsRoutes);
app.use(`${API}/specialites`, specialitesRoutes);
app.use(`${API}/stats`, statsRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/annonces`, annoncesRoutes);

app.get(`${API}/health`, (_req, res) => {
  res.json({ success: true, status: 'ok', env: env.NODE_ENV });
});

// ─── Gestion des erreurs ─────────────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── Démarrage ───────────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info('Base de données connectée');

    await connectRedis();

    initSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      logger.info(`Serveur démarré sur http://localhost:${env.PORT}`);
      logger.info(`Environnement : ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Échec du démarrage :', err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Signal ${signal} reçu — arrêt gracieux`);
  httpServer.close(async () => {
    await disconnectDatabase();
    await disconnectRedis();
    logger.info('Serveur arrêté proprement');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

void bootstrap();

export { app, httpServer };
