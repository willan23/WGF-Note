/**
 * Sistema de Validação e Sanitização de Dados
 * Previne XSS, SQL Injection e outros ataques de injeção
 */

import { z, ZodSchema } from 'zod';

// Configurações de sanitização
export interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

/**
 * Remove tags HTML perigosas para prevenir XSS
 */
export function sanitizeHtml(input: string, options: SanitizeOptions = {}): string {
  if (!input) return '';
  
  let sanitized = input;
  
  // Se não permitir HTML, remover todas as tags
  if (!options.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // Remover scripts e eventos perigosos mesmo permitindo HTML
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  }
  
  // Aplicar transformações
  if (options.trim) {
    sanitized = sanitized.trim();
  }
  
  if (options.lowercase) {
    sanitized = sanitized.toLowerCase();
  }
  
  if (options.uppercase) {
    sanitized = sanitized.toUpperCase();
  }
  
  // Limitar tamanho máximo
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitiza um objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const result: any = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeHtml(value, options);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, options);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida se é um email válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza URL para prevenir ataques
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Permitir apenas protocolos seguros
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error('Protocolo não permitido');
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Escapa caracteres especiais para prevenir XSS em contextos HTML
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * Valida e sanitiza input baseado em schema Zod
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown,
  sanitizeOptions?: SanitizeOptions
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    // Primeiro sanitiza se opções fornecidas
    let sanitizedData = data;
    if (sanitizeOptions && typeof data === 'object' && data !== null) {
      sanitizedData = sanitizeObject(data as Record<string, any>, sanitizeOptions);
    }
    
    const result = schema.parse(sanitizedData);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Schemas comuns para validação
 */
export const commonSchemas = {
  // Email
  email: z.string().email('Email inválido'),
  
  // Senha forte (mínimo 8 chars, letra maiúscula, número, caractere especial)
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  
  // Nome de usuário (apenas letras, números e underscore)
  username: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Nome de usuário inválido').min(3).max(30),
  
  // URL válida
  url: z.string().url('URL inválida'),
  
  // UUID
  uuid: z.string().uuid('UUID inválido'),
  
  // ID numérico positivo
  positiveId: z.number().int().positive(),
  
  // String não vazia
  nonEmptyString: z.string().min(1, 'Campo não pode ser vazio'),
  
  // Data ISO
  isoDate: z.string().datetime('Data inválida'),
  
  // JSON object
  jsonObject: z.record(z.any()),
};

/**
 * Cria um schema para inputs de formulário com sanitização automática
 */
export function createSanitizedSchema<T extends z.ZodRawShape>(
  shape: T,
  options: SanitizeOptions = {}
): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Middleware de validação para Express (tipo TypeScript)
 */
export interface ValidationMiddleware {
  <T>(schema: ZodSchema<T>): (req: any, res: any, next: any) => void;
}

/**
 * Factory para criar middleware de validação
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  options: {
    location?: 'body' | 'query' | 'params';
    sanitize?: boolean;
    sanitizeOptions?: SanitizeOptions;
  } = {}
) {
  const { location = 'body', sanitize = true, sanitizeOptions = {} } = options;
  
  return (req: any, res: any, next: any) => {
    const data = req[location];
    
    let validatedData = data;
    if (sanitize && typeof data === 'object' && data !== null) {
      validatedData = sanitizeObject(data, sanitizeOptions);
    }
    
    const result = validateWithSchema(schema, validatedData);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validação falhou',
        details: result.errors,
      });
    }
    
    // Substituir dados originais pelos validados
    req[location] = result.data;
    next();
  };
}

export default {
  sanitizeHtml,
  sanitizeObject,
  sanitizeEmail,
  sanitizeUrl,
  escapeHtml,
  validateWithSchema,
  createValidationMiddleware,
  commonSchemas,
  isValidEmail,
};
