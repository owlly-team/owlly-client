import Button from "../../../shared/components/Button";
import BankSelectSheet from "../../../shared/components/BankSelectSheet";
import useMemberSettlement from "../hooks/useMemberSettlement";
import { BANK_OPTIONS } from "../../../shared/constants/banks";

export default function RefundAccountCard({ view, isPreview }) {
  const account = useMemberSettlement({ banks: BANK_OPTIONS, isPreview });
  return (
    <section
      className="rounded-16 bg-primary-tint p-4"
      aria-labelledby="refund-title"
    >
      <h1 id="refund-title" className="text-label2 text-label-neutral">
        대표님으로부터 돌려받을 금액
      </h1>
      <p className="text-title3 text-label-normal mt-2 font-bold">
        {view.amount}
      </p>
      <p className="text-caption1 text-label-neutral mt-1">
        보낸 {view.paid} − 확정 {view.confirmed}
      </p>
      <form className="mt-3" onSubmit={account.submit}>
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <BankSelectSheet
              banks={BANK_OPTIONS}
              value={account.bankCode}
              onChange={account.setBankCode}
            />
          </div>
          <input
            aria-label="돌려받을 계좌번호"
            placeholder="계좌번호"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={16}
            pattern="[0-9]{8,16}"
            title="계좌번호는 숫자 8~16자리로 입력해 주세요."
            value={account.accountNumber}
            onChange={(event) =>
              account.setAccountNumber(event.target.value.replace(/\D/g, ""))
            }
            className="rounded-12 bg-background-normal text-body2 focus:ring-primary-normal h-12 w-full min-w-0 px-3 outline-none focus:ring-2"
          />
        </div>
        <Button
          type="submit"
          disabled={!account.canSubmit}
          className="mt-3 w-full"
        >
          {account.saved ? "계좌 입력 완료" : "이 계좌로 받을게요"}
        </Button>
        <p className="text-caption1 text-label-alternative mt-2">
          은행과 계좌번호만 전달해요. 받았는지는 채팅방에서 확인해요.
        </p>
        <p
          role="status"
          aria-live="polite"
          className="text-caption1 text-label-neutral mt-2"
        >
          {account.saved
            ? "미리보기에서 계좌를 입력했어요. 실제로 전달되지는 않아요."
            : isPreview
              ? "계좌 전달 미리보기예요. 실제 계좌는 저장되지 않아요."
              : "계좌 전달 기능은 준비 중이에요."}
        </p>
      </form>
    </section>
  );
}
