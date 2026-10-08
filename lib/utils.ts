import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from "nanoid"
import { bytesEqual, fromBase64Url, isSafeHttpUrl, toBase64Url } from "./security"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PASSWORD_HASH_ITERATIONS = 600_000
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256"

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

async function legacyPasswordHash(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + (process.env.AUTH_SECRET || ""))
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const digest = await pbkdf2(password, salt, PASSWORD_HASH_ITERATIONS)
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(digest)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    const actual = await legacyPasswordHash(password)
    const valid = bytesEqual(new TextEncoder().encode(actual), new TextEncoder().encode(storedHash))
    return { valid, needsRehash: valid }
  }

  const [prefix, iterationText, saltText, digestText, extra] = storedHash.split("$")
  const iterations = Number(iterationText)
  if (prefix !== PASSWORD_HASH_PREFIX || extra !== undefined || !Number.isInteger(iterations) || iterations < 10_000 || iterations > 1_000_000 || !saltText || !digestText) {
    return { valid: false, needsRehash: false }
  }

  try {
    const salt = fromBase64Url(saltText)
    const expected = fromBase64Url(digestText)
    const actual = await pbkdf2(password, salt, iterations)
    return {
      valid: bytesEqual(actual, expected),
      needsRehash: iterations < PASSWORD_HASH_ITERATIONS || salt.length !== 16 || expected.length !== 32,
    }
  } catch {
    return { valid: false, needsRehash: false }
  }
}

export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  return (await verifyPassword(password, storedHash)).valid
}

export function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) current[key] = {}
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

export function getNestedValue(obj: any, path: string) {
  const keys = path.split('.')
  let value = obj
  for (const key of keys) {
    if (value === undefined || value === null) return undefined
    value = value[key]
  }
  return value
}

const urlFriendlyAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const generateId = customAlphabet(urlFriendlyAlphabet, 16)

export function formatDate(date: Date | string) {
  if (!date) return "未知时间"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export async function fetchWithTimeout(url: string, options: any = {}): Promise<Response> {
  const { timeout = 8000, ...fetchOptions } = options
  if (!isSafeHttpUrl(url)) throw new Error("目标地址必须是公网 HTTP(S) 地址")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const clearTimer = () => clearTimeout(timer)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      redirect: "manual",
      signal: controller.signal,
    })

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      await response.body?.cancel().catch(() => undefined)
      throw new Error("目标服务器重定向已阻止")
    }

    if (!response.body) {
      clearTimer()
      return response
    }

    const reader = response.body.getReader()
    const body = new ReadableStream<Uint8Array>({
      async pull(streamController) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            clearTimer()
            streamController.close()
          } else {
            streamController.enqueue(value)
          }
        } catch (error) {
          clearTimer()
          streamController.error(error)
        }
      },
      async cancel(reason) {
        clearTimer()
        await reader.cancel(reason)
      },
    })

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (error) {
    clearTimer()
    throw error
  }
}

export function generateExampleBody(rule: string) {
  if (!rule || typeof rule !== "string") return {}
  try {
    const matches = rule.match(/\$\{body\.([^}]+)\}/g) || []
    const result: Record<string, any> = {}
    matches.forEach((match) => {
      const key = match.replace(/\$\{body\.([^}]+)\}/, "$1")
      const keys = key.split(".")
      let current = result
      keys.forEach((part, index) => {
        if (index === keys.length - 1) current[part] = `示例${part}值`
        else {
          current[part] = current[part] || {}
          current = current[part]
        }
      })
    })
    return Object.keys(result).length > 0 ? result : { message: "示例消息内容" }
  } catch (error) {
    console.error("生成示例请求体出错:", error)
    return { message: "示例消息内容" }
  }
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
