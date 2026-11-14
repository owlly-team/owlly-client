import test from "node:test";
import assert from "node:assert/strict";
import {
  demandQuery,
  demandStrokeWeight,
  resolveDemandPaths,
} from "./demandMapUtils.js";
import { getMockDemandMap } from "../mocks/demandMapData.js";

test("filters use backend weekday and slot values, and mock filters do not show stale Friday routes", () => {
  assert.deepEqual(demandQuery("금요일", "23~01시"), {
    weekday: 5,
    slotStart: "23:00",
    candidateOnly: true,
    limit: 5,
  });
  assert.equal(demandQuery("일요일", "00~02시").weekday, 0);
  assert.equal(demandQuery("일요일", "00~02시").slotStart, "00:00");
  const mock = getMockDemandMap("금요일", "23~01시");
  assert.equal(mock.routes.length, 2);
  assert.equal(mock.routes.find((route) => route.isMine).rank, 3);
  assert.equal(getMockDemandMap("토요일", "23~01시").routes.length, 0);
});

test("flow line weights encode demand without allowing invalid or zero totals to overflow", () => {
  assert.equal(demandStrokeWeight(142, 142), 7);
  assert.ok(demandStrokeWeight(88, 142) < 7);
  for (const demand of [null, NaN, -1, 0])
    assert.equal(demandStrokeWeight(demand, 0), 2);
  assert.equal(demandStrokeWeight(1000, 142), 7);
});

test("map endpoints come from Kakao search and geocoding; repeated origins are looked up once", async () => {
  let searches = 0;
  const queries = [];
  const maps = {
    services: {
      Status: { OK: "OK" },
      Places: function () {
        this.keywordSearch = (query, callback) => {
          searches++;
          assert.equal(query, "단국대학교 죽전캠퍼스 정문");
          callback([{ place_name: query, y: "37.3", x: "127.1" }], "OK");
        };
      },
      Geocoder: function () {
        this.addressSearch = (query, callback) => {
          queries.push(query);
          callback(
            [{ y: "37.2", x: query.includes("처인구") ? "127.2" : "127.05" }],
            "OK",
          );
        };
      },
    },
  };
  const result = await resolveDemandPaths(
    maps,
    getMockDemandMap("금요일", "23~01시").routes,
  );
  assert.equal(result.paths.length, 2);
  assert.equal(result.missingCount, 0);
  assert.equal(searches, 1);
  assert.deepEqual(result.paths[0].origin, {
    latitude: 37.3,
    longitude: 127.1,
  });
  assert.deepEqual(result.paths[0].destination, {
    latitude: 37.2,
    longitude: 127.2,
  });
  assert.deepEqual(queries.sort(), [
    "경기도 수원시 영통구",
    "경기도 용인시 처인구",
  ]);
});

test("ambiguous or failed location lookups never place a route at a guessed coordinate", async () => {
  const maps = {
    services: {
      Status: { OK: "OK" },
      Places: function () {
        this.keywordSearch = (_query, callback) =>
          callback(
            [
              { place_name: "다른 학교 정문", y: "37.1", x: "127.1" },
              { place_name: "다른 학교 후문", y: "37.2", x: "127.2" },
            ],
            "OK",
          );
      },
      Geocoder: function () {
        this.addressSearch = (_query, callback) => callback([], "ZERO_RESULT");
      },
    },
  };
  const result = await resolveDemandPaths(
    maps,
    getMockDemandMap("금요일", "23~01시").routes,
  );
  assert.deepEqual(result.paths, []);
  assert.equal(result.missingCount, 2);
});

test("blank SDK coordinates are not converted to a zero-coordinate marker", async () => {
  const maps = {
    services: {
      Status: { OK: "OK" },
      Places: function () {
        this.keywordSearch = (query, callback) =>
          callback([{ place_name: query, y: "", x: "" }], "OK");
      },
      Geocoder: function () {
        this.addressSearch = (_query, callback) =>
          callback([{ y: "37.2", x: "127.2" }], "OK");
      },
    },
  };
  const result = await resolveDemandPaths(
    maps,
    getMockDemandMap("금요일", "23~01시").routes,
  );
  assert.deepEqual(result.paths, []);
  assert.equal(result.missingCount, 2);
});
