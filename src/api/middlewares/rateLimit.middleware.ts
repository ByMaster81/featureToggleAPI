// src/api/middlewares/rateLimit.middleware.ts

import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../lib/redis';
import { Request, Response } from 'express';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request, res: Response): string => {

    if (req.user?.tenantId) {
      return req.user.tenantId;
    }
    

    return ipKeyGenerator(req as any) ?? 'unknown-key';
  },

  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      message: 'Çok fazla istekte bulundunuz. Lütfen 15 dakika sonra tekrar deneyin.',
    });
  },

  store: new RedisStore({

    sendCommand: (...args: string[]) => {
      return redisClient.call.apply(redisClient, args as any) as any;
    },
  }),
});

export default apiLimiter;