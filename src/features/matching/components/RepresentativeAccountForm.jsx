import { useState } from "react";
import Button from "../../../shared/components/Button";
import Switch from "../../../shared/components/Switch";
import BankSelectSheet from "../../../shared/components/BankSelectSheet";
import { BANK_OPTIONS } from "../../../shared/constants/banks";
import useRepresentativeAccount from "../hooks/useRepresentativeAccount";

export default function RepresentativeAccountForm({
  roomId,
  banks = BANK_OPTIONS,
  onOpenChat,
  isPreview,
}) {
  const { input, saved, error, update, submit } = useRepresentativeAccount({
    roomId,
    onOpenChat,
  });
  // API-31에는 계좌 재사용 옵션이 없어 화면 상태만 관리한다.
  const [reuseAccount, setReuseAccount] = useState(true);
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
        <fieldset className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <BankSelectSheet
                banks={banks.length ? banks : BANK_OPTIONS}
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
      {!saved && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <span id="reuse-account-label" className="text-body2 font-semibold">
            다음에 대표가 되면 이 계좌 쓰기
          </span>
          <Switch
            checked={reuseAccount}
            onChange={setReuseAccount}
            labelledBy="reuse-account-label"
          />
        </div>
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
          disabled={!roomId || Boolean(saved && !onOpenChat)}
        >
          {saved ? "채팅방 열기" : "계좌 등록하고 채팅방 열기"}
        </Button>
      </div>
    </form>
  );
}
