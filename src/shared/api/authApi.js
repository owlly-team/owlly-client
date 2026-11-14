import { apiGet, apiPost, apiDelete } from "./client";
import { isMockMode } from "./mockMode";
import {
  getMockSession,
  loginMockStudent,
  registerMockStudent,
  logoutMockStudent,
} from "../../features/onboarding/mocks/onboardingMockSession";

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
  if (isMockMode()) return getMockSession();
  return apiGet("/auth/session");
}

// 기존 학생 재로그인: 이메일 OTP로 받은 verificationToken 재사용. 계정이 없으면
// 404 ACCOUNT_NOT_FOUND를 던지므로, 호출부에서 신규 가입 흐름으로 이어간다.
export async function loginStudent({ verificationToken, csrfToken }) {
  if (isMockMode()) return loginMockStudent({ verificationToken });
  return apiPost(
    "/auth/student-sessions",
    { verificationToken },
    {
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    },
  );
}

export async function registerStudent({
  verificationToken,
  profile,
  csrfToken,
}) {
  if (isMockMode()) return registerMockStudent({ verificationToken, profile });
  return apiPost(
    "/auth/student-registrations",
    { verificationToken, profile },
    {
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    },
  );
}

export async function loginStaff({ email, password, csrfToken }) {
  if (isMockMode()) {
    if (password === "wrong") {
      throw Object.assign(new Error("메일이나 비밀번호가 맞지 않아요."), {
        code: "INVALID_CREDENTIALS",
      });
    }
    return mockSession("STAFF", email);
  }
  return apiPost(
    "/auth/staff-sessions",
    { email, password },
    {
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    },
  );
}

export async function logout(csrfToken) {
  if (isMockMode()) return logoutMockStudent();
  return apiDelete("/auth/session", { headers: { "X-CSRF-Token": csrfToken } });
}
