const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const hasApiBaseUrl = Boolean(baseUrl);

async function request(path, { method = "GET", body, headers } = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? "요청에 실패했어요.");
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }
  return payload?.data;
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
