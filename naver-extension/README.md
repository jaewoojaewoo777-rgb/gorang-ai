# 고랑AI 네이버 연동 확장

네이버 플레이스 공식 API가 없어서, 사장님이 직접 로그인한 세션 쿠키를 캡처해 고랑AI에 전달하는 크롬 확장입니다. 비밀번호는 절대 거치지 않고, 로그인 후 발급된 세션 쿠키만 전송합니다.

## 로컬 테스트 (개발자모드 사이드로드)

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램을 로드합니다" 클릭 → 이 폴더(`naver-extension/`) 선택
4. 네이버에 로그인 → 확장 아이콘 클릭 → 고랑AI 설정 화면에서 발급받은 6자리 연동코드 입력 → "세션 연결하기"

## 실제 배포 시 필요한 것

- Chrome 웹스토어 개발자 계정 등록 (1회, $5)
- 확장 아이콘(16/48/128px) 추가 후 `manifest.json`에 `icons` 필드 등록
- 웹스토어 심사 제출 (보통 수 시간~수일, Meta/Google API 심사보다는 훨씬 빠름)
- 게시 후 발급되는 고정 확장 ID를 안내 문서/링크에 반영

## 서버 계약

`POST {API_BASE}/api/naver/connect`
```json
{
  "pairingCode": "123456",
  "cookies": [{ "name": "NID_AUT", "value": "...", "domain": ".naver.com", "path": "/", "secure": true, "expirationDate": 1234567890 }]
}
```
응답: `{ "success": true, "placeName": "..." }` 또는 `{ "success": false, "error": "..." }`
