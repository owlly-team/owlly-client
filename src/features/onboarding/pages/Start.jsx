import { useNavigate } from "react-router-dom";
import Button from "../../../shared/components/Button";
import iconAppLogo from "../../../assets/icons/app-logo.svg";

export default function Start() {
  const navigate = useNavigate();

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
        <h1 className="text-title2 font-bold tracking-tight text-label-normal">
          막차가 끊겨도
          <br />
          같은 학교 사람과
          <br />
          함께 귀가해요
        </h1>
        <p className="text-body2 text-label-neutral">
          귀가 시간과 방향을 미리 등록하면, 막차를 놓치기 전에 동승 결과를
          알려 드려요.
        </p>
      </div>

      <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          onClick={() => navigate("/onboarding/school-verification")}
        >
          학생으로 시작하기
        </Button>
        <Button
          size="md"
          variant="text"
          className="w-full"
          style={{ color: "var(--color-label-normal)" }}
        >
          학교 관계자로 로그인
        </Button>
        <p className="pt-1 text-center text-caption1 text-label-alternative">
          강남대 · 경희대 · 단국대 · 명지대 · 한국외대 학생만 가입할 수 있어요
        </p>
      </div>
    </div>
  );
}
