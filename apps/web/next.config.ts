import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    basePath: '/sfumonai', // 모든 라우팅과 _next 정적 자산의 기준 경로 설정
    trailingSlash: true, // /sfumonai/ 형태로 표준화하여 308 리다이렉트 원천 차단
};

export default nextConfig;
