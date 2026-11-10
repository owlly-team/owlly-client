import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import RoomConversation from "../components/RoomConversation";
import MeetingInfoCard from "../components/MeetingInfoCard";
import ChatRoomMoreMenu from "../components/ChatRoomMoreMenu";
import { getMockChatRoom } from "../mocks/chatRoomMockData";
import { getChatRoomView } from "../utils/chatRoomUtils";
import useLeaveParty from "../hooks/useLeaveParty";

export default function ChatRoom() {
  const { partyId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { room, context, now } = getMockChatRoom(partyId, state?.chatContext);
  const goHome = () => navigate("/");
  const transfers = context?.settlement?.partyId === partyId
    ? context.settlement.items.flatMap((item) => item.transfers) : [];
  const leaveParty = useLeaveParty({
    party: context?.party, now, transfers,
    onLeft: (party) => navigate("/", { replace: true, state: { leftParty: party } }),
  });

  useEffect(() => {
    if (!state?.reportPreview) return;
    const timer = setTimeout(() => {
      navigate(`/parties/${partyId}/room`, {
        replace: true, state: { ...state, reportPreview: false },
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, partyId, navigate]);

  if (!room) return <div className="flex flex-1 flex-col gap-4">
    <div className="-mx-4"><TopBar title="팟 채팅방" onLeftClick={goHome} /></div>
    <p role="status" className="text-body1">채팅방을 찾을 수 없어요.</p>
    <Button variant="secondary" onClick={goHome}>홈으로</Button>
  </div>;

  const view = getChatRoomView(room, context, now);
  return <div className="flex min-h-0 flex-1 flex-col">
    <header className="-mx-4 shrink-0 bg-background-normal">
      <TopBar title={view.title} onLeftClick={goHome} rightSlot={<ChatRoomMoreMenu
        key={room.id} canLeave={view.canLeave} leaveDisabledReason={view.leaveDisabledReason}
        onLeave={leaveParty.leave} leaveError={leaveParty.error}
        onReport={() => navigate(`/parties/${partyId}/room/report`, { state: { chatContext: context } })}
      />} />
    </header>
    {state?.reportPreview && <p role="status" className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-50 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-12 bg-background-alternative px-4 py-3 text-center text-body2 text-label-neutral shadow-xsmall">
      신고를 접수했어요
    </p>}
    <div className="shrink-0 pt-2"><MeetingInfoCard room={room} view={view} /></div>
    <RoomConversation key={room.id} room={room} context={context} canCompose={view.canCompose} />
  </div>;
}
