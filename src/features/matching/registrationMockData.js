export function createMockRegistration(slot) {
  return {
    rideRequest: {
      id: "301", journeyId: "201", pickupPointId: "11", districtId: "21",
      destinationDongId: "31", departureAt: slot.departureAt, sameGenderOnly: true,
      status: "WAITING", resultDueAt: null, partyId: null,
      createdAt: "2026-11-09T22:30:00+09:00",
    },
    display: {
      pickupPoint: { id: "11", name: "단국대 정문" },
      destinationDong: { id: "31", name: "영통2동" },
    },
    matchingSlot: slot,
  };
}
