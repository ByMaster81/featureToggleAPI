import { Command } from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../../lib/redis';
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const store = new RedisStore({
  sendCommand: async (...args: string[]) => {
    const command = new Command(args[0], args.slice(1), { replyEncoding: 'utf8' });
    return (await redisClient.sendCommand(command)) as any;
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // 100 istek limiti
  keyGenerator: (req) => ipKeyGenerator(req as any), 
  message: "Too many requests from this IP, please try again later.",
});

export default apiLimiter;
