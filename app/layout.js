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
      </body>
    </html>
  )
}
