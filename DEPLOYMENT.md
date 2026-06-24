# GitHub 배포 가이드

이 프로젝트는 Next.js API Route에서 법제처 API를 호출하고 `LAW_API_KEY`를 서버 환경변수로 사용합니다. 그래서 GitHub Pages 같은 정적 호스팅에는 맞지 않습니다.

권장 방식은 GitHub 저장소를 Vercel, Render, Railway 같은 Node.js 지원 플랫폼에 연결해 배포하는 것입니다.

## 1. GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial HR law case search app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

`.env.local`은 `.gitignore`에 포함되어 있으므로 커밋하지 않습니다.

## 2. Vercel 배포

1. Vercel에서 `Add New Project` 선택
2. GitHub 저장소 import
3. Framework Preset은 `Next.js`
4. Environment Variables에 추가

```txt
LAW_API_KEY=발급받은_OC_값
```

5. Deploy 실행

법제처 API가 서버 IP/도메인 등록을 요구하는 경우, 배포 플랫폼의 outbound IP 또는 도메인 등록 조건을 법제처 설정에서 확인해야 합니다.

## 3. Render 배포

Render Web Service 기준:

- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`
- Environment: `Node`
- Environment Variable: `LAW_API_KEY`

## 4. Docker 배포

Docker 지원 플랫폼에서는 아래처럼 실행할 수 있습니다.

```bash
docker build -t hr-law-case-search .
docker run -p 3000:3000 -e LAW_API_KEY=발급받은_OC_값 hr-law-case-search
```

## 5. GitHub Actions

`.github/workflows/ci.yml`이 포함되어 있어 push 또는 pull request마다 lint/build를 검증합니다.

GitHub 저장소의 `Settings > Secrets and variables > Actions`에 아래 secret을 추가하세요.

```txt
LAW_API_KEY
```
