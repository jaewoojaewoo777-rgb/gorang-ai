import './globals.css'

export const metadata = {
  title: '고랑AI — 제주 사장님 마케팅 자동화',
  description: '인스타·유튜브·틱톡 동시 업로드 + 구글 리뷰 AI 자동 답변',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Gowun+Batang:wght@400;700&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Gaegu&family=Nanum+Pen+Script&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet" />
        <meta name="theme-color" content="#1D9E75" />
      </head>
      <body>
        <div className="app-shell">
          {children}
          {/* 사업자 정보 — app-shell 안 맨 아래 */}
          <footer style={{
            borderTop: '1px solid #F0F2F1',
            background: '#F9FAFA',
            color: '#B0BAB6',
            fontSize: 10,
            lineHeight: 1.9,
            padding: '16px 20px',
            textAlign: 'center',
            fontFamily: 'Noto Sans KR, sans-serif',
          }}>
            <div>상호: 마음스튜디오 &nbsp;|&nbsp; 대표: 송은주 &nbsp;|&nbsp; 사업자등록번호: 724-34-00950</div>
            <div>사업장: 제주특별자치도 서귀포시 대정읍 신영로94번길 16, 1층</div>
            <div style={{ marginTop: 4, color: '#D0D5D2', fontSize: 10 }}>
              © 2024 마음스튜디오. All rights reserved.
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
