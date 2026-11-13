export const ACTION_OPTIONS = [
  {
    value: "shuttle",
    title: "셔틀 연장 검토",
    description: "학교가 직접 할 수 있어요",
  },
  {
    value: "city",
    title: "용인시에 노선 건의",
    description: "학교 밖 구간이라 시의 판단이 필요해요",
  },
];

export const routeCandidates = [
  {
    id: "dangguk-cheoin",
    rank: 1,
    title: "단국대 정문 → 처인구",
    subtitle: "기존 N1 하루 1회",
    demand: "주 142회",
    progress: 72,
    meta: "금요일 23~01시 · 11.2~11.8",
    stats: [
      { value: "주 142회", label: "AI 추정 수요" },
      { value: "하루 1회", label: "기존 N1" },
      { value: "36%", label: "매칭 실패" },
    ],
    metrics: [
      { title: "동승 등록", subtitle: "서비스 귀가 기록", value: "86건" },
      { title: "매칭 실패", subtitle: "서비스 귀가 기록", value: "31건" },
      { title: "혼자 택시 선택", subtitle: "서비스 귀가 기록", value: "25건" },
      {
        title: "심야 버스 이용객",
        subtitle: "경기도 시군별 버스 이용객수",
        value: "일 47명",
      },
      {
        title: "수지구 → 처인구 23~01시 이동",
        subtitle: "수도권 생활이동",
        value: "일 1,930명",
      },
      {
        title: "심야 택시 운행",
        subtitle: "용인앱택시 운행현황",
        value: "일 312회",
      },
    ],
    action: "shuttle",
    supply: "N1 하루 1회",
  },
  {
    id: "jukjeon-cheoin",
    rank: 2,
    title: "죽전역 → 처인구",
    subtitle: "기존 심야 노선 없음",
    demand: "주 104회",
    progress: 52,
    meta: "금요일 23~01시 · 11.2~11.8",
    stats: [
      { value: "주 104회", label: "AI 추정 수요" },
      { value: "없음", label: "기존 공급" },
      { value: "29%", label: "매칭 실패" },
    ],
    metrics: [
      { title: "동승 등록", subtitle: "서비스 귀가 기록", value: "64건" },
      { title: "매칭 실패", subtitle: "서비스 귀가 기록", value: "19건" },
      { title: "혼자 택시 선택", subtitle: "서비스 귀가 기록", value: "18건" },
      {
        title: "심야 버스 이용객",
        subtitle: "경기도 시군별 버스 이용객수",
        value: "일 22명",
      },
      {
        title: "죽전역 → 처인구 23~01시 이동",
        subtitle: "수도권 생활이동",
        value: "일 1,210명",
      },
    ],
    action: "city",
    supply: "없음",
  },
  {
    id: "dangguk-yeongtong",
    rank: 3,
    title: "단국대 정문 → 영통구",
    subtitle: "기존 심야 노선 없음",
    demand: "주 88회",
    progress: 45,
    meta: "금요일 23~01시 · 11.2~11.8",
    stats: [
      { value: "주 88회", label: "AI 추정 수요" },
      { value: "없음", label: "기존 공급" },
      { value: "24%", label: "매칭 실패" },
    ],
    metrics: [
      { title: "동승 등록", subtitle: "서비스 귀가 기록", value: "52건" },
      { title: "매칭 실패", subtitle: "서비스 귀가 기록", value: "12건" },
      { title: "혼자 택시 선택", subtitle: "서비스 귀가 기록", value: "14건" },
      {
        title: "수원 영통구 이동",
        subtitle: "수도권 생활이동",
        value: "일 980명",
      },
    ],
    action: "city",
    supply: "없음",
  },
  {
    id: "gangnam-giheung",
    rank: 4,
    title: "강남역 → 기흥구",
    subtitle: "1101N 평일 2회",
    demand: "주 79회",
    progress: 40,
    meta: "금요일 23~01시 · 11.2~11.8",
    stats: [
      { value: "주 79회", label: "AI 추정 수요" },
      { value: "평일 2회", label: "1101N" },
      { value: "21%", label: "매칭 실패" },
    ],
    metrics: [
      { title: "동승 등록", subtitle: "서비스 귀가 기록", value: "41건" },
      { title: "매칭 실패", subtitle: "서비스 귀가 기록", value: "9건" },
      { title: "혼자 택시 선택", subtitle: "서비스 귀가 기록", value: "11건" },
    ],
    action: "city",
    supply: "1101N 평일 2회",
  },
];

export const reportSummary = {
  title: "용인 심야 귀가 수요 리포트",
  school: "단국대",
  period: "11.2~11.8",
  meta: "2026년 11월 1주 (11.2~11.8) · 단국대 학생지원팀 · 금요일 23~01시",
  stats: [
    { value: "1,284건", label: "귀가 기록" },
    { value: "312건", label: "매칭 실패" },
    { value: "4개 구간", label: "노선 후보" },
  ],
  note: "매칭 실패와 혼자 택시 선택이 많은 구간일수록 동승으로 풀리지 않는 귀가 수요가 커요. 1위 구간은 학교 셔틀로 먼저 대응하고, 2~4위는 심야 노선 신설을 건의해요.",
  source:
    "수요 추정: 서비스 귀가 기록(동승 등록 · 탑승 · 매칭 실패 · 막차 선택 · 혼자 택시 선택) + 경기도 시군별 버스 이용객수, 수도권 생활이동, 용인앱택시 운행현황, 기존 심야 노선. 등록 5건 미만 구간 제외. 개인 위치와 채팅 내용은 쓰지 않았어요.",
};
