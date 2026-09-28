# 개발자용 링크 열람 조회

Cloudflare → Workers & Pages → D1 → aranya-content → Console에서 실행합니다.
호스트 화면에는 조회 기능이 없으며 D1 접근 권한이 있어야 조회할 수 있습니다.

```sql
SELECT substr(link_id,1,12) AS 링크번호,
       language AS 언어, checkin AS 체크인, checkout AS 체크아웃,
       datetime(issued_at,'+9 hours') AS 발급시각,
       datetime(first_opened_at,'+9 hours') AS 첫열람,
       datetime(last_opened_at,'+9 hours') AS 최근열람,
       open_count AS 열람횟수
FROM guest_link_activity
ORDER BY COALESCE(last_opened_at,issued_at) DESC
LIMIT 100;
```

시간은 한국 시간입니다. 발급 기록은 링크 생성 성공 시점이며 실제 전송 여부는 알 수 없습니다.
열람 횟수는 유효한 링크의 GET 요청 수이며 새로고침/일부 링크 미리보기도 포함될 수 있습니다.
현재 접속 중인지, 누가 열었는지는 알 수 없습니다. 로그인된 호스트, HEAD 및 명시적 prefetch 요청은 제외합니다.
설치 전 과거 기록은 복구할 수 없습니다. 기존 링크는 이후 처음 열리면 발급시각 NULL로 기록됩니다.
원문 링크, 이름, 도어록 비밀번호, IP는 이 테이블에 저장하지 않습니다.
기록 저장이 실패해도 링크 발급과 손님 안내는 계속 동작합니다.
