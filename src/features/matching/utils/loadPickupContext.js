import { loadHomePickupPoints } from "../../home/utils/loadHomeData.js";

// 세션에 학교 ID가 있으면 독립적인 프로필·거점 조회를 동시에 시작한다.
export async function loadPickupContext(api, user, { onProfile } = {}) {
  const knownSchool = user?.universityId;
  const points = knownSchool
    ? loadHomePickupPoints(api, knownSchool).then(
        (value) => ({ value }),
        (error) => ({ error }),
      )
    : null;
  const { data: profile } = await api.profile();
  if (!profile?.user?.id || String(profile.user.id) !== String(user?.id))
    throw new Error("프로필 정보를 확인할 수 없어요.");
  onProfile?.(profile);
  let loaded;
  if (
    knownSchool &&
    String(knownSchool) === String(profile.user.universityId)
  ) {
    const result = await points;
    if (result.error) throw result.error;
    loaded = result.value;
  } else loaded = await loadHomePickupPoints(api, profile.user.universityId);
  return { profile, ...loaded };
}
