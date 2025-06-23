const lockoutMap = new Map() // key: user email or IP

const max_attempts = 5 //5 attempts since parent is called twice
const lock_time = 15 * 60 * 1000 // 15 mins

function isLocked(access_key: any) {
  const record = lockoutMap.get(access_key)
  if (!record) return false
  if (record.lockUntil && Date.now() < record.lockUntil) return true
  return false
}

function recordFailedAttempts(access_key: any) {
  const existing = lockoutMap.get(access_key) || { attempts: 0 }
  existing.attempts += 1

  if (existing.attempts >= max_attempts) {
    existing.lockUntil = Date.now() + lock_time
  }

  lockoutMap.set(access_key, existing)
}

function clearAttempts(access_key: any) {
  lockoutMap.delete(access_key)
}

module.exports = {
  isLocked,
  recordFailedAttempts,
  clearAttempts,
}
