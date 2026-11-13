import { apiGet, apiPost, hasApiBaseUrl } from "../../../shared/api/client";
import { mockUniversities, mockProfileOptions } from "../mocks/onboardingMockData";

const useMock = import.meta.env.DEV && !hasApiBaseUrl;

export async function fetchUniversities() {
  if (useMock) return mockUniversities;
  return apiGet("/universities");
}

export async function fetchProfileOptions() {
  if (useMock) return mockProfileOptions;
  return apiGet("/profile-options");
}

export async function requestEmailVerification({ universityId, email }) {
  if (useMock) {
    return { verificationId: "mock-verification", expiresAt: null, resendAvailableAt: null };
  }
  return apiPost("/auth/email-verifications", { universityId: Number(universityId), email });
}

export async function verifyEmailCode({ verificationId, code }) {
  if (useMock) {
    if (code !== "123456") {
      const error = new Error("코드가 올바르지 않아요.");
      error.code = "INVALID_CODE";
      throw error;
    }
    return { verificationToken: "mock-token", expiresAt: null };
  }
  return apiPost(`/auth/email-verifications/${verificationId}/verify`, { code });
}
