let sdkPromise;

export function loadKakaoMaps() {
  if (window.kakao?.maps?.Map && window.kakao.maps.services) return Promise.resolve(window.kakao.maps);
  if (sdkPromise) return sdkPromise;
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  if (!key) return Promise.reject(new Error("카카오맵 키가 설정되지 않았어요."));
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("지도를 불러오지 못했어요. 연결과 카카오맵 설정을 확인해 주세요."));
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.kakao?.maps?.load) return fail();
      window.kakao.maps.load(() => {
        window.clearTimeout(timer);
        resolve(window.kakao.maps);
      });
    };
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}
