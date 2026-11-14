import { useEffect, useRef, useState } from "react";
import { mockRepresentativeMatchingResult } from "../mocks/matchingMockData";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../api/matchingApi";
import useCachedParty from "./useCachedParty";
import {
  confirmMembership,
  loadMatchingResult,
  loadPartyRoom,
  validateParty,
} from "../utils/partyFlow";

export default function useMatchingResult(partyId, preview, isPreview = false) {
  const source = preview ?? mockRepresentativeMatchingResult;
  const [updated, setUpdated] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const { user, csrfToken, status } = useSessionStore();
  const scope = `${partyId}:${user?.id ?? "guest"}`;
  const operation = useRef(null);
  const version = useRef(0);
  const keys = useRef({});
  const previewData =
    updated?.source === source ? { ...source, party: updated.party } : source;
  const current = snapshot?.scope === scope ? snapshot : null;
  const cached = useCachedParty(partyId, !isPreview);
  const data = isPreview
    ? previewData.party?.id === partyId
      ? previewData
      : null
    : status !== "authenticated" || cached?.error
      ? undefined
      : current?.data && cached?.response
        ? {
            ...current.data,
            party: cached.response.data,
            partyEtag: cached.response.etag,
          }
        : current?.data;

  useEffect(() => () => operation.current?.abort(), [scope]);
  useEffect(() => {
    if (isPreview || status === "loading") return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      if (operation.current) {
        timer = setTimeout(refresh, 1000);
        return;
      }
      const requestVersion = version.current;
      try {
        if (status !== "authenticated")
          throw new Error("로그인 후 매칭 결과를 확인해 주세요.");
        const result = await loadMatchingResult(
          createMatchingApi(csrfToken, controller.signal),
          partyId,
          { forceParty: attempt > 0 },
        );
        if (!controller.signal.aborted && requestVersion === version.current)
          setSnapshot({ scope, data: result });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (requestVersion === version.current)
          setSnapshot((previous) => ({
            scope,
            ...(![401, 403, 404].includes(error.status) &&
            previous?.scope === scope &&
            previous.data
              ? {
                  data: {
                    ...previous.data,
                    refreshError:
                      "최신 매칭 정보를 불러오지 못했어요. 잠시 후 다시 확인할게요.",
                  },
                }
              : { error }),
          }));
        if ([401, 403, 404].includes(error.status)) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 15000);
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [partyId, scope, csrfToken, status, isPreview, attempt]);

  const actionKey = (action) => {
    const id = `${scope}:${action}`;
    return (keys.current[id] ??= crypto.randomUUID());
  };
  async function run(action) {
    if (operation.current) return null;
    const controller = new AbortController();
    operation.current = controller;
    version.current += 1;
    setSaving(true);
    const api = createMatchingApi(csrfToken, controller.signal);
    try {
      const result = await action(api);
      if (
        controller.signal.aborted ||
        String(useSessionStore.getState().user?.id) !== String(user?.id)
      )
        return null;
      return result;
    } catch (error) {
      if (controller.signal.aborted) return null;
      if (
        error.status === 412 ||
        error.code === "INVALID_STATE" ||
        error.code === "CONFIRMATION_DEADLINE_PASSED"
      ) {
        try {
          const refreshed = await loadMatchingResult(api, partyId, {
            forceParty: true,
          });
          if (!controller.signal.aborted)
            setSnapshot({ scope, data: refreshed });
        } catch {
          /* 실패 원본을 보존한다. */
        }
      }
      throw error;
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  const confirm = () =>
    run(async (api) => {
      const result = await confirmMembership(api, data, actionKey("confirm"));
      if (!operation.current.signal.aborted) {
        setSnapshot({ scope, data: result });
        // 대표 안내 진입 시 API-33을 다시 조회해 확정 후 정산을 표시한다.
        if (result.party.myMemberId === result.party.representativeMemberId)
          setAttempt((value) => value + 1);
      }
      return result;
    });
  const leave = () =>
    run(async (api) => {
      if (!data?.partyEtag)
        throw new Error("팟 버전을 확인할 수 없어요. 다시 불러와 주세요.");
      const response = await api.leaveParty(
        partyId,
        data.partyEtag,
        actionKey("leave"),
      );
      const party = validateParty(
        response.data,
        partyId,
        data.party.myMemberId,
      );
      const decision = party.members.find(
        (member) => member.memberId === party.myMemberId,
      )?.decision;
      if (!["LEFT", "DECLINED"].includes(decision))
        throw new Error("나가기 결과를 확인할 수 없어요.");
      return party;
    });
  const openRoom = (context = data, expectedRoomId) =>
    run(async (api) => {
      const room = await loadPartyRoom(api, context.party, expectedRoomId);
      return { ...context, room, party: { ...context.party, roomId: room.id } };
    });

  return {
    data,
    loading: !isPreview && !current,
    error: isPreview
      ? data
        ? null
        : new Error("팟 정보가 없어요.")
      : (cached?.error ?? current?.error),
    isPreview,
    saving,
    confirm,
    leave,
    openRoom,
    updateParty: ({ party }) => setUpdated({ source, party }),
    retry: () => {
      if (isPreview) setUpdated(null);
      else setAttempt((value) => value + 1);
    },
  };
}
