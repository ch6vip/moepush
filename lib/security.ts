export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body")
    this.name = "InvalidJsonBodyError"
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new InvalidJsonBodyError()
  }
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const octets = host.split(".").map(Number)
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }
  const [a, b, c] = octets
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99) || (b === 51 && c === 100))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  )
}

function isPublicIpv6(host: string): boolean {
  const address = host.replace(/^\[|\]$/g, "").toLowerCase()
  const first = Number.parseInt(address.split(":")[0] || "0", 16)
  // Allow only globally routed 2000::/3 unicast addresses. This also rejects
  // loopback, link-local, ULA, IPv4-mapped, and unspecified addresses.
  if (!Number.isFinite(first) || (first & 0xe000) !== 0x2000) return false
  if (address.startsWith("2001:db8:") || address.startsWith("2002:") || address.startsWith("2001:10:")) return false
  return true
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return false

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      hostname.endsWith(".home") || hostname.endsWith(".lan")) return false

    if (hostname.includes(":")) return isPublicIpv6(hostname)
    if (/^\d+(?:\.\d+){3}$/.test(hostname)) return !isPrivateOrReservedIpv4(hostname)

    // Reject single-label names, which are commonly used for private services,
    // and malformed hostnames. URL already canonicalizes unusual IPv4 forms.
    return hostname.includes(".") && /^[a-z0-9.-]+$/.test(hostname) &&
      !hostname.startsWith(".") && !hostname.includes("..")
  } catch {
    return false
  }
}

export async function hashRegistrationAddress(address: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(address))
  return toBase64Url(new Uint8Array(signature))
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}
