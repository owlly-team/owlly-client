import { useEffect, useMemo, useState } from "react";
import { useDemoStore } from "../../demo/demoStore";
import { useMockApi } from "../../../shared/api/client";
import {
  fetchDemandCandidates,
  toRouteSummary,
} from "../../../shared/api/demandApi";
import { getMockDemandMap } from "../mocks/demandMapData";
import { demandQuery } from "../utils/demandMapUtils";

export default function useDemandMap(day, time) {
  const demoActive = useDemoStore((store) => Boolean(store.session));
  const mock = useMockApi || demoActive;
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);
  const key = `${day}:${time}:${revision}`;
  const current = snapshot?.key === key ? snapshot : null;
  const mockData = useMemo(() => getMockDemandMap(day, time), [day, time]);
  useEffect(() => {
    if (mock) return;
    const controller = new AbortController();
    fetchDemandCandidates(demandQuery(day, time), { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data))
          throw new Error("수요 목록을 확인할 수 없어요.");
        if (
          data.some(
            (route) => !route.pickupPointName || !route.destinationDongName,
          )
        )
          throw new Error("구간 이름을 확인할 수 없어요.");
        if (controller.signal.aborted) return;
        const maximum = Math.max(
          0,
          ...data.map((route) => route.estimatedWeeklyDemand ?? 0),
        );
        setSnapshot({
          key,
          routes: data.map((route) => ({
            ...toRouteSummary(route),
            weeklyDemand: route.estimatedWeeklyDemand,
            progress:
              maximum > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      ((route.estimatedWeeklyDemand ?? 0) / maximum) * 100,
                    ),
                  )
                : 0,
            originQuery: route.pickupPointName,
            destinationQuery: [route.districtName, route.destinationDongName]
              .filter(Boolean)
              .join(" "),
            destinationLabel: route.destinationDongName,
            isMine: false,
          })),
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSnapshot({ key, error });
      });
    return () => controller.abort();
  }, [mock, day, time, key]);
  const data = mock
    ? mockData
    : {
        routes: current?.routes ?? [],
        message: {
          title: "시간대별 심야 귀가 수요예요",
          description: "수요가 많은 구간을 노선 후보로 확인해 보세요.",
        },
      };
  return {
    ...data,
    loading: !mock && !current,
    error: !mock && current?.error,
    retry: () => setRevision((value) => value + 1),
  };
}
