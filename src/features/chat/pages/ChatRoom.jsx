import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import ChatBubble from "../components/ChatBubble";
import RoomConversation from "../components/RoomConversation";
import MeetingInfoCard from "../components/MeetingInfoCard";
import ChatRoomMoreMenu from "../components/ChatRoomMoreMenu";
import RideConfirmButtons from "../components/RideConfirmButtons";
import RepresentativePrepayScreen from "./RepresentativePrepayScreen";
import MemberPrepayScreen from "./MemberPrepayScreen";
import { getRoomPhase } from "../utils/prepayUtils";
import { toMatchingResultView } from "../../matching/utils/matchingResultUtils";
import { formatTime } from "../../home/utils/homeUtils";
import { mockRepresentativeMatchingResult } from "../../matching/mocks/matchingMockData";
import useChatMessages from "../hooks/useChatMessages";
import useBoarding from "../hooks/useBoarding";
import useLeaveParty from "../hooks/useLeaveParty";
import { getChatRoomView, resolveChatRoom } from "../utils/chatRoomUtils";
import { memberSettlementMock } from "../../settlement/mocks/memberSettlementMock";
import useLiveRoom from "../hooks/useLiveRoom";
import { getDisplayNow } from "../../../shared/utils/time";

const previewAccount = {
  bankName: "KB국민은행",
  accountNumber: "943202-01-482917",
  maskedHolderName: "이*준",
};

export default function ChatRoom({ csrfToken }) {
  const { roomId, partyId } = useParams();
  const { state, search, pathname } = useLocation();
  const navigate = useNavigate();
  const [messageFailure, setMessageFailure] = useState(null);
  const denied =
    messageFailure?.pathname === pathname ? messageFailure.error : null;
  const queryPreview =
    import.meta.env.DEV &&
    ["member", "representative"].includes(
      new URLSearchParams(search).get("preview"),
    );
  const demo =
    queryPreview && roomId === mockRepresentativeMatchingResult.party.roomId
      ? mockRepresentativeMatchingResult
      : null;
  // 역할 전환은 개발용 미리보기에서만 허용한다.
  const previewRequested =
    import.meta.env.DEV &&
    state?.isPreview !== false &&
    (state?.isPreview === true || queryPreview);
  const live = useLiveRoom({
    enabled: !previewRequested && !denied,
    partyId,
    roomId,
    contextPartyId: state?.matchingResult?.party?.id,
  });
  const data = previewRequested
    ? resolveChatRoom({
        roomId,
        partyId,
        state,
        demo,
        previewMember: new URLSearchParams(search).get("preview") === "member",
      })
    : denied
      ? null
      : live.data;
  const roomError = denied ?? live.error;
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!state?.reportPreview && !state?.reportCompleted) return;
    const timer = window.setTimeout(
      () =>
        navigate(
          { pathname, search },
          {
            replace: true,
            state: { ...state, reportPreview: false, reportCompleted: false },
          },
        ),
      3000,
    );
    return () => window.clearTimeout(timer);
  }, [state, pathname, search, navigate]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  if (live.loading && !previewRequested && !denied)
    return (
      <p role="status" className="py-4">
        채팅방 입장 권한을 확인하고 있어요.
      </p>
    );
  if (!data)
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="-mx-4">
          <TopBar title="채팅방" onLeftClick={() => navigate("/")} />
        </div>
        <p role="status">
          {roomError?.code === "ROOM_ACCESS_EXPIRED" ||
          roomError?.code === "ROOM_CLOSED" ||
          roomError?.status === 410
            ? "종료된 채팅방이에요. 더 이상 입장할 수 없어요."
            : roomError?.code === "ROOM_NOT_READY"
              ? "아직 채팅방에 입장할 수 없어요. 대표는 계좌 등록을 먼저 완료해 주세요."
              : "채팅방 정보를 확인할 수 없어요. 매칭 결과에서 다시 열어 주세요."}
        </p>
        {!previewRequested && (
          <Button
            variant="secondary"
            onClick={() => {
              setMessageFailure(null);
              live.retry();
            }}
          >
            다시 확인
          </Button>
        )}
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </div>
    );

  const { context, room, isPreview, previewNow } = data;
  const currentParty = context.party;
  const roomState = {
    ...state,
    matchingResult: context,
    room,
    isPreview,
    previewNow,
  };
  function openSettlement(updatedState = roomState) {
    const updatedParty = updatedState.matchingResult.party;
    // 뒤로가기로 복귀해도 탑승 응답과 전달받은 ETag를 보존한다.
    navigate({ pathname, search }, { replace: true, state: updatedState });
    navigate(`/parties/${updatedParty.id}/settlement`, {
      state: {
        ...updatedState,
        returnTo: { pathname, search, state: updatedState },
      },
    });
  }
  return (
    <RoomContent
      key={`${room.id}:${currentParty.myMemberId}:${isPreview}`}
      context={context}
      onChatUnavailable={(error) => setMessageFailure({ pathname, error })}
      room={room}
      account={state?.account ?? (isPreview ? previewAccount : null)}
      now={getDisplayNow(data, now)}
      isPreview={isPreview}
      csrfToken={csrfToken}
      reportPreview={state?.reportPreview || state?.reportCompleted}
      onOpenSettlement={() => openSettlement()}
      onOpenMemberSettlement={
        state?.memberSettlement ||
        context.settlement?.actualTotalWon != null ||
        (isPreview &&
          currentParty.id === "401" &&
          currentParty.myMemberId === "502")
          ? () =>
              navigate(`/parties/${currentParty.id}/settlement/result`, {
                state: {
                  ...roomState,
                  memberSettlement:
                    state?.memberSettlement ??
                    (context.settlement?.actualTotalWon != null
                      ? context.settlement
                      : isPreview
                        ? memberSettlementMock
                        : undefined),
                  representativeAccount:
                    state?.representativeAccount ??
                    (state?.account
                      ? {
                          ...state.account,
                          memberId: currentParty.representativeMemberId,
                        }
                      : undefined),
                  returnTo: { pathname, search, state: roomState },
                },
              })
          : undefined
      }
      boardingStarted={state?.boardingStarted}
      onBoardingStarted={() =>
        navigate(
          { pathname, search },
          {
            replace: true,
            state: { ...roomState, boardingStarted: true },
          },
        )
      }
      onReport={() =>
        navigate(`/parties/${currentParty.id}/room/report`, {
          state: {
            chatContext: context,
            isPreview,
            room,
            returnTo: { pathname, search, state: roomState },
          },
        })
      }
      onBoardingRecorded={({ party: updatedParty, etag }) => {
        const updatedState = {
          ...roomState,
          matchingResult: {
            ...context,
            party: updatedParty,
            partyEtag: etag ?? context.partyEtag,
          },
        };
        const boarded =
          updatedParty.members.find(
            (member) => member.memberId === updatedParty.myMemberId,
          )?.boardingStatus === "BOARDED";
        if (
          boarded &&
          updatedParty.myMemberId &&
          updatedParty.myMemberId === updatedParty.representativeMemberId
        ) {
          openSettlement(updatedState);
          return;
        }
        navigate({ pathname, search }, { replace: true, state: updatedState });
      }}
    />
  );
}

function RoomContent({
  context,
  onChatUnavailable,
  room,
  account,
  now,
  isPreview,
  csrfToken,
  onBoardingRecorded,
  onReport,
  reportPreview,
  boardingStarted,
  onBoardingStarted,
  onOpenSettlement,
  onOpenMemberSettlement,
}) {
  const navigate = useNavigate();
  const { party, settlement } = context;
  const view = getChatRoomView(room, context, now);
  const { members, isRepresentative } = toMatchingResultView(party, settlement);
  const chat = useChatMessages({
    room,
    myMemberId: party.myMemberId,
    isPreview,
    onUnavailable: onChatUnavailable,
  });
  const boardingConfirmation = useBoarding({
    party,
    now,
    csrfToken,
    isPreview,
    onRecorded: onBoardingRecorded,
  });
  const phase = getRoomPhase(
    party,
    now,
    boardingStarted || boardingConfirmation.recorded,
  );
  const representative = members.find(
    (member) => member.memberId === party.representativeMemberId,
  );
  const transfers =
    settlement?.partyId === party.id
      ? (settlement.items?.flatMap((item) => item.transfers ?? []) ?? [])
      : [];
  const leaveParty = useLeaveParty({
    party,
    now,
    transfers,
    isPreview,
    etag: context.partyEtag,
    onLeft: (updatedParty) =>
      navigate("/", { replace: true, state: { leftParty: updatedParty } }),
  });

  function handleTaxiCalled() {
    chat.appendSystemMessage(
      `${representative?.maskedName ?? "대표"}님이 택시를 불렀어요 · 타면 채팅방에서 탔어요를 눌러 주세요`,
    );
    onBoardingStarted();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="bg-background-normal -mx-4 shrink-0">
        <TopBar
          title={view.title}
          onLeftClick={() => navigate("/")}
          rightSlot={
            <ChatRoomMoreMenu
              canLeave={view.canLeave}
              leaveDisabledReason={view.leaveDisabledReason}
              leaveSaving={leaveParty.saving}
              onLeave={leaveParty.leave}
              leaveError={leaveParty.error}
              onReport={view.closed ? undefined : onReport}
            />
          }
        />
      </header>
      {reportPreview && (
        <p
          role="status"
          className="rounded-12 bg-background-alternative text-body2 text-label-neutral shadow-xsmall pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-50 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 px-4 py-3 text-center"
        >
          신고를 접수했어요
        </p>
      )}
      <div className="shrink-0 pt-2">
        <MeetingInfoCard room={room} view={view} />
      </div>
      {context.refreshError && (
        <p role="status" className="text-label2 text-label-neutral py-2">
          {context.refreshError}
        </p>
      )}
      {!view.closed && phase === "prepay" ? (
        isRepresentative ? (
          <RepresentativePrepayScreen
            party={party}
            settlement={
              context.settlementError || context.refreshError
                ? null
                : settlement
            }
            account={account}
            onTaxiCalled={isPreview ? handleTaxiCalled : undefined}
          />
        ) : (
          <MemberPrepayScreen
            party={party}
            settlement={settlement}
            settlementError={
              context.settlementError || Boolean(context.refreshError)
            }
            settlementNotReady={context.settlementNotReady}
            isPreview={isPreview}
            previewAccount={isPreview ? account : undefined}
            onRefresh={() =>
              navigate(`/matching/result/${party.id}`, { replace: true })
            }
            onNext={isPreview ? onBoardingStarted : undefined}
          />
        )
      ) : (
        <>
          {isPreview && !view.closed && phase === "chat" && (
            <ChatBubble
              variant="system"
              className="mt-2"
              message={`${formatTime(party.departureAt)}에 모여요 · 만나면 확인 코드를 맞춰 주세요`}
            />
          )}
          <RoomConversation
            room={room}
            context={context}
            canCompose={view.canCompose}
            chat={chat}
          >
            {!view.closed && phase === "boarding" && (
              <div className="shrink-0 pb-4">
                {boardingConfirmation.recorded ? (
                  <p
                    role="status"
                    className="text-body2 text-primary-normal text-center"
                  >
                    {boardingConfirmation.status === "BOARDED"
                      ? "탔어요"
                      : "응답을 기록했어요"}
                  </p>
                ) : (
                  <RideConfirmButtons
                    disabled={Boolean(boardingConfirmation.disabledReason)}
                    saving={boardingConfirmation.saving}
                    onBoarded={() => boardingConfirmation.record("BOARDED")}
                    onMissed={() => boardingConfirmation.record("MISSED")}
                  />
                )}
                {boardingConfirmation.recorded &&
                  boardingConfirmation.status === "BOARDED" &&
                  isRepresentative && (
                    <Button
                      className="mt-3 w-full"
                      disabled={!isPreview}
                      onClick={onOpenSettlement}
                    >
                      정산 입력하기
                    </Button>
                  )}
                {boardingConfirmation.recorded &&
                  boardingConfirmation.status === "BOARDED" &&
                  !isRepresentative &&
                  onOpenMemberSettlement && (
                    <Button
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={onOpenMemberSettlement}
                    >
                      {isPreview ? "정산 결과 미리보기" : "정산 결과 보기"}
                    </Button>
                  )}
                {!boardingConfirmation.recorded &&
                  boardingConfirmation.disabledReason && (
                    <p
                      role="status"
                      className="text-caption1 text-label-alternative mt-2 text-center"
                    >
                      {boardingConfirmation.disabledReason}
                    </p>
                  )}
                {boardingConfirmation.saving && (
                  <p role="status" className="text-caption1 mt-2 text-center">
                    탑승 여부를 기록하고 있어요.
                  </p>
                )}
                {boardingConfirmation.error && (
                  <p
                    role="alert"
                    className="text-caption1 text-status-negative mt-2 text-center"
                  >
                    {boardingConfirmation.error}
                  </p>
                )}
              </div>
            )}
            <p className="text-caption1 text-label-alternative pb-2 text-center">
              {isPreview
                ? "미리보기 채팅이에요. 메시지와 탑승 상태는 이 화면에만 반영돼요."
                : "전화번호·링크·계좌번호는 서버에서 가려져요."}
            </p>
          </RoomConversation>
        </>
      )}
    </div>
  );
}
