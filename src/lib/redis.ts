import Redis from 'ioredis';


const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // Şifre varsa:
  // password: process.env.REDIS_PASSWORD,
});

redisClient.on('connect', () => {
  console.log('🔗 Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

export default redisClient;