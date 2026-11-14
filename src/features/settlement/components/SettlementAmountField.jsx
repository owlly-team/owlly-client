import TextField from "../../../shared/components/TextField";

export default function SettlementAmountField({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <TextField
      label="택시 앱 결제 금액"
      align="right"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={value === "" ? "" : `${Number(value).toLocaleString("ko-KR")}원`}
      placeholder="0원"
      inputClassName="min-w-0 text-heading2 font-bold"
      helperText="택시 앱에 나온 금액을 그대로 넣어 주세요."
      onChange={(event) => {
        const digits = event.target.value.replace(/[^0-9]/g, "");
        if (digits.length <= 9)
          onChange(digits === "" ? "" : String(Number(digits)));
      }}
    />
  );
}
