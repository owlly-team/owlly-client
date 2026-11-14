const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
// 개발 중에는 Vite가 같은 출처의 /api를 실제 서버로 중계한다.
// 외부 IP로 직접 요청하면 SameSite=Lax 세션 쿠키가 전달되지 않는다.
const baseUrl =
  import.meta.env.DEV && /^https?:\/\//.test(configuredBaseUrl)
    ? ""
    : configuredBaseUrl;

export const hasApiBaseUrl = Boolean(configuredBaseUrl);

export async function apiResponse(
  path,
  { method = "GET", body, headers, signal, cache } = {},
) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    credentials: "include",
    signal,
    cache,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    const error = new Error(payload?.error?.message ?? "요청에 실패했어요.");
    error.code = payload?.error?.code;
    error.status = response.status;
    error.retryAfter = response.headers.get("Retry-After");
    error.traceId = payload?.error?.traceId;
    throw error;
  }
  return {
    data: payload?.data,
    meta: payload?.meta,
    etag: response.headers.get("ETag"),
  };
}

async function request(path, options) {
  return (await apiResponse(path, options)).data;
}

export function apiGet(path) {
  return request(path);
}

// If-Match 재수정에 필요한 ETag까지 함께 봐야 하는 호출용. apiGet은 간단한
// 조회용으로 그대로 두고, 이 함수만 헤더를 들여다본다.
export async function apiGetWithEtag(path) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, { credentials: "include" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? "요청에 실패했어요.");
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }
  return { data: payload?.data, etag: response.headers.get("ETag") };
}

export function apiPost(path, body, { headers } = {}) {
  return request(path, {
    method: "POST",
    body: body ?? {},
    headers: { "Idempotency-Key": crypto.randomUUID(), ...headers },
  });
}

export function apiPatch(path, body, { headers } = {}) {
  return request(path, {
    method: "PATCH",
    body: body ?? {},
    headers: { "Idempotency-Key": crypto.randomUUID(), ...headers },
  });
}

export function apiDelete(path, { headers } = {}) {
  return request(path, {
    method: "DELETE",
    headers: { "Idempotency-Key": crypto.randomUUID(), ...headers },
  });
}
