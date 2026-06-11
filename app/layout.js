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
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1D9E75" />
      </head>
      <body>
        <div className="app-shell">
          {children}
        </div>
        <footer style={{
          background: '#111',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
          lineHeight: 1.8,
          padding: '20px 24px',
          textAlign: 'center',
          fontFamily: 'Noto Sans KR, sans-serif',
        }}>
          <div style={{ marginBottom: 4, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            고랑AI 서비스 운영사
          </div>
          <div>상호: 마음스튜디오 &nbsp;|&nbsp; 대표: 송은주</div>
          <div>사업자등록번호: 724-34-00950</div>
          <div>사업장: 제주특별자치도 서귀포시 대정읍 신영로94번길 16, 1층</div>
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            © 2024 마음스튜디오. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}
