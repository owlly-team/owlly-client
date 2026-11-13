import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import TextField from "../../../shared/components/TextField";
import Badge from "../../../shared/components/Badge";
import Switch from "../../../shared/components/Switch";
import Button from "../../../shared/components/Button";
import GenderToggle from "../components/GenderToggle";
import LocationPreview from "../components/LocationPreview";
import iconSchoolCheck from "../../../assets/icons/school-check.svg";
import { fetchProfileOptions } from "../api/onboardingApi";
import { mockProfileOptions } from "../mocks/onboardingMockData";
import { registerStudent } from "../../../shared/api/authApi";
import useSessionStore from "../../../shared/stores/sessionStore";

const defaultProfileData = {
  school: "단국대",
  dropoffLabel: "영통2동 · 큰길 쪽",
};

// 지도 핀 선택 UI가 아직 없어서, 위치 권한을 허용했으면 실제 현재 위치를,
// 아니면 Figma 목업과 같은 영통2동 근방 좌표를 기본 하차 지점으로 사용한다.
const FALLBACK_DROPOFF = { latitude: 37.33, longitude: 127.27 };

function getDropoffPoint() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(FALLBACK_DROPOFF);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(FALLBACK_DROPOFF),
      { timeout: 5000 },
    );
  });
}

export default function Profile({ data = defaultProfileData }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const school = state?.universityName ?? data.school;
  const [genderOptions, setGenderOptions] = useState(
    mockProfileOptions.genderOptions.map((option) => ({
      value: option.code,
      label: option.label,
    })),
  );
  const [name, setName] = useState("");
  const [gender, setGender] = useState(null);
  const [sameGenderOnly, setSameGenderOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetchProfileOptions()
      .then((options) => {
        setGenderOptions(
          options.genderOptions.map((option) => ({ value: option.code, label: option.label })),
        );
        setSameGenderOnly(options.sameGenderDefault);
      })
      .catch(() => {});
  }, []);

  const canStart = name.trim().length > 0 && gender !== null && !submitting;

  const handleSubmit = async () => {
    if (!canStart) return;
    if (!state?.verificationToken) {
      navigate("/");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const defaultDropoff = await getDropoffPoint();
      const session = await registerStudent({
        verificationToken: state.verificationToken,
        email: state.email,
        profile: {
          realName: name.trim(),
          genderCode: gender,
          sameGenderDefault: sameGenderOnly,
          defaultDropoff,
        },
      });
      useSessionStore.getState().setSession(session);
      navigate("/");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="-mx-4">
          <TopBar title="프로필" onLeftClick={() => navigate(-1)} />
        </div>
        <div className="flex flex-col gap-4.5 pt-1">
          <Badge variant="neutral" icon={iconSchoolCheck}>
            {school} 인증 완료
          </Badge>

          <div className="flex flex-col gap-2">
            <span className="text-label2 font-semibold text-label-neutral">
              이름
            </span>
            <TextField
              placeholder="이름을 입력해 주세요"
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText="다른 사람에게는 한*윤처럼 일부만 보여요"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label2 font-semibold text-label-alternative">
              성별
            </span>
            <GenderToggle value={gender} onChange={setGender} options={genderOptions} />
            <p className="text-caption1 text-label-alternative">
              동성 매칭에 쓰여요. 가입 후에는 바꿀 수 없어요.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label2 font-semibold text-label-alternative">
              집 근처 하차 지점
            </span>
            <LocationPreview label={data.dropoffLabel} />
            <p className="text-caption1 text-label-alternative">
              택시가 설 수 있는 큰길로 핀을 옮겨 주세요. 다른 멤버에게는
              행정동만 보여요.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-body1 font-semibold text-label-normal">
                동성끼리만 매칭
              </p>
              <p className="text-label2 text-label-alternative">
                기본으로 켜져 있어요
              </p>
            </div>
            <Switch checked={sameGenderOnly} onChange={setSameGenderOnly} />
          </div>
        </div>
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {submitError && (
          <p className="pb-2 text-center text-caption1 text-status-negative">{submitError}</p>
        )}
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          disabled={!canStart}
          onClick={handleSubmit}
        >
          {submitting ? "가입하는 중..." : "시작하기"}
        </Button>
      </div>
    </div>
  );
}
