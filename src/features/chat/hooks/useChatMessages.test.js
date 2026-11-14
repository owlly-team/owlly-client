import test from "node:test";
import assert from "node:assert/strict";
import { toChatBubble } from "../utils/chatMessageUtils.js";

test("own messages align right, other members left, and system messages in the center", () => {
  const context = {
    party: {
      myMemberId: "503",
      members: [{ memberId: "501", maskedName: "김*연" }],
    },
  };
  const message = {
    id: "701",
    senderMemberId: "501",
    messageType: "USER",
    body: "[가려진 번호]",
  };
  assert.equal(toChatBubble(message, context).variant, "incoming");
  assert.equal(toChatBubble(message, context).sender, "김*연");
  assert.equal(toChatBubble(message, context).message, "[가려진 번호]");
  assert.equal(
    toChatBubble({ ...message, senderMemberId: "503" }, context).variant,
    "outgoing",
  );
  assert.equal(
    toChatBubble(
      { ...message, messageType: "SYSTEM", senderMemberId: null },
      context,
    ).variant,
    "system",
  );
});
