import { useState } from "react";
import Button from "./shared/components/Button";
import IconButton from "./shared/components/IconButton";
import Switch from "./shared/components/Switch";
import TextField from "./shared/components/TextField";
import TimeChip from "./shared/components/TimeChip";
import FilterChip from "./shared/components/FilterChip";
import TopBar from "./shared/components/TopBar";
import BottomTabBar from "./shared/components/BottomTabBar";
import BottomSheet from "./shared/components/BottomSheet";
import Badge from "./shared/components/Badge";
import InfoBox from "./shared/components/InfoBox";
import DefinitionList from "./shared/components/DefinitionList";
import StatGrid from "./shared/components/StatGrid";
import MetricRow from "./shared/components/MetricRow";
import PlaceRow from "./shared/components/PlaceRow";

import PushNotificationCard from "./features/notification/components/PushNotificationCard";
import SelectionCard from "./features/admin/components/SelectionCard";
import PermissionRow from "./features/onboarding/components/PermissionRow";

import LastDepartureCard from "./features/home/components/LastDepartureCard";
import TransportOptionCard from "./features/home/components/TransportOptionCard";
import RouteSteps from "./features/home/components/RouteSteps";
import HomeShareCard from "./features/home/components/HomeShareCard";

import FareCompare from "./features/matching/components/FareCompare";
import MemberRow from "./features/matching/components/MemberRow";
import GatherInfoCard from "./features/matching/components/GatherInfoCard";
import ChatBubble from "./features/chat/components/ChatBubble";
import ChatInput from "./features/chat/components/ChatInput";
import RideConfirmButtons from "./features/chat/components/RideConfirmButtons";
import ReportReasonButton from "./features/chat/components/ReportReasonButton";

import AccountCard from "./features/settlement/components/AccountCard";
import SettleTable from "./features/settlement/components/SettleTable";
import PaymentReceiptCard from "./features/settlement/components/PaymentReceiptCard";
import TransferRow from "./features/settlement/components/TransferRow";

import RouteCandidateCard from "./features/admin/components/RouteCandidateCard";
import ReportSummaryCard from "./features/admin/components/ReportSummaryCard";
import MapPlaceholder from "./features/demand/components/MapPlaceholder";

import iconKebab from "./assets/icons/kebab.svg";
import iconNavHome from "./assets/icons/nav-home.svg";
import iconNavReturn from "./assets/icons/nav-return.svg";
import iconNavMap from "./assets/icons/nav-map.svg";
import iconNavMapActive from "./assets/icons/nav-map-active.svg";
import iconNavProfile from "./assets/icons/nav-profile.svg";
import iconTransportBus from "./assets/icons/transport-bus.svg";
import iconTransportCarpool from "./assets/icons/transport-carpool.svg";
import iconTransportTaxi from "./assets/icons/transport-taxi.svg";
import iconStepWalk from "./assets/icons/step-walk.svg";
import iconStepBus from "./assets/icons/step-bus.svg";
import iconStepFlag from "./assets/icons/step-flag.svg";

function Section({ title, children }) {
  return (
    <section className="flex w-full max-w-[390px] flex-col gap-3">
      <h2 className="text-label2 text-label-alternative font-bold tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function App() {
  const [matchToggle, setMatchToggle] = useState(true);
  const [selectedTime, setSelectedTime] = useState("23:30");
  const [selectedOption, setSelectedOption] = useState("shuttle");

  return (
    <div className="bg-background-alternative flex min-h-screen flex-col items-center gap-10 px-4 py-10">
      <h1 className="text-title3 text-label-normal font-bold">
        아울리 컴포넌트 미리보기
      </h1>

      <Section title="상단 바">
        <TopBar title="학교 인증" />
        <TopBar
          title="정문 → 영통구 · 3명"
          rightSlot={<IconButton src={iconKebab} alt="더보기" />}
        />
      </Section>

      <Section title="하단 탭 바">
        <BottomTabBar
          items={[
            { key: "home", label: "홈", icon: iconNavHome, active: true },
            { key: "return", label: "귀가", icon: iconNavReturn },
            { key: "map", label: "수요 지도", icon: iconNavMap },
            { key: "profile", label: "내 정보", icon: iconNavProfile },
          ]}
        />
        <BottomTabBar
          items={[
            {
              key: "map",
              label: "수요 지도",
              icon: iconNavMap,
              activeIcon: iconNavMapActive,
              active: true,
            },
            { key: "routes", label: "노선 후보", icon: iconNavReturn },
            { key: "report", label: "리포트", icon: iconNavProfile },
          ]}
        />
      </Section>

      <Section title="버튼">
        <Button variant="primary" className="w-full">
          23:30으로 등록하기
        </Button>
        <Button variant="secondary" className="w-full">
          빠지기
        </Button>
        <Button variant="danger" className="w-full">
          신고하기
        </Button>
        <Button variant="text">등록 취소</Button>
      </Section>

      <Section title="토글 행">
        <div className="rounded-12 bg-background-normal flex w-full items-center justify-between px-4 py-3 shadow-[0_0_0_1px_var(--color-fill-alternative)]">
          <div>
            <p className="text-body1 text-label-normal font-semibold">
              동성끼리만 매칭
            </p>
            <p className="text-label2 text-label-alternative">
              기본으로 켜져 있어요
            </p>
          </div>
          <Switch checked={matchToggle} onChange={setMatchToggle} />
        </div>
      </Section>

      <Section title="출발 시간 칩">
        <div className="flex gap-2">
          {[
            { time: "23:00", subLabel: "1명 대기" },
            { time: "23:30", subLabel: "2명 대기" },
            { time: "00:00", subLabel: "0명" },
            { time: "00:30", subLabel: "0명" },
          ].map((chip) => (
            <TimeChip
              key={chip.time}
              {...chip}
              selected={selectedTime === chip.time}
              onClick={() => setSelectedTime(chip.time)}
            />
          ))}
        </div>
      </Section>

      <Section title="필터 칩">
        <div className="flex gap-2">
          <FilterChip label="11.2~11.8" />
          <FilterChip label="금요일" />
          <FilterChip label="23~01시" />
        </div>
      </Section>

      <Section title="입력창">
        <TextField
          label="학교 메일"
          defaultValue="32211234@dankook.ac.kr"
          helperText="강남대 · 경희대 · 단국대 · 명지대 · 한국외대 메일만 돼요"
          trailing={
            <Button
              variant="secondary"
              size="sm"
              className="rounded-12 h-10 shrink-0 px-4"
            >
              다시 보내기
            </Button>
          }
        />
        <TextField
          label="택시 앱 결제 금액"
          defaultValue="30,000원"
          align="right"
          helperText="예상 요금 27,000원의 1.2배인 32,400원까지 입력할 수 있어요"
          inputClassName="text-title3 font-bold"
        />
      </Section>

      <Section title="선택지">
        <SelectionCard
          value={selectedOption}
          onChange={setSelectedOption}
          options={[
            {
              value: "shuttle",
              title: "셔틀 연장 검토",
              description: "학교가 직접 할 수 있어요",
            },
            {
              value: "route",
              title: "용인시에 노선 건의",
              description: "학교 밖 구간이라 시의 판단이 필요해요",
            },
          ]}
        />
      </Section>

      <Section title="권한 행">
        <div className="rounded-12 bg-background-normal w-full px-4 shadow-[0_0_0_1px_var(--color-fill-alternative)]">
          <PermissionRow
            title="위치"
            status="선택"
            description="집까지 마지막 출발 시각을 계산하고, 가장 가까운 출발 거점을 찾을 때 써요. 위치는 저장하지 않아요."
            note="허용하지 않으면 출발지를 직접 골라요."
          />
        </div>
      </Section>

      <Section title="푸시 알림">
        <PushNotificationCard
          title="같은 학교 3명과 매칭됐어요"
          body="23:30 단국대 정문 출발 · 예상 1인 7,900원. 22:49 전에 확정하거나 막차를 타세요."
        />
      </Section>

      <Section title="바텀시트">
        <BottomSheet>
          <div className="flex w-full items-center gap-3">
            <div className="rounded-12 bg-primary-tint text-title3 flex size-11 items-center justify-center">
              📍
            </div>
            <div>
              <p className="text-heading2 text-label-normal font-bold tracking-tight">
                단국대 정문
              </p>
              <p className="text-label2 text-label-neutral">
                가장 가까운 거점 · 택시가 서는 큰길 쪽
              </p>
            </div>
          </div>
          <Button variant="primary" className="w-full">
            다음: 출발 시간 고르기
          </Button>
        </BottomSheet>
      </Section>

      <h1 className="text-title3 text-label-normal pt-6 font-bold">
        정보 표시 · 귀가 결정
      </h1>

      <Section title="배지 / 안내 상자">
        <div className="flex flex-wrap gap-2">
          <Badge variant="positive">단국대 인증 완료</Badge>
          <Badge variant="cautionary">22:49까지 출발해야 해요</Badge>
          <Badge variant="primary">대표</Badge>
          <Badge variant="accent">AI 추정</Badge>
        </div>
        <InfoBox
          variant="positive"
          title="동승하면 약 7,900원"
          description="23:30 출발 · 00:00 도착 · 영통구 방향 2명 대기 중이에요."
        />
        <InfoBox
          variant="negative"
          title="이번엔 매칭되지 않았어요"
          description="23:30 단국대 정문 → 영통구에 같은 조건인 사람이 없었어요."
        />
      </Section>

      <Section title="카드 / 요약 수치 / 장소 행">
        <DefinitionList
          rows={[
            { term: "출발", value: "단국대 정문 · 23:30" },
            { term: "하차 지점", value: "영통2동" },
            { term: "지금 대기", value: "2명", accent: true },
          ]}
        />
        <StatGrid
          stats={[
            { value: "1,284", label: "귀가 기록" },
            { value: "312", label: "매칭 실패" },
            { value: "205", label: "혼자 택시" },
            { value: "418", label: "막차 선택" },
          ]}
        />
        <MetricRow title="동승 등록" subtitle="서비스 귀가 기록" value="86건" />
        <div className="rounded-12 bg-background-normal w-full shadow-[0_0_0_1px_var(--color-fill-alternative)]">
          <PlaceRow
            title="하차 지점 · 영통2동 큰길 쪽"
            subtitle="오늘만 바꾸기"
          />
        </div>
      </Section>

      <Section title="마지막 출발 / 귀가 방법">
        <LastDepartureCard
          time="22:58"
          place="정문 정류장 · 도보 4분"
          note="22:49까지 출발해야 해요"
        />
        <TransportOptionCard
          icon={iconTransportBus}
          title="막차"
          description="22:58 출발 · 23:41 도착"
          price="1,550원"
          priceLabel="1인"
        />
        <TransportOptionCard
          icon={iconTransportCarpool}
          title="동승"
          description="23:30 출발 · 00:00 도착"
          highlight="영통구 방향 2명 대기"
          price="약 7,900원"
          priceLabel="예상 1인 분담"
          selected
        />
        <TransportOptionCard
          icon={iconTransportTaxi}
          title="혼자 택시"
          description="지금 출발 · 23:05 도착"
          price="27,400원"
          priceLabel="1인"
        />
      </Section>

      <Section title="경로 단계 / 홈 동승 카드">
        <RouteSteps
          steps={[
            {
              time: "22:49",
              icon: iconStepWalk,
              title: "정문 정류장까지 걷기",
              description: "도보 4분 · 300m",
            },
            {
              time: "22:58",
              icon: iconStepBus,
              title: "정문 정류장에서 버스 타기",
              description: "마지막 버스 · 31분",
              active: true,
            },
            { time: "23:41", icon: iconStepFlag, title: "영통2동 도착" },
          ]}
        />
        <HomeShareCard
          status="matched"
          statusLabel="매칭됐어요"
          trailingBadge="5분 남음"
          title="같은 학교 3명과 매칭됐어요"
          description="23:30 단국대 정문 출발 · 예상 1인 7,900원"
          footerLabel="22:49까지 확정해 주세요"
        />
      </Section>

      <h1 className="text-title3 text-label-normal pt-6 font-bold">
        매칭 · 채팅 · 정산
      </h1>

      <Section title="요금 비교 / 멤버 / 집결">
        <FareCompare
          shareLabel="예상 1인 분담액"
          sharePrice="7,900원"
          aloneLabel="혼자 택시"
          alonePrice="27,400원"
        />
        <MemberRow
          order={1}
          name="김*연"
          school="단국대"
          gender="여성"
          note="영통1동에서 내려요"
        />
        <GatherInfoCard
          place="단국대 정문 · 23:30"
          note="집결까지 10분 · 3명"
          code="4821"
          caller="대표 이*준님이 택시 앱으로 불러요"
        />
      </Section>

      <Section title="채팅 / 탑승 확인 / 신고">
        <div className="rounded-12 bg-background-normal flex w-full flex-col gap-2 p-3 shadow-[0_0_0_1px_var(--color-fill-alternative)]">
          <ChatBubble
            variant="incoming"
            sender="이*준"
            message="저 도서관에서 나가는 중이에요"
          />
          <ChatBubble
            variant="outgoing"
            message="정문 오른쪽 편의점 앞이에요"
          />
          <ChatBubble variant="system" message="매칭이 확정됐어요 · 3명" />
          <ChatInput />
        </div>
        <RideConfirmButtons />
        <div className="rounded-12 bg-background-normal w-full shadow-[0_0_0_1px_var(--color-fill-alternative)]">
          <ReportReasonButton label="불쾌한 말이나 행동을 했어요" />
        </div>
      </Section>

      <Section title="계좌 / 정산 / 송금">
        <AccountCard
          notice="택시 부르기 전에 이*준님(대표)에게 보내 주세요"
          amount="9,500원"
          amountNote="내 예상 분담액 7,900원의 1.2배"
          account="KB국민은행 943202-01-482917"
          accountNote="예금주 이*준"
        />
        <SettleTable
          rows={[
            {
              name: "김*연",
              note: "8km 구간",
              confirmed: "5,000원",
              received: "5,400원",
              refund: "400원",
            },
            {
              name: "나",
              note: "12km 구간",
              confirmed: "8,750원",
              received: "9,500원",
              refund: "750원",
            },
          ]}
        />
        <PaymentReceiptCard
          title="결제 화면을 첨부했어요"
          description="멤버들이 금액을 확인할 수 있게 같이 보여 줘요"
        />
        <TransferRow
          name="김*연"
          account="신한은행 110-482-•••331"
          amount="400원"
          received
        />
      </Section>

      <h1 className="text-title3 text-label-normal pt-6 font-bold">
        지도 · 수요
      </h1>

      <Section title="노선 후보 / 지도 / 리포트">
        <RouteCandidateCard
          rank={1}
          title="단국대 정문 → 처인구"
          subtitle="기존 N1 하루 1회"
          demand="주 142회"
          progress={72}
        />
        <RouteCandidateCard
          rank={3}
          title="단국대 정문 → 영통구"
          subtitle="내 귀가 4회 반영"
          demand="주 88회"
          progress={45}
          highlighted
        />
        <MapPlaceholder
          title="수요 지도"
          legend={["심야 귀가 흐름 · 굵을수록 많음", "내 귀가가 반영된 구간"]}
        />
        <ReportSummaryCard
          title="용인 심야 귀가 수요 리포트"
          meta="2026년 11월 1주 (11.2~11.8) · 금요일 23~01시"
          stats={[
            { value: "1,284건", label: "귀가 기록" },
            { value: "312건", label: "매칭 실패" },
            { value: "4개 구간", label: "노선 후보" },
          ]}
          rows={[
            {
              rank: 1,
              section: "단국대 정문 → 처인구",
              demand: "주 142회",
              supply: "N1 하루 1회",
              action: "셔틀 연장 검토",
            },
            {
              rank: 2,
              section: "죽전역 → 처인구",
              demand: "주 104회",
              supply: "없음",
              action: "시 노선 건의",
            },
          ]}
          note="매칭 실패와 혼자 택시 선택이 많은 구간일수록 동승으로 풀리지 않는 귀가 수요가 커요."
        />
      </Section>
    </div>
  );
}

export default App;
