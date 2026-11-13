import Button from "../../../shared/components/Button";
import BankSelectSheet from "../../../shared/components/BankSelectSheet";
import { BANK_OPTIONS } from "../../../shared/constants/banks";
import useRepresentativeAccount from "../hooks/useRepresentativeAccount";

export default function RepresentativeAccountForm({
  roomId,
  banks = BANK_OPTIONS,
  onOpenChat,
  isPreview,
}) {
  const { input, saved, error, update, submit, saving } =
    useRepresentativeAccount({
      roomId,
      onOpenChat,
      isPreview,
      banks,
    });
  const fieldClass =
    "h-12 min-w-0 w-full rounded-12 border border-line-normal bg-background-normal px-3 text-body2 outline-none focus:border-primary-normal";

  return (
    <form onSubmit={submit} className="mt-5 flex flex-1 flex-col">
      <h2 className="text-label2 text-label-alternative">받을 계좌</h2>
      {saved ? (
        <div
          role="status"
          className="rounded-12 border-line-normal text-body2 mt-2 border p-3"
        >
          <p>
            {banks.find((bank) => bank.code === saved.bankCode)?.name ??
              saved.bankCode}{" "}
            · {saved.maskedAccountNumber}
          </p>
          <p className="mt-1">{saved.maskedHolderName}</p>
          <p className="text-label2 text-label-alternative mt-2">
            {isPreview
              ? "미리보기에서 등록했어요. 실제 계좌는 저장되지 않았어요."
              : "계좌를 등록했어요."}
          </p>
        </div>
      ) : (
        <fieldset disabled={saving} className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <BankSelectSheet
                banks={banks}
                value={input.bankCode}
                onChange={(value) => update("bankCode")({ target: { value } })}
                className="border-line-normal border"
              />
            </div>
            <input
              type="text"
              aria-label="계좌번호"
              placeholder="계좌번호"
              required
              maxLength={40}
              pattern="[0-9]+"
              inputMode="numeric"
              title="계좌번호는 숫자만 입력해 주세요."
              autoComplete="off"
              value={input.accountNumber}
              onChange={update("accountNumber")}
              className={fieldClass}
            />
          </div>
          <input
            aria-label="예금주"
            placeholder="예금주"
            required
            maxLength={50}
            autoComplete="off"
            value={input.holderName}
            onChange={update("holderName")}
            className={fieldClass}
          />
        </fieldset>
      )}
      <p className="text-caption1 text-label-alternative mt-2">
        이 방 멤버의 송금 카드에만 보이고, 채팅방이 닫히면 함께 지워져요.
        채팅에서는 계좌번호가 계속 가려져요.
      </p>
      {!banks.length && (
        <p role="status" className="text-label2 text-label-neutral mt-2">
          은행 목록을 불러오지 못했어요. 다시 불러와 주세요.
        </p>
      )}
      {!saved && !isPreview && roomId && (
        <Button
          variant="text"
          className="mt-2 self-start"
          disabled={saving}
          onClick={(event) => submit(event, true)}
        >
          이미 등록했다면 채팅방 열기
        </Button>
      )}
      {!roomId && !isPreview && (
        <p className="text-label2 text-label-alternative mt-2">
          채팅방이 준비되면 계좌를 등록할 수 있어요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-label2 text-status-negative mt-3">
          {error}
        </p>
      )}
      {saved && !isPreview && !onOpenChat && (
        <p role="status" className="text-label2 text-label-alternative mt-3">
          채팅방 이동 기능은 아직 연결되지 않았어요.
        </p>
      )}
      <div className="bg-background-normal sticky bottom-0 mt-auto pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          className="w-full"
          disabled={
            !roomId ||
            saving ||
            (!saved && !banks.length) ||
            Boolean(saved && !onOpenChat)
          }
          aria-busy={saving}
        >
          {saving
            ? "처리 중"
            : saved
              ? "채팅방 열기"
              : "계좌 등록하고 채팅방 열기"}
        </Button>
      </div>
    </form>
  );
}
