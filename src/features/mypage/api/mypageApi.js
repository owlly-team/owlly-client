import { apiGetWithEtag, apiPatch } from "../../../shared/api/client";
import { isMockMode } from "../../../shared/api/mockMode";
import {
  getMockProfile,
  updateMockProfile,
} from "../../onboarding/mocks/onboardingMockSession";

const mockProfile = {
  user: {
    id: "mock-student",
    universityId: "3",
    universityName: "단국대학교",
    email: "mock@dankook.ac.kr",
    role: "STUDENT",
    status: "ACTIVE",
  },
  realName: "한서윤",
  genderCode: "FEMALE",
  sameGenderDefault: true,
  defaultDongId: "1",
  defaultDongName: "영통2동",
  defaultDropoff: { latitude: 37.33, longitude: 127.27 },
};

export async function fetchMyProfile() {
  if (isMockMode()) {
    return {
      data: getMockProfile() ?? structuredClone(mockProfile),
      etag: "mock-etag",
    };
  }
  return apiGetWithEtag("/me/profile");
}

export async function updateMyProfile(patch, { etag, csrfToken }) {
  if (isMockMode()) {
    const current = (await fetchMyProfile()).data;
    const updated = updateMockProfile(patch) ?? { ...current, ...patch };
    return updated;
  }
  return apiPatch("/me/profile", patch, {
    headers: { "If-Match": etag, "X-CSRF-Token": csrfToken },
  });
}
