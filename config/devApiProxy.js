// 브라우저에는 localhost 쿠키로 전달하고 실제 API 서버로 요청을 중계한다.
// Vite 개발 서버에서만 사용하는 설정이며 운영 쿠키에는 적용하지 않는다.
export function createDevApiProxy(target) {
  if (!/^https?:\/\//.test(target ?? '')) return undefined;
  return {
    '/api': {
      target,
      changeOrigin: true,
      cookieDomainRewrite: '',
      configure(proxy) {
        proxy.on('proxyRes', (response) => {
          const cookies = response.headers['set-cookie'];
          if (!cookies) return;
          // localhost HTTP에서도 서버가 발급한 세션을 보관할 수 있게 한다.
          response.headers['set-cookie'] = cookies.map((cookie) =>
            cookie.replace(/;\s*Secure\b/gi, ''),
          );
        });
      },
    },
  };
}
