import { mockUniversities } from "./onboardingMockData.js";

export const MOCK_VERIFICATION_CODE = "123456";
const verifications = new Map();
const tokens = new Map();
let account = null;
let session = null;

const fail = (code, message) => Object.assign(new Error(message), { code });
const clone = (value) => structuredClone(value);

export function resetMockOnboarding() {
  verifications.clear();
  tokens.clear();
  account = null;
  session = null;
}

export function requestMockVerification({ universityId, email }) {
  const university = mockUniversities.find(
    (item) => item.id === String(universityId),
  );
  const normalizedEmail = email.trim().toLowerCase();
  if (!university?.emailDomains.includes(normalizedEmail.split("@")[1]))
    throw fail("INVALID_EMAIL_DOMAIN", "선택한 학교의 메일을 입력해 주세요.");
  const verificationId = `mock-verification-${crypto.randomUUID()}`;
  verifications.set(verificationId, { university, email: normalizedEmail });
  return {
    verificationId,
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    resendAvailableAt: null,
  };
}

export function verifyMockCode({ verificationId, code }) {
  const verification = verifications.get(verificationId);
  if (!verification)
    throw fail("VERIFICATION_NOT_FOUND", "코드를 먼저 보내 주세요.");
  if (code !== MOCK_VERIFICATION_CODE)
    throw fail("INVALID_CODE", "코드가 올바르지 않아요.");
  const verificationToken = `mock-token-${crypto.randomUUID()}`;
  tokens.set(verificationToken, verification);
  return {
    verificationToken,
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
  };
}

function verified(token) {
  const result = tokens.get(token);
  if (!result)
    throw fail("INVALID_VERIFICATION_TOKEN", "학교 인증을 다시 진행해 주세요.");
  return result;
}

export function registerMockStudent({ verificationToken, profile }) {
  const verification = verified(verificationToken);
  if (
    !profile?.realName?.trim() ||
    !["FEMALE", "MALE"].includes(profile.genderCode)
  )
    throw fail("INVALID_PROFILE", "이름과 성별을 확인해 주세요.");
  session = {
    user: {
      id: "mock-student",
      universityId: verification.university.id,
      universityName: verification.university.name,
      email: verification.email,
      role: "STUDENT",
      status: "ACTIVE",
    },
    expiresAt: null,
    csrfToken: "mock-csrf-token",
  };
  account = {
    ...clone(profile),
    user: clone(session.user),
    defaultDongId: profile.defaultDongId ?? "31",
    defaultDongName: profile.defaultDongName ?? "영통2동",
  };
  return clone(session);
}

export function loginMockStudent({ verificationToken }) {
  const verification = verified(verificationToken);
  if (!account || account.user.email !== verification.email)
    throw fail("ACCOUNT_NOT_FOUND", "가입된 계정이 없어요.");
  session = {
    user: clone(account.user),
    expiresAt: null,
    csrfToken: "mock-csrf-token",
  };
  return clone(session);
}

export function getMockSession() {
  if (!session) throw fail("UNAUTHENTICATED", "세션이 없어요.");
  return clone(session);
}

export function logoutMockStudent() {
  session = null;
}
export function getMockProfile() {
  return account ? clone(account) : null;
}
export function updateMockProfile(patch) {
  if (!account) return null;
  account = { ...account, ...clone(patch), user: account.user };
  return clone(account);
}
