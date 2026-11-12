import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import MemberReportForm from "../components/MemberReportForm";
import { getMockChatRoom } from "../mocks/chatRoomMockData";

export default function ReportMember() {
  const { partyId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { room, context } = state?.room?.partyId === partyId && state?.chatContext?.party?.id === partyId
    ? { room: state.room, context: state.chatContext }
    : getMockChatRoom(partyId, state?.chatContext);
  const backToRoom = (completed = false) => {
    const returnTo = state?.returnTo;
    navigate(returnTo ? { pathname: returnTo.pathname, search: returnTo.search } : `/parties/${partyId}/room`, {
      replace: true, state: { ...returnTo?.state, chatContext: context, reportPreview: completed },
    });
  };

  return <div className="flex flex-1 flex-col">
    <div className="-mx-4">
      <TopBar title="신고하기" onLeftClick={() => backToRoom()} />
    </div>
    {room ? <MemberReportForm key={`${room.id}:${context.party.myMemberId}`} party={context.party}
      onSubmitted={() => backToRoom(true)} />
      : <p role="alert" className="mt-5 text-body2 text-label-alternative">신고할 멤버를 확인할 수 없어요.</p>}
  </div>;
}
