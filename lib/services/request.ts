export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = "ApiError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload
  }

  if (!isRecord(payload)) {
    return null
  }

  const message = payload.message
  if (typeof message === "string" && message.trim().length > 0) {
    return message
  }

  const error = payload.error
  if (typeof error === "string" && error.trim().length > 0) {
    return error
  }

  return null
}

async function parseResponsePayload(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return undefined
  }

  const contentType = response.headers.get("content-type") || ""
  const isJsonResponse = contentType.includes("application/json")

  if (isJsonResponse) {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  const text = await response.text()
  return text.length > 0 ? text : undefined
}

export async function request<T>(input: RequestInfo | URL, init?: RequestInit, fallbackError = "请求失败") {
  const response = await fetch(input, init)
  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    const message = extractErrorMessage(payload) || fallbackError
    throw new ApiError(message, response.status)
  }

  return payload as T
}
