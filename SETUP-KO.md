# 아란야 호스트 관리 버전

현재 운영 저장소의 index.html을 보존하고 빌드 시 문구 10개 언어와 사진을 분리합니다. 공개 안내는 Worker가 D1의 공개본을 읽어 기존 화면으로 렌더링합니다. 초안 저장은 공개본에 영향을 주지 않습니다.

## 포함 기능

- `/admin`: 한국어 중심 탭별 편집, 검색, 사진 업로드, 기존 번역 수동 보정
- 호스트 로그인 후 기존 안내 메뉴에 `내용 관리` 링크 표시
- 초안 저장 → 변경 항목 자동 번역 → 언어별 미리보기 → 확인 후 공개
- 편집 미리보기는 최초 진입 시에만 iframe을 로드합니다. 이후 `/api/preview`의 인증된 읽기 전용 스냅샷으로 기존 항목 DOM을 갱신하여 탭·스크롤·상세보기·선택 항목을 유지합니다. 선택한 항목 자체를 삭제하면 해당 선택만 해제됩니다.
- 번역 실패/한도 초과 시 해당 항목을 미완료로 유지하고 공개 차단; 성공한 이전 항목은 저장되어 재개 가능
- 서버 서명 세션, HttpOnly 쿠키, 동일 출처 요청 검사, 로그인 시도 제한, 동시 수정 충돌 감지
- `dist` 파일만 배포하여 `.git` 노출 방지

## Cloudflare에서 필요한 설정

운영 Worker는 `infomation-rounge`입니다. 새 계정에 설치할 때는 아래 리소스와 비밀값이 필요합니다. 비밀값은 GitHub나 채팅에 올리지 마세요.

1. **Storage & databases → D1**에서 `aranya-content` DB 생성. `wrangler.jsonc`의 `database_id`를 해당 ID로 교체합니다.
2. **R2**에서 `aranya-images` 버킷 생성. 결제 정보/약관이 표시된다면 가입 조건을 직접 확인하세요. 자동으로 유료 서비스를 신청하지 않습니다.
3. Worker 바인딩: D1=`DB`, R2=`IMAGES`, Workers AI=`AI`. 설정 파일에도 선언되어 있습니다.
4. Worker **Settings → Variables and Secrets**에 Secret으로 `HOST_PASSWORD`(새 호스트 비밀번호), `SESSION_SECRET`(충분히 긴 무작위 값)을 설정합니다. 예전 HTML 비밀번호 검증은 이 버전에서 사용하지 않습니다.
5. 로컬에서 `npm install` 후 `npx wrangler d1 migrations apply aranya-content --remote`로 DB 테이블을 만듭니다.
6. GitHub에 이 변경을 반영합니다. 기존 배포 명령 `npx wrangler deploy`는 설정의 build 명령으로 공개 파일을 생성합니다. 또는 `npm run deploy`를 사용합니다.
7. `/admin`에서 새 비밀번호로 로그인합니다. 한국어 한 문장을 수정 → 초안 저장 → 자동 번역 → 미리보기 → 공개를 실제 계정에서 확인합니다.

## 비용과 번역

Workers AI의 `@cf/meta/m2m100-1.2b` 번역 모델을 사용합니다. 바뀐 항목만 번역하며 결과는 D1에 저장합니다. 모델 연결 자체의 자동 번역은 실서비스 계정에서 별도 확인해야 합니다. 무료 제공량과 이용 가능 모델은 계정/시점에 따라 확인하세요. 유료 플랜에서는 한도 초과 비용이 발생할 수 있습니다. 게스트 열람에는 AI를 호출하지 않습니다.

원문 안의 숫자, URL, `{변수}`, HTML 태그는 보존하고 그 사이 문구를 번역합니다. 고유명사·안전 안내는 자동 번역 후 검토가 필요합니다. 한 항목당 자동 번역은 한국어 2,000자까지입니다. 사진은 JPG/PNG/WebP, 25MB 이하입니다. 목록 항목 추가·삭제·순서 변경과 항목별 사진 추가·교체·제거를 지원합니다. 사진 자동 번역/OCR은 포함하지 않습니다.

## 로컬 개발

`.dev.vars`에 개발용 `HOST_PASSWORD`, `SESSION_SECRET`을 작성합니다(저장소 제외).
`npm run build`, `npx wrangler d1 migrations apply aranya-content --local`, `npm run dev` 순서입니다.
로컬 AI도 원격 추론 연결이 필요합니다. 자동 번역 테스트를 가짜 성공 결과로 대체하여 운영하지 마세요.

`npm test`는 번역 완료 위조 방지, HTML/이미지 검증, 기존 만료 함수·스크립트 보존, 배포 폴더 구성을 검사합니다.

`scripts/preview-state-review.cjs`는 로컬 검증 서버와 Chrome에서 추가·삭제·순서 변경·사진 업로드·저장·배지 변경 후 같은 iframe 문서와 편집 선택, 스크롤, 상세보기 DOM이 유지되는지 검사합니다. `scripts/management-review.cjs`의 번역 검증에는 로컬 AI 스텁만 사용하며 운영 AI를 호출하거나 운영 초안을 공개하지 않습니다.

## 유지 관리

배포 이후 내용의 기준은 D1입니다. GitHub index.html 수정만으로 기존 DB 내용이 덮어써지지 않습니다. 초기 데이터는 DB가 비어 있을 때만 적용됩니다. 기존 D1을 지우지 말고 백업/마이그레이션을 사용하세요. 사용하지 않는 업로드 사진은 자동 삭제하지 않습니다. 호스트 비밀번호를 바꿀 때 SESSION_SECRET도 바꾸면 기존 세션을 만료시킬 수 있습니다.

공식 문서: https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/ · https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://developers.cloudflare.com/d1/ · https://developers.cloudflare.com/r2/

## 목록과 사진 관리

호스트 로그인 후 **내용 관리**로 이동하면 동일한 서버 로그인 세션을 사용합니다. 로그인 상태 확인 중에는 비밀번호 화면을 표시하지 않습니다.

- 각 탭 오른쪽 목록에서 **항목 추가**를 누르면 해당 영역의 기본 디자인으로 빈 항목이 바로 만들어집니다. 제목·내용·사진을 입력하면 됩니다. 기존 항목을 모두 삭제해도 새 항목을 추가할 수 있습니다.
- 목록의 **↑ / ↓ / 삭제**로 표시 순서와 항목을 관리합니다. 삭제하거나 이동해도 다른 항목의 번역·사진은 유지됩니다.
- 항목을 선택하면 세부 문구와 **사진 추가** 버튼이 표시됩니다. 기기 사용 순서·주의사항·추천 가게 등 세부 목록도 추가·삭제·이동할 수 있습니다.
- 대표 사진은 **사진 제거**, 추가 사진은 **이 사진 칸 삭제**로 제거합니다. 운영 공개본이 사용 중일 수 있으므로 원본 R2 파일은 즉시 물리 삭제하지 않습니다.
- 목록 작업은 초안에 저장됩니다. 문구를 변경했다면 번역 확인을 마친 후 **공개하기**를 눌러야 손님 화면에 반영됩니다.
- 목록당 최대 80개, 항목당 추가 사진 최대 12장을 지원합니다. 현재 탭과 화면 디자인을 유지하며, 새로운 탭이나 자유로운 화면 배치를 만드는 기능은 포함하지 않습니다.

### 데이터 호환과 검증

기존 `content_state` 테이블을 유지합니다. 읽을 때 기존 540개 필드와 운영 편집 값을 보존한 채 목록 구조를 구성합니다. `__lists`에는 항목의 안정적인 ID와 표시 순서를, `__photos`에는 추가 사진의 ID를 저장합니다. 별도 운영 DB 초기화나 테이블 삭제는 필요하지 않습니다. 새 항목은 UUID를 사용하며 배열 위치를 바꾸어도 필드 ID가 바뀌지 않습니다.

`npm run build && npm test`로 회귀 검사를 실행합니다. `node scripts/integration-test.mjs`는 독립적인 로컬 D1/R2에서 인증·충돌·초안 격리와 목록 변경을 검사합니다.

브라우저 검증은 `node scripts/review-server.mjs --test-ai`를 실행한 후 `PLAYWRIGHT_MODULE`을 설치된 Playwright 모듈 경로로 지정하여 `node scripts/management-review.cjs` 및 `node scripts/collection-render-review.cjs`를 실행합니다. 이 테스트의 번역 응답은 로컬 검증용이며 운영 번역 모델을 호출하거나 교체하지 않습니다.
