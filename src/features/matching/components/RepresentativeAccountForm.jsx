import { useState } from "react";
import Button from "../../../shared/components/Button";
import Switch from "../../../shared/components/Switch";
import iconChevronDown from "../../../assets/icons/chevron-down.svg";
import useRepresentativeAccount from "../hooks/useRepresentativeAccount";

export default function RepresentativeAccountForm({ roomId, banks = [], onOpenChat, isPreview }) {
  const { input, saved, error, update, submit } = useRepresentativeAccount({
    roomId, onOpenChat,
  });
  // API-31에는 계좌 재사용 옵션이 없어 화면 상태만 관리한다.
  const [reuseAccount, setReuseAccount] = useState(true);
  const fieldClass = "h-12 min-w-0 w-full rounded-12 border border-line-normal bg-background-normal px-3 text-body2 outline-none focus:border-primary-normal";

  return <form onSubmit={submit} className="mt-5 flex flex-1 flex-col">
      <h2 className="text-label2 text-label-alternative">
        받을 계좌
      </h2>
      {saved ? <div role="status" className="mt-2 rounded-12 border border-line-normal p-3 text-body2">
        <p>{banks.find((bank) => bank.code === saved.bankCode)?.name ?? saved.bankCode} · {saved.maskedAccountNumber}</p>
        <p className="mt-1">{saved.maskedHolderName}</p>
        <p className="mt-2 text-label2 text-label-alternative">{isPreview ? "미리보기에서 등록했어요. 실제 계좌는 저장되지 않았어요." : "계좌를 등록했어요."}</p>
      </div> : <fieldset className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative w-28 shrink-0">
            {banks.length > 0 ? <><select aria-label="은행" required value={input.bankCode} onChange={update("bankCode")} className={`${fieldClass} appearance-none pr-7`}>
              <option value="" disabled>
                은행 선택
              </option>
              {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </select><img src={iconChevronDown} alt="" className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2" /></> : <input aria-label="은행 코드" placeholder="은행 코드" required maxLength={16} value={input.bankCode} onChange={update("bankCode")} className={fieldClass} />}
          </div>
          <input type="number" aria-label="계좌번호" placeholder="계좌번호" required min="0" step="1" inputMode="numeric" title="계좌번호는 숫자만 입력해 주세요." autoComplete="off" value={input.accountNumber} onChange={update("accountNumber")} className={`${fieldClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
        </div>
        <input aria-label="예금주" placeholder="예금주" required maxLength={50} autoComplete="off" value={input.holderName} onChange={update("holderName")} className={fieldClass} />
      </fieldset>}
      <p className="mt-2 text-caption1 text-label-alternative">이 방 멤버의 송금 카드에만 보이고, 채팅방이 닫히면 함께 지워져요. 채팅에서는 계좌번호가 계속 가려져요.</p>
      {!saved && <div className="mt-3 flex items-center justify-between gap-4">
        <span id="reuse-account-label" className="text-body2 font-semibold">다음에 대표가 되면 이 계좌 쓰기</span>
        <Switch checked={reuseAccount} onChange={setReuseAccount} labelledBy="reuse-account-label" className="[&>span]:left-0" />
      </div>}
      {!roomId && !isPreview && <p className="mt-2 text-label2 text-label-alternative">채팅방이 준비되면 계좌를 등록할 수 있어요.</p>}
      {error && <p role="alert" className="mt-3 text-label2 text-status-negative">{error}</p>}
      {saved && !isPreview && !onOpenChat && <p role="status" className="mt-3 text-label2 text-label-alternative">채팅방 이동 기능은 아직 연결되지 않았어요.</p>}
      <div className="sticky bottom-0 mt-auto bg-background-normal pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" className="w-full" disabled={!roomId || Boolean(saved && !onOpenChat)}>
          {saved ? "채팅방 열기" : "계좌 등록하고 채팅방 열기"}
        </Button>
      </div>
    </form>;
}
