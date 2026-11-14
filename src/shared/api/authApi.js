import { apiGet, apiPost, apiDelete, hasApiBaseUrl } from "./client";

const useMock = import.meta.env.DEV && !hasApiBaseUrl;

function mockSession(role, email) {
  return {
    user: {
      id: role === "STAFF" ? "mock-staff" : "mock-student",
      universityId: "3",
      universityName: "단국대학교",
      email,
      role,
      status: "ACTIVE",
    },
    expiresAt: null,
    csrfToken: "mock-csrf-token",
  };
}

export async function fetchSession() {
  if (useMock) {
    throw Object.assign(new Error("세션이 없어요."), { code: "UNAUTHENTICATED" });
  }
  return apiGet("/auth/session");
}

// 기존 학생 재로그인: 이메일 OTP로 받은 verificationToken 재사용. 계정이 없으면
// 404 ACCOUNT_NOT_FOUND를 던지므로, 호출부에서 신규 가입 흐름으로 이어간다.
export async function loginStudent({ verificationToken }) {
  if (useMock) {
    throw Object.assign(new Error("가입된 계정이 없어요."), { code: "ACCOUNT_NOT_FOUND" });
  }
  return apiPost("/auth/student-sessions", { verificationToken });
}

export async function registerStudent({ verificationToken, profile, email }) {
  if (useMock) return mockSession("STUDENT", email ?? "mock@dankook.ac.kr");
  return apiPost("/auth/student-registrations", { verificationToken, profile });
}

export async function loginStaff({ email, password }) {
  if (useMock) {
    if (password === "wrong") {
      throw Object.assign(new Error("메일이나 비밀번호가 맞지 않아요."), {
        code: "INVALID_CREDENTIALS",
      });
    }
    return mockSession("STAFF", email);
  }
  return apiPost("/auth/staff-sessions", { email, password });
}

export async function logout(csrfToken) {
  if (useMock) return;
  return apiDelete("/auth/session", { headers: { "X-CSRF-Token": csrfToken } });
}
