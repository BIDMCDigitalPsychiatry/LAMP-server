import { Pool } from "pg" // or whatever SQL client you choose

// Create connection pool for audit database
const auditPool = new Pool({
  connectionString: process.env.postgresDB,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

auditPool
  .connect()
  .then((client) => {
    console.log("Connected to the audit database")
    client.release()
  })
  .catch((err: any) => {
    console.error("Error connecting to the audit database", err)
  })

export async function AuditLogQueueProcess(job: any): Promise<void> {
  try {
    const data = job.data

    await auditPool.query(
      `
      INSERT INTO audit_logs 
      (timestamp, object_type, object_id, read_only, fields_changed, access_by, 
       http_method, api_endpoint, response_status, ip_address, user_agent, request_id, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        data.timestamp,
        data.object_type,
        data.object_id,
        data.read_only,
        JSON.stringify(data.fields_changed),
        data.access_by,
        data.http_method,
        data.api_endpoint,
        data.response_status,
        data.ip_address,
        data.user_agent,
        data.request_id,
        data.response_time_ms,
      ]
    )
  } catch (error) {
    console.error("Failed to write audit log:", error)
    // Don't throw - audit failures shouldn't break the system
  }
}
