# 아란야 호스트 관리 버전

현재 운영 저장소의 index.html을 보존하고 빌드 시 문구 10개 언어와 사진을 분리합니다. 공개 안내는 Worker가 D1의 공개본을 읽어 기존 화면으로 렌더링합니다. 초안 저장은 공개본에 영향을 주지 않습니다.

## 포함 기능

- `/admin`: 한국어 중심 탭별 편집, 검색, 사진 업로드, 기존 번역 수동 보정
- 호스트 로그인 후 기존 안내 메뉴에 `내용 관리` 링크 표시
- 초안 저장 → 변경 항목 자동 번역 → 언어별 미리보기 → 확인 후 공개
- 번역 실패/한도 초과 시 해당 항목을 미완료로 유지하고 공개 차단; 성공한 이전 항목은 저장되어 재개 가능
- 서버 서명 세션, HttpOnly 쿠키, 동일 출처 요청 검사, 로그인 시도 제한, 동시 수정 충돌 감지
- `dist` 파일만 배포하여 `.git` 노출 방지

## Cloudflare에서 필요한 설정

이 프로젝트는 아직 운영 계정에 배포하지 않았습니다. 아래 리소스와 비밀값이 필요합니다. 비밀값은 GitHub나 채팅에 올리지 마세요.

1. **Storage & databases → D1**에서 `aranya-content` DB 생성. `wrangler.jsonc`의 `database_id`를 해당 ID로 교체합니다.
2. **R2**에서 `aranya-images` 버킷 생성. 결제 정보/약관이 표시된다면 가입 조건을 직접 확인하세요. 자동으로 유료 서비스를 신청하지 않습니다.
3. Worker 바인딩: D1=`DB`, R2=`IMAGES`, Workers AI=`AI`. 설정 파일에도 선언되어 있습니다.
4. Worker **Settings → Variables and Secrets**에 Secret으로 `HOST_PASSWORD`(새 호스트 비밀번호), `SESSION_SECRET`(충분히 긴 무작위 값)을 설정합니다. 예전 HTML 비밀번호 검증은 이 버전에서 사용하지 않습니다.
5. 로컬에서 `npm install` 후 `npx wrangler d1 migrations apply aranya-content --remote`로 DB 테이블을 만듭니다.
6. GitHub에 이 변경을 반영합니다. 기존 배포 명령 `npx wrangler deploy`는 설정의 build 명령으로 공개 파일을 생성합니다. 또는 `npm run deploy`를 사용합니다.
7. `/admin`에서 새 비밀번호로 로그인합니다. 한국어 한 문장을 수정 → 초안 저장 → 자동 번역 → 미리보기 → 공개를 실제 계정에서 확인합니다.

## 비용과 번역

Workers AI의 `@cf/meta/m2m100-1.2b` 번역 모델을 사용합니다. 바뀐 항목만 번역하며 결과는 D1에 저장합니다. 모델 연결 자체의 자동 번역은 실서비스 계정에서 별도 확인해야 합니다. 무료 제공량과 이용 가능 모델은 계정/시점에 따라 확인하세요. 유료 플랜에서는 한도 초과 비용이 발생할 수 있습니다. 게스트 열람에는 AI를 호출하지 않습니다.

원문 안의 숫자, URL, `{변수}`, HTML 태그는 보존하고 그 사이 문구를 번역합니다. 고유명사·안전 안내는 자동 번역 후 검토가 필요합니다. 한 항목당 자동 번역은 한국어 2,000자까지입니다. 사진은 JPG/PNG/WebP, 2MB 이하입니다. 항목 추가·삭제와 사진 자동 번역/OCR은 포함하지 않습니다.

## 로컬 개발

`.dev.vars`에 개발용 `HOST_PASSWORD`, `SESSION_SECRET`을 작성합니다(저장소 제외).
`npm run build`, `npx wrangler d1 migrations apply aranya-content --local`, `npm run dev` 순서입니다.
로컬 AI도 원격 추론 연결이 필요합니다. 자동 번역 테스트를 가짜 성공 결과로 대체하여 운영하지 마세요.

`npm test`는 번역 완료 위조 방지, HTML/이미지 검증, 기존 만료 함수·스크립트 보존, 배포 폴더 구성을 검사합니다.

## 유지 관리

배포 이후 내용의 기준은 D1입니다. GitHub index.html 수정만으로 기존 DB 내용이 덮어써지지 않습니다. 초기 데이터는 DB가 비어 있을 때만 적용됩니다. 기존 D1을 지우지 말고 백업/마이그레이션을 사용하세요. 사용하지 않는 업로드 사진은 자동 삭제하지 않습니다. 호스트 비밀번호를 바꿀 때 SESSION_SECRET도 바꾸면 기존 세션을 만료시킬 수 있습니다.

공식 문서: https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/ · https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://developers.cloudflare.com/d1/ · https://developers.cloudflare.com/r2/
