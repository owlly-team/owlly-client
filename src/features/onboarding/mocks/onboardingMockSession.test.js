import test from "node:test";
import assert from "node:assert/strict";
import {
  resetMockOnboarding,
  requestMockVerification,
  verifyMockCode,
  registerMockStudent,
  loginMockStudent,
  getMockSession,
  getMockProfile,
  updateMockProfile,
  logoutMockStudent,
} from "./onboardingMockSession.js";

test("verification, first registration, profile edits and later login preserve the entered student's data", () => {
  resetMockOnboarding();
  assert.throws(getMockSession, (error) => error.code === "UNAUTHENTICATED");
  const { verificationId } = requestMockVerification({
    universityId: "2",
    email: "student@khu.ac.kr",
  });
  assert.throws(
    () => verifyMockCode({ verificationId, code: "123" }),
    (error) => error.code === "INVALID_CODE",
  );
  const { verificationToken } = verifyMockCode({
    verificationId,
    code: "999999",
  });
  assert.throws(
    () => loginMockStudent({ verificationToken }),
    (error) => error.code === "ACCOUNT_NOT_FOUND",
  );
  const profile = {
    realName: "김민지",
    genderCode: "FEMALE",
    sameGenderDefault: false,
    defaultDropoff: { latitude: 37.2, longitude: 127.1 },
    defaultDongName: "선택한 하차 동",
  };
  const session = registerMockStudent({ verificationToken, profile });
  assert.equal(session.user.universityName, "경희대학교");
  assert.equal(session.user.universityId, "2");
  assert.equal(session.user.email, "student@khu.ac.kr");
  assert.equal(getMockProfile().realName, profile.realName);
  assert.equal(getMockProfile().sameGenderDefault, false);
  assert.deepEqual(getMockProfile().defaultDropoff, profile.defaultDropoff);
  updateMockProfile({ sameGenderDefault: true });
  assert.equal(getMockProfile().sameGenderDefault, true);
  logoutMockStudent();
  assert.throws(getMockSession);
  assert.equal(
    loginMockStudent({ verificationToken }).user.id,
    session.user.id,
  );
  resetMockOnboarding();
  assert.equal(getMockProfile(), null);
});

test("unverified/unknown tokens and an unrelated school's mail do not become successful registrations", () => {
  resetMockOnboarding();
  assert.throws(
    () =>
      requestMockVerification({
        universityId: "3",
        email: "user@not-a-school.test",
      }),
    (error) => error.code === "INVALID_EMAIL_DOMAIN",
  );
  assert.throws(() =>
    verifyMockCode({ verificationId: "missing", code: "000000" }),
  );
  assert.throws(() =>
    registerMockStudent({ verificationToken: "fake", profile: {} }),
  );
  const { verificationId } = requestMockVerification({
    universityId: "3",
    email: "student@dankook.ac.kr",
  });
  const { verificationToken } = verifyMockCode({
    verificationId,
    code: "000000",
  });
  assert.throws(
    () => registerMockStudent({ verificationToken, profile: {} }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.equal(getMockProfile(), null);
});
