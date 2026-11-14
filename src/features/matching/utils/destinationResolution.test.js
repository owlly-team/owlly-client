import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitDestination,
  resolveDestinationDraft,
} from "./destinationResolution.js";

const point = { latitude: 37.32, longitude: 127.09 };
const region = {
  region_3depth_name: "풍덕천1동",
  region_2depth_name: "용인시 수지구",
};

test("서버 ID·카카오 이름이 없는 좌표도 확정 요청할 수 있고 오류 후 재시도할 수 있다", () => {
  const pickup = { id: "11" };
  assert.equal(canSubmitDestination({ point }, pickup), true);
  assert.equal(
    canSubmitDestination({ point, error: "등록된 권역 없음" }, pickup),
    true,
  );
  assert.equal(canSubmitDestination({ point }, pickup, true), false);
  assert.equal(canSubmitDestination({ point }, null), false);
  assert.equal(
    canSubmitDestination({ point: { latitude: 91, longitude: 127 } }, pickup),
    false,
  );
  assert.equal(canSubmitDestination(null, pickup), false);
});

test("카카오 행정동 조회 없이도 서버가 좌표에서 반환한 ID와 이름으로 확정한다", async () => {
  let calls = 0;
  const draft = await resolveDestinationDraft({
    point,
    load: async () => {
      calls++;
      return {
        data: {
          destinationDongId: "42",
          districtId: "8",
          destinationDongName: "새 하차 동",
          districtName: "새 권역",
        },
      };
    },
  });
  assert.equal(calls, 1);
  assert.equal(draft.id, "42");
  assert.equal(draft.name, "새 하차 동");
  assert.equal(draft.districtId, "8");
  assert.deepEqual(draft.point, point);
});

test("500 이후에도 선택한 핀과 지도 이름을 유지하고 등록 ID는 만들지 않는다", async () => {
  const draft = await resolveDestinationDraft({
    point,
    region,
    load: async () => {
      throw Object.assign(new Error("서버 오류가 발생했습니다."), {
        status: 500,
      });
    },
  });
  assert.deepEqual(draft.point, point);
  assert.equal(draft.name, "풍덕천1동");
  assert.equal(draft.districtName, "용인시 수지구");
  assert.equal(draft.id, undefined);
  assert.match(draft.error, /서버에서 도착 권역/);
});

test("같은 핀 재확인에 성공하면 서버 ID로 확정 가능한 값을 반환한다", async () => {
  const draft = await resolveDestinationDraft({
    point,
    region,
    load: async () => ({
      data: {
        destinationDongId: "42",
        districtId: "8",
        districtName: "수지구",
      },
    }),
  });
  assert.equal(draft.id, "42");
  assert.equal(draft.districtId, "8");
  assert.equal(draft.name, "풍덕천1동");
  assert.equal(draft.districtName, "수지구");
  assert.equal(draft.error, undefined);
});

test("권역 ID가 없거나 유효하지 않으면 이름이 있어도 확정하지 않는다", async () => {
  for (const data of [
    { destinationDongId: "42" },
    { destinationDongId: "42", districtId: "0" },
  ]) {
    const draft = await resolveDestinationDraft({
      point,
      region,
      load: async () => ({ data }),
    });
    assert.equal(draft.id, undefined);
    assert.ok(draft.error);
    assert.equal(draft.name, "풍덕천1동");
  }
});

test("판별 불가 오류는 다른 위치 선택을 안내한다", async () => {
  const draft = await resolveDestinationDraft({
    point,
    region,
    load: async () => {
      throw Object.assign(new Error("핀 판별 실패"), {
        status: 422,
        code: "LOCATION_UNRESOLVABLE",
      });
    },
  });
  assert.match(draft.error, /다른 위치를 선택/);
});

test("취소한 조회를 위치 오류로 바꾸지 않는다", async () => {
  await assert.rejects(
    resolveDestinationDraft({
      point,
      region,
      load: async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
    }),
    { name: "AbortError" },
  );
});
