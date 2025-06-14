import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache TTL in seconds
const CACHE_TTL = 15 * 60; // 15 minutes

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export const cache = {
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      const data = await redis.get(fullKey);
      
      if (data) {
        cacheHits++;
        return JSON.parse(data);
      }
      
      cacheMisses++;
      return null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      const ttl = options?.ttl || CACHE_TTL;
      await redis.setex(fullKey, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  async delete(key: string, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      await redis.del(fullKey);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await redis.flushall();
      cacheHits = 0;
      cacheMisses = 0;
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  },

  getStats() {
    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
    return {
      hits: cacheHits,
      misses: cacheMisses,
      total,
      hitRate: `${hitRate.toFixed(2)}%`
    };
  }
};

export default redis; 