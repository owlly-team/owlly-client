import { apiGetWithEtag, apiPatch, hasApiBaseUrl } from "../../../shared/api/client";

const useMock = import.meta.env.DEV && !hasApiBaseUrl;

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
  if (useMock) return { data: mockProfile, etag: "mock-etag" };
  return apiGetWithEtag("/me/profile");
}

export async function updateMyProfile(patch, { etag, csrfToken }) {
  if (useMock) return { ...mockProfile, ...patch };
  return apiPatch("/me/profile", patch, {
    headers: { "If-Match": etag, "X-CSRF-Token": csrfToken },
  });
}
