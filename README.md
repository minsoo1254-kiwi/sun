# 노동법 판례·행정해석 통합 검색 웹앱

법제처 국가법령정보 공동활용 API로 노동법 판례를 검색하고, 로컬 행정해석 데이터와 함께 통합 검색하는 사내 HR 업무도구입니다.

## 프로젝트 구조

이 프로젝트는 **Next.js App Router + TypeScript + Tailwind CSS** 구조입니다. Vite, React 단독 SPA, Express 서버 구조가 아닙니다.

```txt
app/                         Next.js App Router 페이지와 API Route
app/api/cases/*              법제처 판례 검색/상세 API 프록시
app/api/admin-interpretations/* 행정해석 검색/관리 API
components/                  검색 화면, 관리자 화면 UI
lib/                         서버 API, 저장소, 보안, 포맷 유틸
types/                       공통 TypeScript 타입
data/                        행정해석 JSON 데이터
db/migrations/               Supabase/PostgreSQL 전환용 SQL 예시
scripts/                     PDF 행정해석 데이터 적재 스크립트
docs/                        보안 점검 문서
```

## 로컬 실행

```bash
npm install
npm run dev
```

Windows PowerShell에서는 필요하면 아래처럼 실행합니다.

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 빌드 설정

Vercel은 `vercel.json`과 `package.json`을 기준으로 다음 명령을 사용합니다.

```bash
npm ci
npm run build
```

`package.json` 주요 스크립트:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint ."
}
```

현재 빌드 대상은 Next.js 서버리스 라우트가 포함된 앱입니다. GitHub Pages 같은 정적 호스팅에는 맞지 않습니다.

## 환경변수

`.env.example` 또는 `.env.local.example`을 참고해 로컬에서는 `.env.local`을 만듭니다.

```txt
LAW_API_KEY=
LAW_API_OC=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
DATABASE_URL=
ALLOWED_ORIGINS=
```

`LAW_API_KEY`와 `LAW_API_OC`에는 법제처 API의 `OC` 인증값만 넣습니다. `https://www.law.go.kr/...` 같은 전체 URL을 넣으면 안 됩니다.

`LAW_API_KEY`, `LAW_API_OC`, `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`은 서버 전용 값입니다. `NEXT_PUBLIC_` 접두어를 붙이지 마세요.

## Vercel 배포

1. GitHub에 프로젝트를 push합니다.
2. Vercel에서 `Add New Project`를 선택하고 GitHub 저장소를 import합니다.
3. Framework Preset이 `Next.js`인지 확인합니다.
4. Root Directory는 이 앱 폴더인 `hr-law-case-search`로 지정합니다. 저장소 루트가 이 폴더 자체라면 비워둡니다.
5. Build Command는 `npm run build`, Install Command는 `npm ci`로 둡니다.
6. Environment Variables에 아래 값을 등록합니다.
7. Deploy를 실행합니다.

### Vercel 환경변수 목록

필수:

```txt
LAW_API_KEY=법제처_OC_인증값
ADMIN_PASSWORD=관리자_로그인_비밀번호
ADMIN_SESSION_SECRET=32자_이상의_랜덤_세션_서명값
```

권장 또는 선택:

```txt
LAW_API_OC=법제처_OC_인증값
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-domain.example
DATABASE_URL=postgresql://...
```

`LAW_API_KEY`와 `LAW_API_OC`를 둘 다 넣으면 현재 코드는 `LAW_API_KEY`를 우선 사용합니다.

## Supabase / DATABASE_URL

현재 버전은 DB 없이 시작하도록 설계되어 있으며, 행정해석 검색은 `data/admin-interpretations.json`을 읽습니다. 이 방식은 Vercel에서 검색/조회에는 사용할 수 있지만, 서버리스 환경 특성상 관리자 화면에서 등록·수정·삭제·CSV 업로드로 파일을 영구 저장하는 용도에는 맞지 않습니다.

운영에서 행정해석 데이터를 계속 수정해야 한다면 Supabase PostgreSQL을 연결하고 `DATABASE_URL`을 기준으로 저장소 구현을 교체하세요. 스키마 예시는 아래 파일에 있습니다.

```txt
db/migrations/001_create_admin_interpretations.sql
```

Supabase 전환 시에는 `lib/admin-interpretations-store.ts`의 읽기/쓰기 함수가 `DATABASE_URL`을 사용하는 PostgreSQL 저장소를 바라보도록 바꾸면 됩니다.

## 배포 전 체크리스트

- `npm run lint`가 성공하는지 확인
- `npm run build`가 성공하는지 확인
- `.gitignore`에 `.env`, `.env.local`, `node_modules`, `.next`, `dist`, `build`가 포함되어 있는지 확인
- `.env.local`이 Git에 포함되지 않았는지 확인
- 코드에 실제 `LAW_API_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`이 하드코딩되어 있지 않은지 확인
- 비밀값에 `NEXT_PUBLIC_` 접두어가 붙어 있지 않은지 확인
- Vercel Project Root가 `hr-law-case-search`인지 확인
- 법제처 API가 도메인/IP 등록을 요구하는 경우 Vercel 배포 도메인 또는 법제처 인증 조건을 확인

## 배포 후 테스트

- `/` 접속 후 검색어 없이 검색 시 `검색어를 입력해주세요.`가 표시되는지 확인
- 판례 검색어 예: `해고`, `연차`, `포괄임금`
- 결과 카드에서 `원문 보기` 또는 상세 버튼이 정상 동작하는지 확인
- `/cases/[id]` 상세 페이지에서 판시사항, 판결요지, 판례내용이 표시되는지 확인
- 행정해석 검색어 예: `연차`, `파견`, `퇴직금`
- 행정해석 결과에서 `상세내용 보기` 버튼으로 질의 내용과 회시 내용이 표시되는지 확인
- `/admin`에서 관리자 로그인 성공/실패가 정상 처리되는지 확인
- 잘못된 관리자 비밀번호로 접근했을 때 관리 API가 401을 반환하는지 확인

## 배포 오류 확인 위치

Vercel에서 오류가 나면 아래 순서로 확인합니다.

1. Vercel Project > Deployments > 실패한 배포 > Build Logs
2. Vercel Project > Functions > API Route별 Runtime Logs
3. Vercel Project > Settings > Environment Variables
4. 브라우저 개발자도구 > Network 탭의 API 응답 코드와 메시지

자주 발생하는 문제:

- `LAW_API_KEY 또는 LAW_API_OC가 설정되지 않았습니다.`: Vercel 환경변수 누락
- `LAW_API_KEY에는 API URL이 아니라...`: 환경변수에 전체 URL을 넣은 경우
- `관리자 인증이 필요합니다.`: `/admin` 로그인 세션이 없거나 만료된 경우
- `허용되지 않은 요청 출처입니다.`: `ALLOWED_ORIGINS`에 운영 도메인이 빠진 경우
- 법제처 API 호출 실패: 법제처 인증값, API 이용 승인 상태, Vercel outbound 접근 조건 확인
- 행정해석 수정 내용이 유지되지 않음: Vercel 서버리스 파일시스템 한계이므로 Supabase 전환 필요

## 보안상 주의사항

- `.env`, `.env.local`, Vercel 환경변수 값은 GitHub에 커밋하지 않습니다.
- 서버 비밀값에는 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- `ADMIN_PASSWORD`와 `ADMIN_SESSION_SECRET`은 서로 다른 강한 값으로 설정합니다.
- 운영에서는 `ALLOWED_ORIGINS`에 실제 서비스 도메인만 등록합니다.
- CSV 업로드는 관리자만 허용하며, 외부에서 받은 CSV는 업로드 전 출처를 확인합니다.
- 이 서비스의 요약 및 체크포인트는 HR 실무 참고용입니다. 징계, 해고, 임금, 근로시간, 퇴직정산 판단은 반드시 노무사 또는 법률전문가 검토가 필요합니다.
