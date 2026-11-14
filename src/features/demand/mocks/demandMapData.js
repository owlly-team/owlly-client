const GATE = "단국대학교 죽전캠퍼스 정문";

export function getMockDemandMap(day, time) {
  if (day !== "금요일" || time !== "23~01시")
    return {
      routes: [],
      message: {
        title: "이 시간대에는 아직 노선 후보가 없어요",
        description: "다른 요일이나 시간대의 귀가 수요를 확인해 보세요.",
      },
    };
  return {
    routes: [
      {
        id: "dankook-cheoin",
        rank: 1,
        title: "단국대 정문 → 처인구",
        subtitle: "금 23~01시",
        demand: "주 142회",
        progress: 100,
        weeklyDemand: 142,
        originQuery: GATE,
        destinationQuery: "경기도 용인시 처인구",
        destinationLabel: "처인구",
        isMine: false,
      },
      {
        id: "dankook-yeongtong",
        rank: 3,
        title: "단국대 정문 → 영통구",
        subtitle: "내 귀가 4회 반영",
        demand: "주 88회",
        progress: 62,
        weeklyDemand: 88,
        originQuery: GATE,
        destinationQuery: "경기도 수원시 영통구",
        destinationLabel: "영통구",
        isMine: true,
      },
    ],
    message: {
      title: "내 구간이 노선 후보 3위예요",
      description:
        "단국대 정문 → 영통구 · 내 귀가 4회 반영. 학교와 용인시에 제안 중이에요.",
    },
  };
}
