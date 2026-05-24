/**
 * Sistema de Rate Limiting para proteção contra abuso e ataques DDoS
 * Implementa limites por IP, usuário e endpoint
 */

import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number;          // Janela de tempo em ms
  maxRequests: number;       // Máximo de requisições por janela
  message: string;           // Mensagem de erro
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class RateLimitStore {
  private store: Map<string, RateLimitInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs: number = 60000) {
    this.startCleanup();
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, info] of this.store.entries()) {
        if (now > info.resetTime) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
  }

  public stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  public get(key: string): RateLimitInfo | undefined {
    return this.store.get(key);
  }

  public increment(key: string, windowMs: number): RateLimitInfo {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && now < existing.resetTime) {
      const updated: RateLimitInfo = {
        ...existing,
        count: existing.count + 1,
      };
      this.store.set(key, updated);
      return updated;
    }

    const newInfo: RateLimitInfo = {
      count: 1,
      resetTime: now + windowMs,
    };
    this.store.set(key, newInfo);
    return newInfo;
  }

  public reset(key: string): void {
    this.store.delete(key);
  }
}

class RateLimiter {
  private stores: Map<string, RateLimitStore> = new Map();

  private getStore(configId: string): RateLimitStore {
    if (!this.stores.has(configId)) {
      this.stores.set(configId, new RateLimitStore());
    }
    return this.stores.get(configId)!;
  }

  public middleware(config: RateLimitConfig, keyGenerator?: (req: Request) => string) {
    const store = this.getStore(`default_${config.windowMs}_${config.maxRequests}`);
    const getKey = keyGenerator || this.defaultKeyGenerator;

    return (req: Request, res: Response, next: NextFunction) => {
      // Pular requisições bem-sucedidas se configurado
      if (config.skipSuccessfulRequests && res.statusCode < 400) {
        return next();
      }

      const key = getKey(req);
      const info = store.increment(key, config.windowMs);

      // Adicionar headers de rate limit
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - info.count).toString());
      res.setHeader('X-RateLimit-Reset', info.resetTime.toString());

      if (info.count > config.maxRequests) {
        res.setHeader('Retry-After', Math.ceil((info.resetTime - Date.now()) / 1000).toString());
        res.status(429).json({
          error: config.message,
          retryAfter: Math.ceil((info.resetTime - Date.now()) / 1000),
        });
        return;
      }

      next();
    };
  }

  private defaultKeyGenerator(req: Request): string {
    // Priorizar identificação por usuário autenticado
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    // Fallback para IP
    const ip = req.ip || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
               'unknown';
    return `ip:${ip}`;
  }

  public reset(key: string, configId: string = 'default'): void {
    const store = this.stores.get(configId);
    if (store) {
      store.reset(key);
    }
  }
}

// Configurações predefinidas
export const rateLimitConfigs = {
  // Limite geral para API
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    message: 'Muitas requisições, tente novamente mais tarde.',
  } as RateLimitConfig,

  // Limite para autenticação (mais restritivo)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 10,
    message: 'Muitas tentativas de autenticação, tente novamente mais tarde.',
  } as RateLimitConfig,

  // Limite para upload de arquivos
  upload: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    message: 'Muitos uploads, tente novamente mais tarde.',
  } as RateLimitConfig,

  // Limite para operações sensíveis
  sensitive: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 5,
    message: 'Muitas operações sensíveis, tente novamente mais tarde.',
  } as RateLimitConfig,

  // Limite agressivo para prevenção de brute force
  strict: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 5,
    message: 'Muitas requisições rápidas, aguarde um momento.',
  } as RateLimitConfig,
};

export const rateLimiter = new RateLimiter();

// Middleware factory para uso fácil
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  keyGenerator?: (req: Request) => string
) {
  return rateLimiter.middleware(config, keyGenerator);
}

// Middleware específico para rotas de autenticação
export const authRateLimit = createRateLimitMiddleware(rateLimitConfigs.auth);

// Middleware para rotas gerais da API
export const apiRateLimit = createRateLimitMiddleware(rateLimitConfigs.general);

// Middleware para operações sensíveis
export const sensitiveRateLimit = createRateLimitMiddleware(rateLimitConfigs.sensitive);

export default rateLimiter;
