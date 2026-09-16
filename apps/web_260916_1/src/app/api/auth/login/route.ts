import { NextResponse } from 'next/server';
import { AuthMode, LoginCredentials, LoginResult } from '@/types/auth';

export async function POST(request: Request) {
  try {
    // 1. 요청 본문(아이디, 암호) 파싱 - 공통 입력 수신
    const body: LoginCredentials = await request.json();
    const { id, password } = body;

    if (!id || id.trim() === '') {
      return NextResponse.json<LoginResult>(
        { success: false, message: '아이디를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 2. .env.local에서 AUTH_MODE 환경변수 읽기 (기본값: OPEN)
    const rawAuthMode = process.env.AUTH_MODE || 'OPEN';
    const authMode = rawAuthMode.trim().toUpperCase() as AuthMode;

    // 3. AUTH_MODE별 로그인 처리 분기
    switch (authMode) {
      case 'OPEN': {
        // [OPEN 모드]
        // "oasis"라는 아이디만 맞으면, 암호는 확인하지 않고 로그인 OK 처리
        if (id.trim().toLowerCase() === 'oasis') {
          return NextResponse.json<LoginResult>({
            success: true,
            user: {
              id: 'oasis',
              name: 'Oasis Administrator',
              authMode: 'OPEN',
              role: 'ADMIN',
            },
            message: '로그인에 성공하였습니다. (OPEN 모드)',
          });
        }

        return NextResponse.json<LoginResult>(
          {
            success: false,
            message: '[OPEN 모드] 로그인에 실패했습니다.',
          },
          { status: 401 }
        );
      }

      case 'LOCAL': {
        /*
         * [TODO - LOCAL 모드 추후 구현 안내]
         * 1) 공통 입력값(id, password) 수신 완료
         * 2) 자체 데이터베이스(MySQL 등)의 사용자 테이블(users)에서 id 조회
         * 3) bcrypt / argon2 등의 해시 함수를 통해 암호 일치 여부 검증
         * 4) 세션 토큰(JWT 등) 발급 및 쿠키/응답 반환
         *
         * [코드 추가 예시]
         * const user = await db.findUserById(id);
         * if (!user || !await verifyPassword(password, user.passwordHash)) {
         *   return NextResponse.json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
         * }
         * return NextResponse.json({ success: true, user: { id: user.id, ... } });
         */
        return NextResponse.json<LoginResult>(
          {
            success: false,
            message: 'LOCAL 인증 모드는 현재 백엔드 연동 준비 중입니다. (추후 구현 예정)',
          },
          { status: 501 }
        );
      }

      case 'KEYCLOAK': {
        /*
         * [TODO - KEYCLOAK 모드 추후 구현 안내]
         * 1) 공통 입력값(id, password) 수신 완료
         * 2) Keycloak OpenID Connect(OIDC) Token Endpoint(Direct Access Grants / Resource Owner Password Credentials Flow)로 토큰 요청
         *    POST ${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token
         *    client_id, client_secret, username=${id}, password=${password}, grant_type=password
         * 3) 응답받은 access_token, refresh_token 및 ID 토큰 파싱
         * 4) 사용자 프로필 정보 동기화 및 세션 수립
         *
         * [코드 추가 예시]
         * const tokenResponse = await fetchKeycloakToken(id, password);
         * if (!tokenResponse.ok) {
         *   return NextResponse.json({ success: false, message: 'Keycloak 인증에 실패하였습니다.' }, { status: 401 });
         * }
         */
        return NextResponse.json<LoginResult>(
          {
            success: false,
            message: 'KEYCLOAK 인증 모드는 현재 연동 준비 중입니다. (추후 구현 예정)',
          },
          { status: 501 }
        );
      }

      case 'SSO': {
        /*
         * [TODO - SSO 모드 추후 구현 안내]
         * 1) 공통 입력값(id, password) 또는 SAML / OIDC IdP 리다이렉트 연동
         * 2) 사내 SSO IdP 인증 서버와 통신하여 인증 확인 및 SAML Assertion/JWT 토큰 검증
         * 3) 사용자 세션 생성 및 응답
         */
        return NextResponse.json<LoginResult>(
          {
            success: false,
            message: 'SSO 인증 모드는 현재 연동 준비 중입니다. (추후 구현 예정)',
          },
          { status: 501 }
        );
      }

      default: {
        return NextResponse.json<LoginResult>(
          {
            success: false,
            message: `지원하지 않는 AUTH_MODE입니다: ${authMode}`,
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    return NextResponse.json<LoginResult>(
      {
        success: false,
        message: `로그인 처리 중 오류가 발생했습니다: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
