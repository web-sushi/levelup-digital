/**
 * Lua is the Upstash execution path. The memory store mirrors the decisions in
 * TypeScript and is what `npm test` runs. Live execution is a separate harness.
 *
 * Rate-limit windows use Redis `TIME`, not the caller's clock. KEYS for the
 * limiter is a prefix; the script appends the server-time window id.
 */
export const RATE_LIMIT_SCRIPT = `local time = redis.call("TIME")
local now = tonumber(time[1])
local window_seconds = tonumber(ARGV[2])
local key = KEYS[1] .. ":" .. math.floor(now / window_seconds)
local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, window_seconds)
end
local ttl = redis.call("TTL", key)
if ttl < 0 then
  ttl = window_seconds
end
if current > tonumber(ARGV[1]) then
  return {0, ttl}
end
return {1, ttl}`;

export const BEGIN_SCRIPT = `local function parse(raw)
  local state, fingerprint, owner, lease_until, confirmation, category = string.match(raw, "^v1|([^|]*)|([^|]*)|([^|]*)|([^|]*)|([^|]*)|([^|]*)$")
  if not state then
    return nil
  end
  return state, fingerprint, owner, lease_until, confirmation, category
end
local function redis_now_ms()
  local time = redis.call("TIME")
  return tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
end
local function take_slot()
  local time = redis.call("TIME")
  local window_seconds = tonumber(ARGV[7])
  local key = KEYS[2] .. ":" .. math.floor(tonumber(time[1]) / window_seconds)
  local current = redis.call("INCR", key)
  if current == 1 then
    redis.call("EXPIRE", key, window_seconds)
  end
  local ttl = redis.call("TTL", key)
  if ttl < 0 then
    ttl = window_seconds
  end
  if current > tonumber(ARGV[6]) then
    return false, ttl
  end
  return true, ttl
end
local now = redis_now_ms()
local retention = tonumber(ARGV[5])
local raw = redis.call("GET", KEYS[1])
if raw then
  local state, fingerprint, owner, lease_until, confirmation, category = parse(raw)
  if not state then
    return {"unavailable"}
  end
  if fingerprint ~= ARGV[1] then
    local allowed, ttl = take_slot()
    if not allowed then
      return {"limited", ttl}
    end
    return {"conflict"}
  end
  if state == "accepted" then
    return {"accepted", confirmation}
  end
  if state == "rejected" then
    return {"rejected"}
  end
  if state == "unknown" then
    return {"unknown"}
  end
  if state == "processing" then
    if now >= tonumber(lease_until) then
      local updated = "v1|unknown|" .. fingerprint .. "|-|0|-|lease_expired"
      redis.call("SET", KEYS[1], updated, "EX", retention)
      return {"unknown"}
    end
    local allowed, ttl = take_slot()
    if not allowed then
      return {"limited", ttl}
    end
    return {"processing"}
  end
  return {"unavailable"}
end
local allowed, ttl = take_slot()
if not allowed then
  return {"limited", ttl}
end
local lease_until = now + tonumber(ARGV[4])
local created = "v1|processing|" .. ARGV[1] .. "|" .. ARGV[2] .. "|" .. lease_until .. "|-|-"
redis.call("SET", KEYS[1], created, "EX", retention)
return {"claimed"}`;

export const FINALIZE_SCRIPT = `local raw = redis.call("GET", KEYS[1])
if not raw then
  return {"missing"}
end
local state, fingerprint, owner = string.match(raw, "^v1|([^|]*)|([^|]*)|([^|]*)|")
if not state then
  return {"missing"}
end
if owner ~= ARGV[1] or state ~= "processing" then
  return {"not_owner"}
end
local updated = "v1|" .. ARGV[2] .. "|" .. fingerprint .. "|-|0|" .. ARGV[3] .. "|" .. ARGV[4]
redis.call("SET", KEYS[1], updated, "EX", tonumber(ARGV[5]))
return {"finalized"}`;
