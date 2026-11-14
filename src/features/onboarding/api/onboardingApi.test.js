import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("mock onboarding only performs the verification and registration actions explicitly requested", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    define: {
      "import.meta.env.DEV": "true",
      "import.meta.env.VITE_API_BASE_URL": '""',
    },
  });
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    throw new Error("unexpected network call");
  };
  try {
    const onboarding = await server.ssrLoadModule(
      "/src/features/onboarding/api/onboardingApi.js",
    );
    const auth = await server.ssrLoadModule("/src/shared/api/authApi.js");
    const { isMockMode } = await server.ssrLoadModule(
      "/src/shared/api/mockMode.js",
    );
    const mock = await server.ssrLoadModule(
      "/src/features/onboarding/mocks/onboardingMockSession.js",
    );
    const mypage = await server.ssrLoadModule(
      "/src/features/mypage/api/mypageApi.js",
    );
    assert.equal(isMockMode(), true);
    const schools = await onboarding.fetchUniversities();
    assert.equal(
      schools.find((school) => school.id === "3").name,
      "단국대학교",
    );
    assert.ok((await onboarding.fetchProfileOptions()).genderOptions.length);
    const { verificationId } = await onboarding.requestEmailVerification({
      universityId: "3",
      email: "student@dankook.ac.kr",
    });
    const { verificationToken } = await onboarding.verifyEmailCode({
      verificationId,
      code: mock.MOCK_VERIFICATION_CODE,
    });
    await assert.rejects(
      auth.loginStudent({ verificationToken }),
      (error) => error.code === "ACCOUNT_NOT_FOUND",
    );
    const session = await auth.registerStudent({
      verificationToken,
      profile: {
        realName: "한서윤",
        genderCode: "FEMALE",
        sameGenderDefault: false,
        defaultDropoff: { latitude: 37.2, longitude: 127.1 },
      },
    });
    assert.equal(session.user.universityName, "단국대학교");
    assert.equal((await mypage.fetchMyProfile()).data.realName, "한서윤");
    await mypage.updateMyProfile({ sameGenderDefault: true }, {});
    assert.equal((await mypage.fetchMyProfile()).data.sameGenderDefault, true);
    assert.equal((await auth.fetchSession()).user.id, session.user.id);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
