import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import MemberReportForm from "../components/MemberReportForm";
import { getMockChatRoom } from "../mocks/chatRoomMockData";
import useLiveRoom from "../hooks/useLiveRoom";

export default function ReportMember() {
  const { partyId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const isPreview = import.meta.env.DEV && state?.isPreview === true;
  const live = useLiveRoom({ enabled: !isPreview, partyId });
  const preview = isPreview
    ? state?.room?.partyId === partyId &&
      state?.chatContext?.party?.id === partyId
      ? { room: state.room, context: state.chatContext }
      : getMockChatRoom(partyId, state?.chatContext)
    : null;
  const { room, context } = (isPreview ? preview : live.data) ?? {};
  const backToRoom = (completed = false) => {
    const returnTo = state?.returnTo;
    const partyPath = `/parties/${partyId}/room`;
    const roomPath = room?.id ? `/rooms/${room.id}` : null;
    const validReturn = [partyPath, roomPath].includes(returnTo?.pathname);
    navigate(
      validReturn
        ? { pathname: returnTo.pathname, search: returnTo.search }
        : (roomPath ?? partyPath),
      {
        replace: true,
        state: {
          ...(validReturn ? returnTo.state : {}),
          isPreview,
          ...(context && room
            ? { matchingResult: context, chatContext: context, room }
            : {}),
          reportPreview: isPreview && completed,
          reportCompleted: !isPreview && completed,
        },
      },
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="-mx-4">
        <TopBar title="신고하기" onLeftClick={() => backToRoom()} />
      </div>
      {room && context ? (
        <MemberReportForm
          key={`${room.id}:${context.party.myMemberId}:${isPreview}`}
          party={context.party}
          room={room}
          isPreview={isPreview}
          message={state?.reportMessage}
          onSubmitted={() => backToRoom(true)}
        />
      ) : (
        <p
          role={live.loading ? "status" : "alert"}
          className="text-body2 text-label-alternative mt-5"
        >
          {live.loading
            ? "신고 가능한 채팅방을 확인하고 있어요."
            : "이 채팅방에서 신고할 멤버를 확인할 수 없어요."}
        </p>
      )}
    </div>
  );
}
