const aborted = () => new DOMException("조회가 취소됐어요.", "AbortError");

// 브라우저 저장소를 사용하지 않는 세션별 짧은 조회 캐시.
export function createReferenceCache({ now = Date.now } = {}) {
  let scope = null;
  const entries = new Map();
  const pending = new Map();
  function reset(nextScope = null) {
    scope = nextScope;
    entries.clear();
    for (const request of pending.values()) request.controller.abort();
    pending.clear();
  }
  function activate(userId, sessionKey) {
    const next =
      userId == null ? null : JSON.stringify([String(userId), sessionKey]);
    if (next !== scope) reset(next);
  }
  function invalidate(key) {
    entries.delete(key);
    pending.get(key)?.controller.abort();
    pending.delete(key);
  }
  async function load(
    key,
    loader,
    { signal, ttl = 30000, force = false } = {},
  ) {
    if (signal?.aborted) throw aborted();
    if (scope == null) return loader(signal);
    const entry = entries.get(key);
    if (!force && entry && now() - entry.updatedAt < ttl)
      return structuredClone(entry.response);
    let request = pending.get(key);
    if (!request) {
      const requestScope = scope;
      request = {
        controller: new AbortController(),
        consumers: new Set(),
        settled: false,
        scope: requestScope,
      };
      pending.set(key, request);
      const current = request;
      current.promise = Promise.resolve()
        .then(() => {
          if (current.controller.signal.aborted) throw aborted();
          return loader(current.controller.signal);
        })
        .then((response) => {
          if (
            scope !== requestScope ||
            pending.get(key) !== current ||
            current.controller.signal.aborted
          )
            throw aborted();
          entries.set(key, {
            response: structuredClone(response),
            updatedAt: now(),
          });
          return response;
        })
        .finally(() => {
          current.settled = true;
          if (pending.get(key) === current) pending.delete(key);
        });
    }
    return new Promise((resolve, reject) => {
      const consumer = {};
      request.consumers.add(consumer);
      const release = () => {
        signal?.removeEventListener("abort", onAbort);
        request.consumers.delete(consumer);
        if (!request.settled && request.consumers.size === 0) {
          request.controller.abort();
          if (pending.get(key) === request) pending.delete(key);
        }
      };
      const onAbort = () => {
        release();
        reject(aborted());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      request.promise.then(
        (response) => {
          release();
          if (
            signal?.aborted ||
            scope !== request.scope ||
            request.controller.signal.aborted
          )
            reject(aborted());
          else resolve(structuredClone(response));
        },
        (error) => {
          release();
          reject(error);
        },
      );
    });
  }
  return { activate, reset, invalidate, load };
}

export const referenceCache = createReferenceCache();

export function referenceTtl(path) {
  if (path === "/me/profile") return 30000;
  if (path === "/banks") return 300000;
  if (path === "/pickup-points" || path.startsWith("/pickup-points?"))
    return 60000;
  return null;
}
