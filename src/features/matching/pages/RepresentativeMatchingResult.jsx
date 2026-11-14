import TopBar from "../../../shared/components/TopBar";
import Badge from "../../../shared/components/Badge";
import RepresentativePaymentCard from "../components/RepresentativePaymentCard";
import RepresentativeAccountForm from "../components/RepresentativeAccountForm";

export default function RepresentativeMatchingResult({
  party,
  settlement,
  settlementNotReady,
  settlementError,
  onBack,
  retry,
  banks = [],
  onOpenChat,
  isPreview = false,
}) {
  return (
    <div className="flex flex-1 flex-col">
      {isPreview && (
        <p role="status" className="text-caption1 text-primary-normal">
          미리보기 · 예시 매칭 결과
        </p>
      )}
      <div className="-mx-4">
        <TopBar title="대표 안내" onLeftClick={onBack} />
      </div>
      <div className="mt-3">
        <Badge variant="primary">대표</Badge>
      </div>
      <h1 className="text-title3 mt-2 font-bold">
        마지막에 내려서
        <br />
        대표를 맡게 됐어요
      </h1>
      <p className="text-body2 text-label-neutral mt-2">
        택시를 부르고 결제하는 사람이에요. 멤버들은 택시를 부르기 전에 대표에게
        먼저 보내요.
      </p>
      <RepresentativePaymentCard
        party={party}
        settlement={settlement}
        settlementNotReady={settlementNotReady}
        settlementError={settlementError}
        retry={retry}
      />
      <RepresentativeAccountForm
        roomId={party.roomId}
        banks={banks}
        onOpenChat={onOpenChat}
        isPreview={isPreview}
      />
    </div>
  );
}
