import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import TextField from "../../../shared/components/TextField";
import Button from "../../../shared/components/Button";
import {
  fetchUniversities,
  requestEmailVerification,
  verifyEmailCode,
} from "../api/onboardingApi";

export default function SchoolVerification() {
  const navigate = useNavigate();
  const goBack = () => navigate("/onboarding");

  const [universities, setUniversities] = useState([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendError, setSendError] = useState("");
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    fetchUniversities().then(setUniversities).catch(() => setUniversities([]));
  }, []);

  const domain = email.split("@")[1] ?? "";
  const matchedUniversity = universities.find((university) =>
    university.emailDomains.includes(domain),
  );
  const isValidDomain = email.includes("@") && Boolean(matchedUniversity);
  const showDomainError = email.length > 0 && !isValidDomain;
  const canSend = isValidDomain && !sending;
  const canVerify = codeSent && code.length === 6 && !verifying;
  const schoolNames = universities.map((university) => university.name).join(" · ");

  const handleSendCode = async () => {
    if (!isValidDomain || sending) return;
    setSending(true);
    setSendError("");
    try {
      const result = await requestEmailVerification({
        universityId: matchedUniversity.id,
        email,
      });
      setVerificationId(result.verificationId);
      setCodeSent(true);
    } catch (error) {
      setSendError(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const result = await verifyEmailCode({ verificationId, code });
      navigate("/onboarding/permissions", {
        state: {
          universityId: matchedUniversity.id,
          universityName: matchedUniversity.name,
          email,
          verificationToken: result.verificationToken,
        },
      });
    } catch (error) {
      setVerifyError(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="-mx-4">
          <TopBar title="학교 인증" onLeftClick={goBack} />
        </div>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-2">
            <h1 className="text-title3 font-bold tracking-tight text-label-normal">
              학교 메일로 인증해요
            </h1>
            <p className="text-body2 text-label-neutral">
              같은 학교 학생끼리만 매칭돼요.
            </p>
          </div>

          <TextField
            label="학교 메일"
            placeholder="학번@학교 도메인"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={codeSent}
            helperText={
              showDomainError
                ? "학교 메일만 쓸 수 있어요"
                : sendError || `${schoolNames} 메일만 돼요`
            }
            inputClassName={
              showDomainError || sendError
                ? "shadow-[inset_0_0_0_1px_var(--color-status-negative)]"
                : ""
            }
            trailing={
              <Button
                variant="primary"
                size="sm"
                className="h-10 shrink-0 rounded-12 px-4"
                style={{ backgroundColor: "#3a3a3c" }}
                disabled={!canSend}
                onClick={handleSendCode}
              >
                {sending ? "보내는 중..." : codeSent ? "다시 보내기" : "코드 보내기"}
              </Button>
            }
          />

          {codeSent && (
            <TextField
              label="인증 코드 6자리"
              placeholder="6자리 숫자"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              helperText={verifyError || "메일로 보낸 코드예요 · 10분 안에 입력해 주세요"}
              inputClassName={
                "text-center text-title3 font-bold tracking-[0.3em]" +
                (verifyError ? " shadow-[inset_0_0_0_1px_var(--color-status-negative)]" : "")
              }
            />
          )}
        </div>
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          disabled={!canVerify}
          onClick={handleVerify}
        >
          {verifying ? "확인 중..." : "인증하기"}
        </Button>
      </div>
    </div>
  );
}
