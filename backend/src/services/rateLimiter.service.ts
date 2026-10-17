import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { getUtcHourWindowString, getDelayUntilNextHourWindowMs } from '../utils/scheduling';
import { logger } from '../utils/logger';

// Atomic Redis Lua Script for hourly rate check and increment
// KEYS[1] = rate limit key: email-rate-limit:{senderId}:{hourWindow}
// ARGV[1] = hourlyLimit
// ARGV[2] = key TTL in seconds (7200)
// Return: 1 if allowed (incremented), 0 if limit exceeded
const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call('GET', KEYS[1])
  if current and tonumber(current) >= tonumber(ARGV[1]) then
    return 0
  else
    local newVal = redis.call('INCR', KEYS[1])
    if tonumber(newVal) == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[2])
    end
    return 1
  end
`;

export interface RateLimitCheckResult {
  allowed: boolean;
  senderId: string;
  hourWindow: string;
  hourlyLimit: number;
  delayUntilNextWindowMs?: number;
}

export class RateLimiterService {
  /**
   * Atomically checks if the sender has available quota in the current UTC hour window.
   * If quota is available, it atomically increments the count and returns allowed: true.
   * If quota is exhausted, returns allowed: false with the delay until the next UTC window.
   */
  async checkAndConsumeRateLimit(
    senderId: string,
    customHourlyLimit?: number
  ): Promise<RateLimitCheckResult> {
    const limit = customHourlyLimit || env.MAX_EMAILS_PER_HOUR;
    const hourWindow = getUtcHourWindowString(new Date());
    const redisKey = `email-rate-limit:${senderId}:${hourWindow}`;
    const ttlSeconds = 7200; // 2 hours TTL ensures cleanup after window expires

    try {
      // Execute atomic Lua script
      const result = await redisClient.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        redisKey,
        limit.toString(),
        ttlSeconds.toString()
      );

      const allowed = result === 1;

      if (!allowed) {
        const delayUntilNextWindowMs = getDelayUntilNextHourWindowMs();
        logger.warn('Hourly rate limit reached for sender', {
          senderId,
          hourWindow,
          limit,
          delayUntilNextWindowMs,
        });

        return {
          allowed: false,
          senderId,
          hourWindow,
          hourlyLimit: limit,
          delayUntilNextWindowMs,
        };
      }

      return {
        allowed: true,
        senderId,
        hourWindow,
        hourlyLimit: limit,
      };
    } catch (err: any) {
      logger.error('Error executing rate limit check in Redis', {
        senderId,
        redisKey,
        error: err.message,
      });
      // In case of Redis script error, allow to avoid dropping critical email, but log prominently
      return {
        allowed: true,
        senderId,
        hourWindow,
        hourlyLimit: limit,
      };
    }
  }

  /**
   * Enforces sender minimum send delay (e.g., 2000ms between individual emails from the same sender).
   */
  async enforceMinSendDelay(senderId: string, minDelayMs: number = env.MIN_SEND_DELAY_MS): Promise<void> {
    const key = `email-last-sent:${senderId}`;
    const now = Date.now();

    try {
      const lastSentStr = await redisClient.get(key);
      if (lastSentStr) {
        const lastSent = parseInt(lastSentStr, 10);
        const elapsed = now - lastSent;
        if (elapsed < minDelayMs) {
          const waitTime = minDelayMs - elapsed;
          logger.debug(`Enforcing min delay of ${waitTime}ms for sender ${senderId}`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
      // Record current send timestamp with a 60s TTL
      await redisClient.set(key, Date.now().toString(), 'EX', 60);
    } catch (err: any) {
      logger.warn('Failed to enforce min send delay check in Redis', { error: err.message });
    }
  }
}

export const rateLimiterService = new RateLimiterService();
