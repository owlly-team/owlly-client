import { createStore } from "zustand/vanilla";

export const partyCacheKey = (userId, partyId) =>
  JSON.stringify([String(userId), String(partyId)]);
const aborted = () => new DOMException("팟 조회가 취소됐어요.", "AbortError");

// 사용자 전환 시 폐기하는 메모리 캐시. 응답 본문과 ETag는 항상 함께 교체한다.
export function createPartyCache({ now = Date.now, staleTime = 15000 } = {}) {
  const store = createStore(() => ({ userId: null, entries: {} }));
  const pending = new Map();
  const revisions = new Map();
  let generation = 0;
  const current = (token) =>
    token.generation === generation &&
    token.revision === (revisions.get(token.key) ?? 0);
  const publish = (key, entry) =>
    store.setState((state) => ({
      entries: { ...state.entries, [key]: entry },
    }));
  function activate(userId) {
    const id = userId == null ? null : String(userId);
    if (id === store.getState().userId) return;
    reset(id);
  }
  function reset(userId = null) {
    generation += 1;
    pending.forEach((request) => request.controller.abort());
    pending.clear();
    revisions.clear();
    store.setState({ userId, entries: {} });
  }
  function tokenFor(userId, partyId) {
    if (userId == null || String(userId) !== store.getState().userId)
      throw aborted();
    const key = partyCacheKey(userId, partyId);
    return { key, generation, revision: revisions.get(key) ?? 0 };
  }
  function invalidate(userId, partyId) {
    const token = tokenFor(userId, partyId);
    revisions.set(token.key, token.revision + 1);
    const entry = store.getState().entries[token.key];
    if (entry) publish(token.key, { ...entry, updatedAt: -Infinity });
    return tokenFor(userId, partyId);
  }
  function commit(token, response) {
    if (!current(token)) throw aborted();
    // 성공한 변경 응답이 이전 GET 결과보다 우선한다.
    revisions.set(token.key, (revisions.get(token.key) ?? 0) + 1);
    publish(token.key, { response, updatedAt: now() });
    return response;
  }
  function rejectAccess(token, error) {
    if (!current(token)) return;
    revisions.set(token.key, token.revision + 1);
    publish(token.key, { error, updatedAt: -Infinity });
  }
  async function load(userId, partyId, loader, { signal, force = false } = {}) {
    if (signal?.aborted) throw aborted();
    const token = tokenFor(userId, partyId);
    const entry = store.getState().entries[token.key];
    if (!force && entry?.response && now() - entry.updatedAt < staleTime)
      return entry.response;
    let request = pending.get(token.key);
    if (!request || !current(request.token)) {
      const controller = new AbortController();
      request = { controller, token };
      request.promise = Promise.resolve()
        .then(() => loader(controller.signal))
        .then((response) => {
          if (current(token)) {
            publish(token.key, { response, updatedAt: now() });
            return response;
          }
          if (token.generation === generation) {
            const latest = store.getState().entries[token.key];
            if (latest?.error) throw latest.error;
            if (latest?.response) return latest.response;
          }
          throw aborted();
        })
        .catch((error) => {
          if (token.generation !== generation) throw aborted();
          if (!current(token)) {
            const latest = store.getState().entries[token.key];
            if (latest?.error) throw latest.error;
            if (latest?.response) return latest.response;
            throw aborted();
          }
          if ([401, 403, 404, 410].includes(error.status))
            rejectAccess(token, error);
          throw error;
        })
        .finally(() => {
          if (pending.get(token.key) === request) pending.delete(token.key);
        });
      pending.set(token.key, request);
    }
    // 한 화면을 떠나도 다른 화면이 기다리는 공유 요청은 취소하지 않는다.
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(aborted());
      signal?.addEventListener("abort", onAbort, { once: true });
      request.promise
        .then(
          (response) =>
            signal?.aborted ? reject(aborted()) : resolve(response),
          reject,
        )
        .finally(() => signal?.removeEventListener("abort", onAbort));
    });
  }
  return { store, activate, reset, load, invalidate, commit, rejectAccess };
}

export const partyCache = createPartyCache();
