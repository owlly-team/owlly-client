import test from "node:test";
import assert from "node:assert/strict";
import { registerRepresentativeAccount } from "./representativeAccount.js";

const account = {
  bankCode: "004",
  accountNumber: "1234567890",
  holderName: "테스트",
};
const response = {
  id: "701",
  purpose: "PREPAY_RECEIVE",
  bankCode: "004",
  maskedAccountNumber: "******7890",
  maskedHolderName: "테*트",
  accountNumber: account.accountNumber,
  holderName: account.holderName,
};

test("API-31 sends only bank, account and holder and preserves only masked result", async () => {
  const result = await registerRepresentativeAccount(
    {
      registerAccount: async (...args) => {
        assert.deepEqual(args, ["601", "PREPAY_RECEIVE", account, "same-key"]);
        return { data: response };
      },
    },
    "601",
    { ...account, remember: true },
    "same-key",
  );
  assert.equal(result.id, "701");
  assert.equal(result.maskedAccountNumber, "******7890");
  assert.equal("accountNumber" in result, false);
  assert.equal("holderName" in result, false);
});

test("wrong purpose, bank or missing masked fields never count as account registration", async () => {
  for (const invalid of [
    null,
    { ...response, purpose: "REFUND_RECEIVE" },
    { ...response, bankCode: "other" },
    { ...response, maskedAccountNumber: null },
  ]) {
    await assert.rejects(
      registerRepresentativeAccount(
        { registerAccount: async () => ({ data: invalid }) },
        "601",
        account,
        "key",
      ),
    );
  }
  await assert.rejects(
    registerRepresentativeAccount(
      { registerAccount: () => assert.fail() },
      null,
      account,
      "key",
    ),
  );
});
