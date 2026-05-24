/**
 * Sistema de Segurança para Headers HTTP
 * Implementa headers de segurança recomendados (OWASP)
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersOptions {
  // Content Security Policy
  csp?: {
    enabled: boolean;
    directives?: Record<string, string | string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  
  // HSTS (HTTP Strict Transport Security)
  hsts?: {
    enabled: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  // X-Frame-Options
  frameOptions?: {
    enabled: boolean;
    action?: 'DENY' | 'SAMEORIGIN';
    allowFrom?: string;
  };
  
  // X-Content-Type-Options
  contentTypeOptions?: {
    enabled: boolean;
  };
  
  // X-XSS-Protection
  xssProtection?: {
    enabled: boolean;
    mode?: boolean;
    reportUri?: string;
  };
  
  // Referrer-Policy
  referrerPolicy?: {
    enabled: boolean;
    policy?: string | string[];
  };
  
  // Permissions-Policy (Feature-Policy)
  permissionsPolicy?: {
    enabled: boolean;
    features?: Record<string, string[]>;
  };
  
  // Cross-Origin Policies
  crossOrigin?: {
    embedderPolicy?: 'unsafe-none' | 'require-corp';
    openerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
    resourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
  };
  
  // Cache-Control para dados sensíveis
  noCacheForSensitive?: boolean;
}

const defaultOptions: Required<SecurityHeadersOptions> = {
  csp: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https:'],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
    },
    reportOnly: false,
    reportUri: undefined,
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: {
    enabled: true,
    action: 'SAMEORIGIN',
    allowFrom: undefined,
  },
  contentTypeOptions: {
    enabled: true,
  },
  xssProtection: {
    enabled: true,
    mode: true,
    reportUri: undefined,
  },
  referrerPolicy: {
    enabled: true,
    policy: 'strict-origin-when-cross-origin',
  },
  permissionsPolicy: {
    enabled: true,
    features: {
      accelerometer: [],
      camera: [],
      geolocation: [],
      gyroscope: [],
      magnetometer: [],
      microphone: [],
      payment: [],
      usb: [],
    },
  },
  crossOrigin: {
    embedderPolicy: 'require-corp',
    openerPolicy: 'same-origin',
    resourcePolicy: 'same-site',
  },
  noCacheForSensitive: true,
};

/**
 * Middleware para headers de segurança
 */
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  const opts = mergeOptions(defaultOptions, options);
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Content Security Policy
    if (opts.csp.enabled && opts.csp.directives) {
      const cspValue = buildCspString(opts.csp.directives, opts.csp.reportUri);
      const headerName = opts.csp.reportOnly 
        ? 'Content-Security-Policy-Report-Only' 
        : 'Content-Security-Policy';
      res.setHeader(headerName, cspValue);
    }
    
    // HSTS
    if (opts.hsts.enabled) {
      let hstsValue = `max-age=${opts.hsts.maxAge}`;
      if (opts.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (opts.hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    
    // X-Frame-Options
    if (opts.frameOptions.enabled) {
      if (opts.frameOptions.action === 'DENY') {
        res.setHeader('X-Frame-Options', 'DENY');
      } else if (opts.frameOptions.action === 'SAMEORIGIN') {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      } else if (opts.frameOptions.allowFrom) {
        res.setHeader('X-Frame-Options', `ALLOW-FROM ${opts.frameOptions.allowFrom}`);
      }
    }
    
    // X-Content-Type-Options
    if (opts.contentTypeOptions.enabled) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // X-XSS-Protection
    if (opts.xssProtection.enabled) {
      let xssValue = opts.xssProtection.mode ? '1; mode=block' : '1';
      if (opts.xssProtection.reportUri) {
        xssValue += `; report=${opts.xssProtection.reportUri}`;
      }
      res.setHeader('X-XSS-Protection', xssValue);
    }
    
    // Referrer-Policy
    if (opts.referrerPolicy.enabled) {
      const policy = Array.isArray(opts.referrerPolicy.policy)
        ? opts.referrerPolicy.policy.join(', ')
        : opts.referrerPolicy.policy;
      res.setHeader('Referrer-Policy', policy || 'strict-origin-when-cross-origin');
    }
    
    // Permissions-Policy
    if (opts.permissionsPolicy.enabled && opts.permissionsPolicy.features) {
      const features = Object.entries(opts.permissionsPolicy.features)
        .map(([feature, origins]) => {
          const value = origins.length === 0 ? '()' : `(${origins.join(' ')})`;
          return `${feature}=${value}`;
        })
        .join(', ');
      res.setHeader('Permissions-Policy', features);
    }
    
    // Cross-Origin Policies
    if (opts.crossOrigin.embedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', opts.crossOrigin.embedderPolicy);
    }
    if (opts.crossOrigin.openerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', opts.crossOrigin.openerPolicy);
    }
    if (opts.crossOrigin.resourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', opts.crossOrigin.resourcePolicy);
    }
    
    // No-cache para rotas sensíveis
    if (opts.noCacheForSensitive && isSensitivePath(req.path)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Remover headers que revelam informações do servidor
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
  };
}

/**
 * Constrói string CSP a partir de diretivas
 */
function buildCspString(
  directives: Record<string, string | string[]>,
  reportUri?: string
): string {
  const parts: string[] = [];
  
  for (const [directive, value] of Object.entries(directives)) {
    const values = Array.isArray(value) ? value : [value];
    parts.push(`${directive} ${values.join(' ')}`);
  }
  
  if (reportUri) {
    parts.push(`report-uri ${reportUri}`);
    parts.push(`report-to ${reportUri}`);
  }
  
  return parts.join('; ');
}

/**
 * Verifica se path é sensível (requer no-cache)
 */
function isSensitivePath(path: string): boolean {
  const sensitivePatterns = [
    '/auth',
    '/login',
    '/logout',
    '/account',
    '/settings',
    '/admin',
    '/api/user',
    '/api/auth',
    '/dashboard',
    '/profile',
  ];
  
  return sensitivePatterns.some((pattern) => path.startsWith(pattern));
}

/**
 * Merge de opções com defaults
 */
function mergeOptions(
  defaults: Required<SecurityHeadersOptions>,
  overrides: SecurityHeadersOptions
): Required<SecurityHeadersOptions> {
  const result = { ...defaults };
  
  if (overrides.csp) {
    result.csp = { ...defaults.csp, ...overrides.csp };
  }
  if (overrides.hsts) {
    result.hsts = { ...defaults.hsts, ...overrides.hsts };
  }
  if (overrides.frameOptions) {
    result.frameOptions = { ...defaults.frameOptions, ...overrides.frameOptions };
  }
  if (overrides.contentTypeOptions !== undefined) {
    result.contentTypeOptions = overrides.contentTypeOptions;
  }
  if (overrides.xssProtection) {
    result.xssProtection = { ...defaults.xssProtection, ...overrides.xssProtection };
  }
  if (overrides.referrerPolicy) {
    result.referrerPolicy = { ...defaults.referrerPolicy, ...overrides.referrerPolicy };
  }
  if (overrides.permissionsPolicy) {
    result.permissionsPolicy = { 
      ...defaults.permissionsPolicy, 
      ...overrides.permissionsPolicy,
      features: { ...defaults.permissionsPolicy.features, ...overrides.permissionsPolicy.features }
    };
  }
  if (overrides.crossOrigin) {
    result.crossOrigin = { ...defaults.crossOrigin, ...overrides.crossOrigin };
  }
  if (overrides.noCacheForSensitive !== undefined) {
    result.noCacheForSensitive = overrides.noCacheForSensitive;
  }
  
  return result;
}

/**
 * Configurações CSP predefinidas para diferentes cenários
 */
export const cspPresets = {
  // CSP restritivo para máxima segurança
  strict: {
    enabled: true,
    directives: {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
    reportOnly: false,
  },
  
  // CSP mais permissivo para desenvolvimento
  development: {
    enabled: true,
    directives: {
      'default-src': ["'self'", 'data:', 'blob:'],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
      'style-src': ["'self'", "'unsafe-inline'", 'localhost:*'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'font-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'ws:', 'wss:', 'localhost:*'],
      'frame-src': ["'self'", 'localhost:*'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
    },
    reportOnly: true,
  },
  
  // CSP para aplicação que usa CDN
  withCdn: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https:'],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
    },
    reportOnly: false,
  },
};

export default securityHeaders;
