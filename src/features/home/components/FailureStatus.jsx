import Button from "../../../shared/components/Button";

export default function FailureStatus({ failure }) {
  if (failure.loading)
    return (
      <p role="status" className="py-6">
        매칭 결과를 확인하고 있어요.
      </p>
    );
  const request = failure.data?.rideRequest;
  return (
    <div className="flex flex-col gap-3 py-6">
      <p role="status">
        {failure.error?.message ??
          (request?.status === "MATCHED"
            ? "이미 매칭이 완료됐어요. 홈에서 최신 결과를 확인해 주세요."
            : request?.status === "WAITING"
              ? "아직 매칭 대기 중이에요. 홈에서 신청을 확인해 주세요."
              : "이미 귀가 방법이 정해졌거나 신청 상태가 바뀌었어요. 홈에서 확인해 주세요.")}
      </p>
      {failure.error && (
        <Button variant="secondary" onClick={failure.retry}>
          다시 확인
        </Button>
      )}
      <Button onClick={failure.goHome}>홈으로</Button>
    </div>
  );
}
