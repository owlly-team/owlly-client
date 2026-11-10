import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import TextField from "../../../shared/components/TextField";
import Badge from "../../../shared/components/Badge";
import Switch from "../../../shared/components/Switch";
import Button from "../../../shared/components/Button";
import GenderToggle from "../components/GenderToggle";
import LocationPreview from "../components/LocationPreview";
import iconSchoolCheck from "../../../assets/icons/school-check.svg";

const defaultProfileData = {
  school: "단국대",
  dropoffLabel: "영통2동 · 큰길 쪽",
};

export default function Profile({ data = defaultProfileData }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gender, setGender] = useState(null);
  const [sameGenderOnly, setSameGenderOnly] = useState(true);

  const canStart = name.trim().length > 0 && gender !== null;

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="-mx-4">
          <TopBar title="프로필" onLeftClick={() => navigate(-1)} />
        </div>
        <div className="flex flex-col gap-4.5 pt-1">
          <Badge variant="neutral" icon={iconSchoolCheck}>
            {data.school} 인증 완료
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
            <GenderToggle
              value={gender}
              onChange={setGender}
              options={[
                { value: "female", label: "여성" },
                { value: "male", label: "남성" },
              ]}
            />
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
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          disabled={!canStart}
          onClick={() => navigate("/")}
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}
