import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "../../../shared/components/TextField";
import Button from "../../../shared/components/Button";
import iconAppLogo from "../../../assets/icons/app-logo.svg";
import { loginStaff } from "../../../shared/api/authApi";
import useSessionStore from "../../../shared/stores/sessionStore";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const session = await loginStaff({ email: email.trim(), password });
      useSessionStore.getState().setSession(session);
      navigate("/admin");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="flex flex-col gap-5 pt-8">
        <div className="flex items-end gap-2.5">
          <img src={iconAppLogo} alt="" className="size-13" />
          <span className="text-title1 font-extrabold tracking-tight text-label-alternative">
            아울리
          </span>
          <span className="pb-1.5 text-label1 font-bold text-label-alternative/72">
            Owlly
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title3 font-bold tracking-tight text-label-normal">
            학교 관계자 로그인
          </h1>
          <p className="text-body2 text-label-neutral">
            아울리 운영팀이 학교별로 발급한 계정으로 로그인해요.
          </p>
        </div>

        <TextField
          label="업무 메일"
          placeholder="minseo.jung@dankook.ac.kr"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
        />
        <TextField
          label="비밀번호"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          helperText={error || undefined}
          inputClassName={error ? "shadow-[inset_0_0_0_1px_var(--color-status-negative)]" : ""}
        />
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "로그인하는 중..." : "로그인"}
        </Button>
      </div>
    </div>
  );
}
