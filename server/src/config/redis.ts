import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      logger.error('Redis : impossible de se connecter après 3 tentatives');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connecté'));
redis.on('error', (err) => logger.error('Erreur Redis :', err));
redis.on('close', () => logger.warn('Connexion Redis fermée'));

export const redisSub = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redisSub.on('error', (err) => logger.error('Redis sub error:', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redisSub.connect();
  logger.info('Redis pub/sub connecté');
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  await redisSub.quit();
}
