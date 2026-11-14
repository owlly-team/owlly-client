import test from "node:test";
import assert from "node:assert/strict";
import {
  loadPrepayRecipientAccount,
  recipientAccountErrorMessage,
} from "./recipientAccount.js";
const account = {
  accountId: "1201",
  bankCode: "004",
  accountNumber: "000000000000",
  maskedHolderName: "박*표",
  purpose: "PREPAY_RECEIVE",
};

test("API-32에는 transferId를 사용하고 계좌번호 앞자리 0과 마스킹 예금주를 유지한다", async () => {
  const result = await loadPrepayRecipientAccount(
    {
      recipientAccount: async (id) => {
        assert.equal(id, "801");
        return { data: account };
      },
    },
    "801",
  );
  assert.deepEqual(result, account);
});
test("계좌 용도·번호 타입·응답이 잘못되면 계좌로 표시하지 않는다", async () => {
  for (const invalid of [
    null,
    { ...account, purpose: "REFUND_RECEIVE" },
    { ...account, accountNumber: 0 },
    { ...account, maskedHolderName: "" },
  ])
    await assert.rejects(
      loadPrepayRecipientAccount(
        { recipientAccount: async () => ({ data: invalid }) },
        "801",
      ),
    );
  await assert.rejects(
    loadPrepayRecipientAccount(
      { recipientAccount: () => assert.fail("must not request") },
      null,
    ),
  );
});
test("미등록·만료·권한 없음은 다른 안내로 처리하고 서버 오류를 성공으로 바꾸지 않는다", async () => {
  assert.match(
    recipientAccountErrorMessage({ code: "ACCOUNT_NOT_REGISTERED" }),
    /아직.*등록하지/,
  );
  assert.match(
    recipientAccountErrorMessage({ status: 410, code: "ACCOUNT_EXPIRED" }),
    /기간이 끝났/,
  );
  assert.match(recipientAccountErrorMessage({ status: 403 }), /권한이 없/);
  const error = Object.assign(new Error("expired"), {
    status: 410,
    code: "ACCOUNT_EXPIRED",
  });
  await assert.rejects(
    loadPrepayRecipientAccount(
      {
        recipientAccount: async () => {
          throw error;
        },
      },
      "801",
    ),
    (value) => value === error,
  );
});
