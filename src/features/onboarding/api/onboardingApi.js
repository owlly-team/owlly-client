import { apiGet, apiPost } from "../../../shared/api/client";
import { isMockMode } from "../../../shared/api/mockMode";
import {
  requestMockVerification,
  verifyMockCode,
} from "../mocks/onboardingMockSession";
import {
  mockUniversities,
  mockProfileOptions,
} from "../mocks/onboardingMockData";

export async function fetchUniversities() {
  if (isMockMode()) return structuredClone(mockUniversities);
  return apiGet("/universities");
}

export async function fetchProfileOptions() {
  if (isMockMode()) return structuredClone(mockProfileOptions);
  return apiGet("/profile-options");
}

export async function requestEmailVerification({ universityId, email }) {
  if (isMockMode()) return requestMockVerification({ universityId, email });
  return apiPost("/auth/email-verifications", {
    universityId: Number(universityId),
    email,
  });
}

export async function verifyEmailCode({ verificationId, code }) {
  if (isMockMode()) return verifyMockCode({ verificationId, code });
  return apiPost(`/auth/email-verifications/${verificationId}/verify`, {
    code,
  });
}
