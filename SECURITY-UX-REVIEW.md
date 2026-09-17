# Aranya 보안·UX 개선 검토

## 반영 결정 업데이트

2026-09-17 추가 요청: 링크 생성 시 선택적으로 숫자 4~12자리의 비밀번호와 한국어 안내 설명(최대 300자)을 직접 입력한다. 설명은 선택한 게스트 언어로 번역하고 원문과 함께 인증 암호화된 토큰에 넣는다. 비밀번호 자체는 번역하지 않는다. 유효한 게스트 링크에서 메인 도어록 카드에 표시하며 빈 입력은 기존 안내를 유지한다. 한국어 전환 시 원문, 발급 시 선택한 언어 이외로 전환 시 발급 언어 번역을 표시한다. 이는 물리적 도어록 변경 기능이 아니며, 설명이나 번호 변경 시 새 링크를 발급해야 한다. 아래 PIN 미표시 관련 판정은 이 추가 기능 도입 전 기록이다.

사용자가 아직 손님에게 링크를 발송하지 않았음을 확인하고 기존 링크 차단 및 GitHub 푸시·운영 배포를 승인했다. `wrangler.jsonc`에 `DISABLE_LEGACY_GUEST_LINKS=true`를 설정했다. 새 암호화 링크는 허용하고 기존 Base64 링크는 만료 화면으로 처리하는 통합 검사를 추가했다. 운영 주소는 유지한다. 아래 본문은 배포 전 검토 시점의 기록이다.

검토일: 2026-09-16. 기준 커밋: `7192b94`. 이번 변경은 로컬 구현·검증 상태이며 Git 커밋/푸시/운영 배포는 하지 않았다. 운영 D1/R2를 변경하지 않았다. 이전 자동 번역 수정 `7192b94`는 이미 운영 배포된 별도 작업이다.

## A. Architecture

- `index.html`: 공개 화면, 다국어 기본값, 예약 표시 및 호스트 링크 생성 UI. 이미지와 데이터가 큰 단일 원본에 포함된다.
- `scripts/build.cjs`: 이미지를 정적 자산으로 분리하고 CMS 필드를 추출해 `src/generated.js`와 `dist`를 생성한다. 서버 인증 연결도 빌드 단계에서 적용한다. 원본 파일에 일부 비 UTF-8 바이트가 있어 전체 파일 재인코딩 대신 기존 빌드 변환을 이용했다.
- `src/collections.js`: 안정적인 항목 식별자, 추가·삭제·이동 및 이미지 슬롯. 이번에 변경하지 않았다.
- `src/content.js`, `src/travel-content.js`: 저장된 콘텐츠를 다국어 페이지로 렌더링한다.
- `ui/admin.js`, `ui/preview.js`: 내용 관리, 미리보기 선택, 초안, 언어별 번역, 공개. 이번에 변경하지 않았다.
- `src/worker.js`: 비밀번호 검증, 서명 세션, CSRF, D1 초안/공개, AI 번역, R2 사진 및 응답 제공.
- D1 `content_state`: draft/published JSON + revision 충돌 검사. `login_attempts`: 로그인 횟수 제한. 사진은 R2.

기존 흐름: `?g=Base64(JSON)` → 서버의 체크아웃 검사 → 브라우저의 복호화가 아닌 단순 디코딩 → 개인화 표시.

변경 흐름: 인증된 호스트 → `POST /api/guest-link` → 서버 입력 검증 → AES-GCM 인증 암호화 → `?g=v1.…` → 서버의 변조/만료 검증 → 안전하게 이스케이프한 예약 데이터 → 기존 화면.

새 인프라와 D1 예약 테이블을 추가하지 않았다. 이는 **예약 DB 조회형 opaque token은 아니다**. 암호화된 자체 포함 토큰이며, 서버가 발급한 값이라는 무결성과 URL 내용의 기밀성을 제공한다. 예약 취소 여부를 자동 조회하거나 개별 링크를 강제로 취소하는 기능은 없다.

## B. Security Findings / 우선순위

1. **High — 기존 게스트 링크의 날짜 변조 및 개인정보 노출.** 원본 `encodeGuestCompact()`는 Base64 인코딩만 한다. 새 링크는 인증 암호화로 개선. 이미 발송된 기존 링크는 호환 때문에 계속 허용하므로 잔여 위험이 있다.
2. **High — 게스트 시간 필드의 HTML 삽입.** 원본 `applyGuestInfo()`의 `stCi/stCo.innerHTML`에 URL의 시간 값이 들어간다. 서버의 엄격한 시간 검증과 `createTextNode/replaceChildren`으로 변경했다. 이름은 원래부터 `textContent`였다.
3. **Medium — 기본 주소의 콘텐츠는 클라이언트 로그인 UI로만 가려짐.** `/`의 일반 안내 HTML은 서버에서 반환된다. 관리자 API 권한 우회는 아니며 예약자 데이터/PIN은 기본 응답에 없다. 모든 안내 자체를 비공개로 취급하려면 별도의 서버 진입 정책 변경이 필요하다. 이번에는 기존 로그인 진입 화면을 유지했다.
4. **Medium — 보안 응답 헤더 부족.** no-referrer, nosniff, same-origin framing, HSTS, Permissions-Policy, noindex 및 제한적 CSP를 추가했다. 더 엄격한 자원 CSP는 Report-Only로 시작한다.
5. **Medium — 로그아웃은 쿠키 제거이며 탈취된 세션의 서버 폐기 기능은 없음.** 기존 8시간 서명 세션을 유지했다. 세션 저장소 추가는 별도 설계 대상이다.
6. **Low — AI 오류 원문의 로그 기록 가능성.** 오류 문자열 대신 필드 식별자와 언어만 기록하도록 줄였다.
7. **Low — 사진 팝업의 포커스 관리 및 키보드 진입 부족.** 개선했다.

Critical 문제를 확인했다는 근거는 없다. 이 검토는 인증된 침투시험이나 전체 Git 이력의 비밀정보 전수 검사 인증이 아니다.

## C. Changes

- `src/guest-token.js`: 새 게스트 토큰 발급·검증, 필드 검증, 한국 시간 체크아웃, 기존 링크 호환/차단 설정.
- `src/worker.js`: 인증된 링크 발급 API, 토큰 검증과 안전한 예약 데이터 전달, 보안 헤더, 로그 축소.
- `scripts/build.cjs`: 기존 링크 생성 UI를 새 API와 연결, 시간 필드의 안전한 DOM 처리, OG/robots, 새 UX 스크립트, 폰트 swap.
- `ui/guest-ux.js`: 사진 팝업 포커스 이동·복귀, 배경 inert, Tab/Escape 동작, 기기 이미지 키보드 조작, 이미지 오류 안내, 주소 복사, 10개 언어 UI 문구, 지연 이미지 로딩.
- `src/content.js`: 원래 개발 메모와 정확히 일치하는 문구만 공개 화면에서 숨김. 호스트가 바꾼 문구 및 관리자 편집값은 보존.
- `tests/guest-token.test.mjs`, `scripts/security-integration.mjs`: 암호화·검증·인증·만료·헤더·격리·메모 보존 검사.
- `tests/travel-new.test.mjs`: 예전 공항 펼침 안내를 전제로 한 두 테스트를 이미 운영 중인 포스터 버튼 방식에 맞춤.

기존 `package-lock.json` 변경은 이번 작업에서 수정하지 않았다. D1 스키마, 사진, 번역, 목록 데이터는 변경하지 않았다.

## D. Security Improvements

- 새 링크 URL에서 예약자 이름/날짜를 Base64로 바로 읽거나 값을 바꿀 수 없다.
- 인증된 호스트만 링크를 발급한다. 발급 요청에도 같은 Origin 검사를 적용한다.
- 날짜 실재 여부, 날짜 순서, 24시간 형식, 이름 길이, 정수 인원, 지원 언어, 토큰 길이를 검증한다. 인원 상한 30은 입력 이상 방지용이며 숙소 정원 정책을 의미하지 않는다.
- 만료 시 일반 안내 데이터 조회 전에 기존 다국어 만료 화면만 반환한다. 유예 시간을 임의로 추가하지 않았다.
- 개인화 HTML은 계속 `no-store`이며 메모리의 공통 안내 캐시에 예약자 데이터를 넣지 않는다.
- URL의 외부 Referer 전달을 차단한다. OG 문구에는 개인정보가 없다.
- 사진 팝업과 내용관리 iframe이 깨지지 않도록 same-origin 프레임만 허용한다.

## E. UX Improvements

- 사진 팝업에서 닫기 버튼에 포커스, 배경 조작 차단, Tab 유지, Escape 닫기, 원래 버튼 복귀.
- 기기 사진을 Enter/Space로 열기. 이미지 로딩 실패 시 10개 언어 안내.
- 현재 관리 중인 주소로 복사 버튼 제공. 클립보드 사용 불가 시 주소 선택용 prompt.
- PHOTO 터치 영역의 최소 높이 44px, 포커스 표시. 기기 사진 lazy loading과 async decoding.
- 호스트의 실제 안내를 보존하면서 기본 개발 메모만 공개에서 제외.

## F. Tests

- `node --test tests/*.test.mjs`: 28개 통과. 이후 개발 메모 보존 테스트를 추가하고 해당 테스트 파일 3개 검사를 다시 실행해 모두 통과했다(고유 테스트 총 29개).
- `node scripts/integration-test.mjs`: 격리된 실제 로컬 D1/R2에서 로그인, 초안 분리, 충돌, 번역 실패 차단/모의 성공, 공개, 업로드, CSRF, 저장소 파일 차단 통과.
- `node scripts/security-integration.mjs`: 인증된 발급, 암호화 데이터 전달, HTML 이스케이프, 잘못된/만료된 토큰, 헤더, 개인화 캐시 분리, 로그인 11회 제한, 잘못된 세션 차단 통과. 운영에는 로그인 반복 요청을 보내지 않았다.
- 실제 Edge headless: 로컬 관리자 로그인 → 실제 링크 생성 버튼 → 쿠키 삭제 → 새 게스트 링크 → 새로고침까지 통과.
- 게스트 8개 화면 × 10개 언어 × 320/375/390/430/768/1400px에서 가로 overflow 없음. 관리자도 6개 폭 검사. 사진 팝업 포커스/Tab/Escape, 지도 링크 3개와 주소 복사 버튼, 이름 HTML 비실행, JavaScript 오류 없음 확인.
- `node --check`와 `git diff --check` 통과.
- 외부 지도 길찾기 정확성, 모든 번역의 의미, 실제 휴대폰 OS별 클립보드, 전체 WCAG 대비율/스크린리더 적합성은 이 검사로 보장하지 않는다.

## G. Remaining Risks / 프롬프트 항목별 판정

판정의 Already Safe는 확인한 코드 범위에 한정한다. Needs Improvement 항목은 이번 개선 여부와 남은 범위를 함께 적었다.

- 1 구조·흐름: Already Safe — 위 Architecture에 실제 경로 기록.
- 2 g 파라미터: Needs Improvement — 새 링크 개선, 기존 링크 교체 필요.
- 3 만료: Already Safe — 서버 한국시간 만료 유지, 유예 없음.
- 4 도어락 PIN: Already Safe / Needs Manual Verification — 기본 안내는 Airbnb 별도 전달이며 PIN 없음. 운영자가 나중에 넣은 이미지/문구까지 PIN이 없는지는 호스트 확인 필요.
- 5 관리자 분리: Needs Improvement — `/admin` API 인증은 분리됨. 기본 주소의 클라이언트 잠금은 콘텐츠 접근 제어가 아님.
- 6 인증: Already Safe / Needs Improvement — 서버 검증·HttpOnly/Secure/SameSite·8시간 세션. 개별 세션 강제 폐기는 없음.
- 7 로그인 제한: Already Safe — IP 해시 기준 15분 10회; 로그인 성공도 횟수에 포함. 공유 IP 환경은 운영 확인 필요.
- 8 개인정보: Needs Improvement — 새 링크 암호화, no-referrer 적용. 기존 링크는 여전히 복원 가능. 링크를 가진 사람은 해당 안내에 접근 가능.
- 9 입력: Needs Improvement — 서버 검증 추가 완료.
- 10 XSS: Needs Improvement — 시간 삽입 개선. CMS의 기존 제한 태그 검증 유지. 외부 이미지 SVG 업로드는 허용하지 않음.
- 11 헤더: Needs Improvement — 기본 정책 적용 완료; 엄격한 CSP는 Report-Only이며 수집 endpoint는 없음.
- 12 오류: Already Safe / Needs Improvement — 내부 스택 숨김, 잘못된 링크는 기존 만료 안내. 이미지 오류 안내 추가. 무효와 만료 문구는 같은 화면이다.
- 13 Wi-Fi: Needs Manual Verification — 기존 현장 카드 안내 유지; SSID/비밀번호/QR을 임의 생성하지 않음.
- 14 도어락 문제 대응: Needs Manual Verification — 기존 호스트 문의 안내 유지; 모델 확인 전 조작 순서 추가 안 함.
- 15 긴급 문의: Needs Manual Verification — Airbnb 연락만 확인됨. 긴급 전화번호 생성 안 함.
- 16 체크아웃: Needs Manual Verification — 수건·침구·보관 등 미확인 정책 추가 안 함. 기존 CMS로 수정 가능.
- 17 쓰레기: Already Safe / Needs Manual Verification — 기존 숙소 안내에 봉투/재활용 위치와 번역 존재. 정확한 현장 위치는 확인 필요.
- 18 자쿠지: Needs Manual Verification — 기존 급수 시간/수위 주의 존재. 온수·배수·입욕제 정책은 생성하지 않음.
- 19 기기 안내: Already Safe — 기기 탭, 카드, 핵심 흐름, 단계 상세, 사진 존재. 별도 탐색 UI 추가는 보류.
- 20 마지막 도보: Already Safe / Needs Manual Verification — 10개 언어 공항/도보 포스터와 입구 안내 구조 존재; 이번에 현장 경로 재검증은 하지 않음.
- 21 주소: Needs Improvement — 복사 추가. 기존 CMS 주소 및 지도 링크 재사용.
- 22 장소 데이터: Already Safe — CMS에서 장소 문구/사진/지도/목록 수정 가능. 최종 확인일은 없으며 운영자가 확인해야 함.
- 23 개발 메모: Needs Improvement — 원본 메모만 공개에서 숨김; 저장값과 호스트 수정은 보존.
- 24 숙소 규칙: Already Safe / Needs Manual Verification — 숙소 안내 탭에 금연·조용한 시간 등 존재. 추가 정책은 호스트 확인.
- 25 안전: Needs Manual Verification — 화재 예방 안내 존재; 소화기/차단기 위치 미확인.
- 26 CCTV: Needs Manual Verification — 외부 보안 카메라 항목 존재. 촬영 범위 및 실내 여부는 단정하지 않음.
- 27 다국어: Already Safe / Needs Manual Verification — 10개 언어 전환 및 새 UI 문구 확인. 번역 품질과 기존 PHOTO/지도 브랜드 등 공통 표기는 별도 검수 필요.
- 28 형식: Already Safe — 기존 날짜 표시·입력 UI에서 locale/Intl 사용. 체크인/아웃은 현지 24시간 표기 유지.
- 29 모바일: Already Safe — 위 폭/섹션 테스트 통과. 실기기 테스트는 별도.
- 30 접근성: Needs Improvement — 사진 키보드·포커스 보완. 전체 WCAG 인증 아님.
- 31 성능: Needs Improvement — 기기 이미지 lazy/async, font swap. 큰 포스터와 전체 아이콘 목록은 유지; 크기 재가공은 디자인/화질 검토 후 별도 작업.
- 32 JS 실패 대응: Needs Improvement — 화면이 JS에 의존함. 전면 SSR 도입하지 않음; 안내용 오프라인 자료는 호스트 운영 검토 필요.
- 33 OG: Needs Improvement — 비개인화 title/description 추가.
- 34 색인: Needs Improvement — robots meta 및 응답 noindex 추가. 공개 홍보용 별도 경로는 코드에서 확인되지 않음.
- 35 캐시: Already Safe — 개인화 no-store, 공통 렌더 이후 개인 데이터 삽입. 캐시 분리 검사 통과.
- 36 로그: Needs Improvement — AI 원문 오류 출력 제거. Cloudflare 플랫폼 URL 로그의 저장 정책은 대시보드 확인 필요.
- 37 secrets: Already Safe / Needs Manual Verification — HOST_PASSWORD/SESSION_SECRET는 Worker binding. .dev.vars는 gitignore, 추적된 .env/.pem/.key 없음. 원본 index에 예전 ADMIN_HASH는 있으나 빌드에서 제거됨. 과거 비밀번호 재사용 여부/전체 Git 이력/키 강도는 별도 확인 필요.
- 38 hostname: Needs Manual Verification — 오탈자 가능성. 기존 링크 보존을 위해 변경하지 않음. 바꾸려면 기존 Worker에서 새 도메인으로 query를 유지하는 redirect부터 준비.
- 39 테스트: Already Safe — 로컬 검사 수행, 운영 파괴/제3자 데이터 탐색 없음.
- 40 회귀: Already Safe — 사진/지도/CMS/목록/번역/공개 데이터 유지, 로컬 회귀 검사 통과.
- 41 결과: 이 문서와 작업 최종 보고에 기록.

Not Applicable: 현재 구조에 React dangerouslySetInnerHTML, 예약별 PIN API, 공개 Wi-Fi 비밀 API, 별도 예약 DB 연동은 없다. 이에 대한 존재하지 않는 구현을 추가하지 않았다.

## H. Manual TODO / 반영 전 판단

1. 기존 링크를 언제까지 유지할지 정한다. 전부 새 링크로 교체한 뒤 `DISABLE_LEGACY_GUEST_LINKS=true`를 설정하면 기존 unsigned 링크를 거부한다. 이 설정은 이번에 운영에 넣지 않았다.
2. SESSION_SECRET를 교체하면 새 게스트 링크와 관리자 세션이 모두 무효화된다. 임의로 교체하지 않는다. 개별 링크 취소가 필요해지면 D1 예약/토큰 테이블을 별도 승인 후 설계한다.
3. 기본 주소 안내까지 서버에서 비공개로 할지 정한다. 해당 redirect 변경은 자동 승인 검토에서 기존 진입 기능 손상 위험으로 차단되었으며 적용하지 않았다.
4. 실제 도어락 정책/모델, 긴급 연락, 자쿠지, 쓰레기, 체크아웃, CCTV 범위를 호스트가 확인한다. 기존 내용 관리 기능으로 입력·번역·미리보기·공개 가능하다.
5. 실제 모바일 기기, 스크린리더, 외국어 의미, 포스터 길찾기를 운영자가 최종 확인한다.
6. 운영 반영은 아직 하지 않았다. 새 API와 빌드 결과는 반드시 같은 배포에서 반영해야 한다. 이번 코드에는 D1 migration이 필요 없다.
