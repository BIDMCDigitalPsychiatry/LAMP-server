import { AuditLogQueue } from "./queue/Queue"

export interface AuditLogEntry {
  timestamp: Date
  object_type: string
  object_id: string
  read_only: boolean
  fields_changed?: any
  access_by: string
  http_method?: string
  api_endpoint?: string
  response_status?: number
  ip_address?: string
  user_agent?: string
  request_id?: string
  response_time_ms?: number
}

export function logAuditEvent(entry: AuditLogEntry): void {
  // Queue audit entry asynchronously - don't wait for completion
  AuditLogQueue?.add(entry, {
    removeOnComplete: true,
    removeOnFail: true,
  }).catch((error: any) => {
    console.error("Failed to queue audit log:", error)
  })
}

// Helper to extract context from Express request
export function extractAuditContext(req: any): Partial<AuditLogEntry> {
  return {
    ip_address: req.ip || req.connection?.remoteAddress,
    user_agent: req.get("User-Agent"),
    request_id: req.get("X-Request-ID") || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    http_method: req.method,
    api_endpoint: req.path,
  }
}
