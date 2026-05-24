/**
 * Sistema de Auditoria e Logging de Segurança
 * Registra eventos críticos para análise forense e compliance
 */

import { EventEmitter } from 'events';

export enum AuditEventType {
  // Autenticação
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  
  // Autorização
  PERMISSION_DENIED = 'permission_denited',
  ROLE_CHANGE = 'role_change',
  ACCESS_GRANTED = 'access_granted',
  
  // Dados sensíveis
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  DATA_EXPORT = 'data_export',
  
  // Sistema
  CONFIG_CHANGE = 'config_change',
  SYSTEM_ERROR = 'system_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Arquivos
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  userId?: string | number;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
}

export interface AuditLogFilter {
  eventType?: AuditEventType;
  userId?: string | number;
  startDate?: Date;
  endDate?: Date;
  severity?: AuditEvent['severity'];
  search?: string;
  limit?: number;
  offset?: number;
}

class AuditLogger extends EventEmitter {
  private logs: AuditEvent[] = [];
  private maxLogsInMemory: number = 10000;
  private logFilePath?: string;
  private enabled: boolean = true;
  
  constructor(options?: { maxLogs?: number; file?: string; enabled?: boolean }) {
    super();
    if (options?.maxLogs) this.maxLogsInMemory = options.maxLogs;
    if (options?.file) this.logFilePath = options.file;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Registra um evento de auditoria
   */
  public log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    if (!this.enabled) return {} as AuditEvent;
    
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };
    
    // Adicionar ao buffer em memória
    this.logs.push(auditEvent);
    
    // Manter apenas os últimos N logs em memória
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift();
    }
    
    // Emitir evento para listeners (ex: salvar em banco, enviar para SIEM)
    this.emit('audit', auditEvent);
    
    // Salvar em arquivo se configurado
    if (this.logFilePath) {
      this.saveToFile(auditEvent);
    }
    
    // Log crítico também no console
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn('[AUDIT]', JSON.stringify(auditEvent));
    }
    
    return auditEvent;
  }

  /**
   * Helper para login bem-sucedido
   */
  public logLoginSuccess(
    userId: string | number,
    email: string,
    ipAddress: string,
    userAgent?: string
  ): AuditEvent {
    return this.log({
      type: AuditEventType.LOGIN_SUCCESS,
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
      action: 'User logged in successfully',
      severity: 'low',
      success: true,
    });
  }

  /**
   * Helper para falha de login
   */
  public logLoginFailure(
    email: string,
    ipAddress: string,
    userAgent?: string,
    reason?: string
  ): AuditEvent {
    return this.log({
      type: AuditEventType.LOGIN_FAILURE,
      userEmail: email,
      ipAddress,
      userAgent,
      action: 'Login attempt failed',
      details: reason ? { reason } : undefined,
      severity: 'medium',
      success: false,
    });
  }

  /**
   * Helper para acesso a dados sensíveis
   */
  public logDataAccess(
    userId: string | number,
    resource: string,
    ipAddress: string,
    details?: Record<string, any>
  ): AuditEvent {
    return this.log({
      type: AuditEventType.DATA_ACCESS,
      userId,
      ipAddress,
      resource,
      action: 'Sensitive data accessed',
      details,
      severity: 'medium',
      success: true,
    });
  }

  /**
   * Helper para atividade suspeita
   */
  public logSuspiciousActivity(
    description: string,
    ipAddress: string,
    userId?: string | number,
    details?: Record<string, any>
  ): AuditEvent {
    return this.log({
      type: AuditEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      action: 'Suspicious activity detected',
      details: { description, ...details },
      severity: 'high',
      success: true,
    });
  }

  /**
   * Busca logs com filtros
   */
  public searchLogs(filter: AuditLogFilter): AuditEvent[] {
    let results = [...this.logs];
    
    // Filtrar por tipo
    if (filter.eventType) {
      results = results.filter((log) => log.type === filter.eventType);
    }
    
    // Filtrar por usuário
    if (filter.userId) {
      results = results.filter((log) => log.userId === filter.userId);
    }
    
    // Filtrar por período
    if (filter.startDate) {
      results = results.filter((log) => log.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      results = results.filter((log) => log.timestamp <= filter.endDate!);
    }
    
    // Filtrar por severidade
    if (filter.severity) {
      results = results.filter((log) => log.severity === filter.severity);
    }
    
    // Busca textual
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(
        (log) =>
          log.action.toLowerCase().includes(searchLower) ||
          log.userEmail?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar por timestamp (mais recente primeiro)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Paginação
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Exporta logs para JSON
   */
  public exportLogs(filter?: AuditLogFilter): string {
    const logs = filter ? this.searchLogs(filter) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Limpa logs antigos (mantém apenas últimos N dias)
   */
  public cleanup(daysToKeep: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp > cutoff);
    
    return initialCount - this.logs.length;
  }

  /**
   * Habilita/desabilita logging
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Gera ID único para evento
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Salva evento em arquivo (implementação básica)
   */
  private saveToFile(event: AuditEvent): void {
    // Em produção, usar sistema de arquivos ou serviço externo
    // Esta é uma implementação simplificada
    try {
      const fs = require('fs');
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.logFilePath, line);
    } catch (error) {
      console.error('[AUDIT] Failed to write to file:', error);
    }
  }
}

// Instância singleton para uso global
export const auditLogger = new AuditLogger({
  maxLogs: 10000,
  enabled: process.env.NODE_ENV !== 'test',
});

// Middleware para Express que registra requisições
export function createAuditMiddleware(options?: { 
  skipPaths?: string[];
  logBody?: boolean;
}) {
  const { skipPaths = ['/health', '/metrics'], logBody = false } = options || {};
  
  return (req: any, res: any, next: any) => {
    // Pular paths ignorados
    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }
    
    const startTime = Date.now();
    
    // Registrar após resposta
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Log para operações sensíveis ou erros
      if (
        req.method !== 'GET' ||
        res.statusCode >= 400 ||
        req.path.includes('/auth') ||
        req.path.includes('/admin')
      ) {
        auditLogger.log({
          type: req.method === 'POST' && req.path.includes('/auth')
            ? AuditEventType.LOGIN_SUCCESS
            : AuditEventType.DATA_ACCESS,
          userId: (req as any).user?.id,
          userEmail: (req as any).user?.email,
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          resource: req.path,
          action: `${req.method} ${req.path}`,
          details: {
            statusCode: res.statusCode,
            duration,
            ...(logBody && req.body ? { body: req.body } : {}),
          },
          severity: res.statusCode >= 500 ? 'high' : res.statusCode >= 400 ? 'medium' : 'low',
          success: res.statusCode < 400,
        });
      }
    });
    
    next();
  };
}

export default auditLogger;
