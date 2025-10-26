// src/api/middlewares/rateLimit.middleware.ts

import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../lib/redis';
import { Request, Response } from 'express';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request, res: Response): string => {
    // 1. Tenant ID'yi dene
    // 2. O yoksa IP adresini dene
    // 3. O da yoksa (örn: test ortamı) statik bir anahtar kullan
    return req.user?.tenantId ?? req.ip ?? 'unknown-key';
  },

  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      message: 'Çok fazla istekte bulundunuz. Lütfen 15 dakika sonra tekrar deneyin.',
    });
  },

  // --- HATA ÇÖZÜMÜ BURADA ---
  store: new RedisStore({
    // 1. Fonksiyon imzası (...args: string[]), rate-limit-redis'in 
    //    'INCR', 'key' gibi birden fazla argüman göndermesini karşılar.
    sendCommand: (...args: string[]) => {
      
      // 2. 'args' değişkeni artık ['INCR', 'key'] gibi bir dizidir.

      // 3. Hata veren 'redisClient.call(...args)' yerine, .apply kullanarak 
      //    'args' dizisini 'call' metoduna argüman olarak güvenle iletiyoruz.
      //    Tipleri zorlamak için 'as any' kullanıyoruz.
      return redisClient.call.apply(redisClient, args as any) as any;
    },
  }),
});

export default apiLimiter;