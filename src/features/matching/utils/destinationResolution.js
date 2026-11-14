import { isPoint } from "./mapUtils.js";

const validId = (value) => /^[1-9][0-9]*$/.test(value ?? "");

export function canSubmitDestination(draft, pickup, busy = false) {
  return isPoint(draft?.point) && validId(pickup?.id) && !busy;
}

export function destinationErrorMessage(error) {
  if (error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error.code === "LOCATION_UNRESOLVABLE")
    return "이 위치의 도착 권역을 확인할 수 없어요. 다른 위치를 선택해 주세요.";
  if (error.status >= 500)
    return "서버에서 도착 권역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
  return error.message || "도착 권역을 확인하지 못했어요. 다시 시도해 주세요.";
}

// 지도에서 확인한 이름과 서버의 등록용 ID는 구분한다.
// 서버가 실패해도 핀과 이름은 유지하지만, 확인되지 않은 ID는 사용하지 않는다.
export async function resolveDestinationDraft({ point, region = {}, load }) {
  const draft = {
    point,
    name: region.region_3depth_name,
    districtName: region.region_2depth_name,
  };
  try {
    const { data } = await load();
    if (!validId(data?.destinationDongId) || !validId(data?.districtId))
      throw new Error(
        "하차 위치의 도착 권역을 확인하지 못했어요. 다시 시도해 주세요.",
      );
    return {
      ...draft,
      id: String(data.destinationDongId),
      districtId: String(data.districtId),
      name: data.destinationDongName || draft.name,
      districtName: data.districtName || draft.districtName,
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return { ...draft, error: destinationErrorMessage(error) };
  }
}
