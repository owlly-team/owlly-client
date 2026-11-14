import { create } from "zustand";
import { useMockApi } from "../../shared/api/client";
import {
  cancelDemo,
  createDemoSession,
  matchDemo,
  prepayDemo,
  registerDemo,
  updateDemoParty,
  resolveDemoPickup,
} from "./demoFlow.js";

const STORAGE_KEY = "owlly-demo-v1";
function loadSession() {
  if (typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location.search).get("demo");
  if (["member", "representative"].includes(mode))
    return createDemoSession(mode);
  if (mode === "off") return null;
  const fallback = () =>
    useMockApi ? { ...createDemoSession(), autoMock: true } : null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.home?.isPreview === true &&
      ["member", "representative"].includes(saved.role)
      ? saved.autoMock && !useMockApi
        ? null
        : saved
      : fallback();
  } catch {
    return fallback();
  }
}

export const useDemoStore = create((set) => ({
  session: loadSession(),
  reset: (role, scenario) =>
    set({ session: createDemoSession(role, scenario) }),
  stop: () => set({ session: null }),
  resolvePickup: (point) =>
    set(({ session }) =>
      session ? { session: resolveDemoPickup(session, point) } : {},
    ),
  register: (registration, selection) =>
    set(({ session }) =>
      session
        ? { session: registerDemo(session, registration, selection) }
        : {},
    ),
  match: () =>
    set(({ session }) => (session ? { session: matchDemo(session) } : {})),
  cancel: () =>
    set(({ session }) => (session ? { session: cancelDemo(session) } : {})),
  updateParty: (party) =>
    set(({ session }) =>
      session ? { session: updateDemoParty(session, party) } : {},
    ),
  setAccount: (account) =>
    set(({ session }) => (session ? { session: { ...session, account } } : {})),
  prepay: () =>
    set(({ session }) => (session ? { session: prepayDemo(session) } : {})),
}));

function persistSession({ session }) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장소를 사용할 수 없어도 현재 탭의 시연은 계속한다. */
  }
}
useDemoStore.subscribe(persistSession);
persistSession(useDemoStore.getState());

export const isDemoActive = () => Boolean(useDemoStore.getState().session);
export const canPreview = () => import.meta.env?.DEV || isDemoActive();
