/**
 * Lua is the Upstash execution path. The memory store mirrors these decisions in
 * TypeScript and is what the automated tests run. These scripts were not executed
 * against a live Redis server in this phase.
 */
export const RATE_LIMIT_SCRIPT = `local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then
  ttl = tonumber(ARGV[2])
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
local function take_slot()
  local current = redis.call("INCR", KEYS[2])
  if current == 1 then
    redis.call("EXPIRE", KEYS[2], tonumber(ARGV[7]))
  end
  local ttl = redis.call("TTL", KEYS[2])
  if ttl < 0 then
    ttl = tonumber(ARGV[7])
  end
  if current > tonumber(ARGV[6]) then
    return false, ttl
  end
  return true, ttl
end
local now = tonumber(ARGV[3])
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
