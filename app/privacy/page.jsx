export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0a0a",
      color: "#e8e8e8",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <header style={{
        borderBottom: "1px solid #1e1e1e",
        padding: "24px 0",
        position: "sticky",
        top: 0,
        backgroundColor: "#0a0a0a",
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #00d4aa, #0099ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#fff",
            }}>고</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>고랑AI</span>
          </a>
          <span style={{ color: "#444", margin: "0 8px" }}>·</span>
          <span style={{ fontSize: 14, color: "#888" }}>개인정보처리방침 / Privacy Policy</span>
        </div>
      </header>

      <div style={{
        background: "linear-gradient(180deg, #0d1f1a 0%, #0a0a0a 100%)",
        padding: "64px 24px 48px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 999,
            border: "1px solid #00d4aa33", backgroundColor: "#00d4aa11",
            fontSize: 12, color: "#00d4aa", marginBottom: 20, letterSpacing: "0.05em",
          }}>PRIVACY POLICY · 개인정보처리방침</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
            개인정보처리방침<br />
            <span style={{ color: "#00d4aa", fontSize: "0.65em", fontWeight: 600 }}>Privacy Policy</span>
          </h1>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            시행일 / Effective Date: <strong style={{ color: "#888" }}>2025년 1월 1일 / January 1, 2025</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            최종 수정 / Last Updated: <strong style={{ color: "#888" }}>2025년 6월 1일 / June 1, 2025</strong>
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 96px" }}>

        <div style={{
          backgroundColor: "#0d1f1a", border: "1px solid #00d4aa33",
          borderLeft: "3px solid #00d4aa", borderRadius: 8,
          padding: "20px 24px", marginBottom: 48, fontSize: 14, lineHeight: 1.8, color: "#999",
        }}>
          고랑AI(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수합니다.<br />
          <em>GorangAI ("Company") respects your privacy and complies with applicable data protection laws including Korea&apos;s Personal Information Protection Act (PIPA).</em>
        </div>

        <Section num="1" title="수집하는 개인정보 항목" subtitle="Information We Collect">
          <p style={biKo}>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
          <p style={biEn}>We collect the following personal information to provide our services:</p>
          <ul style={listStyle}>
            <li><strong>회원가입 / Account Registration</strong><br />KO: 이메일 주소, 이름, 프로필 사진 (Google OAuth를 통한 수집)<br />EN: Email address, name, profile photo (collected via Google OAuth)</li>
            <li><strong>SNS 연동 / Social Media Integration</strong><br />KO: TikTok, YouTube, Instagram 계정의 액세스 토큰, 채널 정보, 게시물 데이터<br />EN: Access tokens, channel information, and post data for TikTok, YouTube, and Instagram accounts</li>
            <li><strong>서비스 이용 / Service Usage</strong><br />KO: 업로드한 미디어 파일(사진·영상), 작성한 캡션, 해시태그, 예약 게시 설정<br />EN: Uploaded media files (photos/videos), captions, hashtags, and scheduled post settings</li>
            <li><strong>결제 정보 / Payment Information</strong><br />KO: 구독 플랜 정보, 결제 내역 (카드 번호는 결제 대행사가 보관)<br />EN: Subscription plan details and payment history (card numbers are stored by payment processors only)</li>
            <li><strong>기기·접속 정보 / Device & Access Info</strong><br />KO: IP 주소, 브라우저 종류, 접속 시간, 서비스 이용 기록<br />EN: IP address, browser type, access time, and service usage logs</li>
          </ul>
        </Section>

        <Section num="2" title="개인정보 수집 및 이용 목적" subtitle="Purpose of Collection and Use">
          <ul style={listStyle}>
            <li>KO: 회원 가입 및 본인 확인 / EN: User registration and identity verification</li>
            <li>KO: SNS 자동 게시 서비스 제공 (YouTube, TikTok, Instagram) / EN: Providing automated SNS posting services</li>
            <li>KO: AI 리뷰 자동 답변 서비스 (Google 지도 리뷰) / EN: AI-powered review auto-reply service (Google Maps reviews)</li>
            <li>KO: 고객 지원 및 문의 처리 / EN: Customer support and inquiry handling</li>
            <li>KO: 서비스 개선 및 신규 기능 개발 / EN: Service improvement and new feature development</li>
            <li>KO: 구독 결제 처리 및 관련 고지 / EN: Subscription billing and related notifications</li>
            <li>KO: 법적 의무 준수 / EN: Compliance with legal obligations</li>
          </ul>
        </Section>

        <Section num="3" title="개인정보 보유 및 이용 기간" subtitle="Retention Period">
          <p style={biKo}>수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기합니다.</p>
          <p style={biEn}>Personal information is destroyed without delay once the purpose of collection is fulfilled.</p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>항목 / Item</th>
                <th style={thStyle}>보유 기간 / Retention Period</th>
                <th style={thStyle}>근거 / Legal Basis</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["회원 정보 / Account info", "회원 탈퇴 시까지 / Until account deletion", "서비스 계약 / Service agreement"],
                ["전자상거래 기록 / E-commerce records", "5년 / 5 years", "전자상거래법 / E-Commerce Act"],
                ["소비자 불만·분쟁 / Consumer disputes", "3년 / 3 years", "전자상거래법 / E-Commerce Act"],
                ["접속 로그 / Access logs", "3개월 / 3 months", "통신비밀보호법 / Communications Act"],
              ].map(([item, period, basis]) => (
                <tr key={item}>
                  <td style={tdStyle}>{item}</td>
                  <td style={tdStyle}>{period}</td>
                  <td style={tdStyle}>{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section num="4" title="제3자 제공 및 위탁" subtitle="Third-Party Sharing & Processing">
          <p style={biKo}>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 서비스 제공을 위해 아래 업체에 업무를 위탁합니다:</p>
          <p style={biEn}>We do not share your personal information with third parties except as described below for service operations:</p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>수탁업체 / Processor</th>
                <th style={thStyle}>위탁 업무 / Processing Purpose</th>
                <th style={thStyle}>보유 기간 / Retention</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Anthropic (Claude API)", "AI 콘텐츠 생성 / AI content generation", "처리 후 즉시 삭제 / Deleted immediately"],
                ["Google (YouTube, OAuth)", "영상 업로드, 로그인 인증 / Video upload, authentication", "서비스 계약 기간 / Contract period"],
                ["TikTok (Content Posting API)", "영상 업로드 / Video upload", "서비스 계약 기간 / Contract period"],
                ["Meta (Instagram API)", "영상 업로드 / Video upload", "서비스 계약 기간 / Contract period"],
                ["Supabase", "데이터베이스 호스팅 / Database hosting", "회원 탈퇴 시 / Until account deletion"],
                ["Vercel", "서비스 호스팅 / Service hosting", "서비스 계약 기간 / Contract period"],
              ].map(([company, purpose, retention]) => (
                <tr key={company}>
                  <td style={tdStyle}>{company}</td>
                  <td style={tdStyle}>{purpose}</td>
                  <td style={tdStyle}>{retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section num="5" title="SNS 플랫폼 데이터 이용" subtitle="Social Media Platform Data Usage">
          <p style={biKo}>고랑AI는 이용자가 연동한 SNS 계정의 데이터를 다음 목적으로만 사용합니다:</p>
          <p style={biEn}>GorangAI uses data from connected SNS accounts solely for the following purposes:</p>
          <ul style={listStyle}>
            <li>KO: 이용자가 요청한 콘텐츠를 해당 SNS에 게시 / EN: Publishing content to SNS platforms as requested by the user</li>
            <li>KO: 게시 결과 및 상태 확인 / EN: Checking the status and results of published posts</li>
            <li>KO: 계정 정보 표시 (채널명, 프로필 등) / EN: Displaying account information (channel name, profile, etc.)</li>
          </ul>
          <p style={biKo}>TikTok API를 통해 수집된 데이터는 TikTok의 서비스 약관 및 개발자 정책을 준수하여 처리됩니다.</p>
          <p style={biEn}>Data collected through the TikTok API is processed in compliance with TikTok&apos;s Terms of Service and Developer Policies.</p>
        </Section>

        <Section num="6" title="이용자의 권리" subtitle="Your Rights">
          <ul style={listStyle}>
            <li>KO: 개인정보 열람 요청 / EN: Right to access your personal information</li>
            <li>KO: 개인정보 수정·정정 요청 / EN: Right to rectification</li>
            <li>KO: 개인정보 삭제 요청 (회원 탈퇴) / EN: Right to erasure (account deletion)</li>
            <li>KO: 개인정보 처리 정지 요청 / EN: Right to restriction of processing</li>
            <li>KO: 개인정보 이동 요청 / EN: Right to data portability</li>
          </ul>
        </Section>

        <Section num="7" title="쿠키 및 추적 기술" subtitle="Cookies & Tracking Technologies">
          <p style={biKo}>고랑AI는 서비스 운영을 위해 쿠키와 유사한 기술을 사용합니다.</p>
          <p style={biEn}>GorangAI uses cookies and similar technologies to operate our service.</p>
          <ul style={listStyle}>
            <li>KO: 세션 쿠키: 로그인 상태 유지 / EN: Session cookies: maintaining login state</li>
            <li>KO: 기능 쿠키: 이용자 설정 저장 / EN: Functional cookies: storing user preferences</li>
          </ul>
        </Section>

        <Section num="8" title="보안 조치" subtitle="Security Measures">
          <ul style={listStyle}>
            <li>KO: 모든 데이터 전송 시 TLS/HTTPS 암호화 적용 / EN: TLS/HTTPS encryption for all data transmission</li>
            <li>KO: 액세스 토큰 암호화 저장 / EN: Encrypted storage of access tokens</li>
            <li>KO: 최소 권한 원칙에 따른 데이터 접근 통제 / EN: Data access control following the principle of least privilege</li>
            <li>KO: 정기적 보안 점검 및 취약점 관리 / EN: Regular security audits and vulnerability management</li>
          </ul>
        </Section>

        <Section num="9" title="개인정보 보호책임자" subtitle="Data Protection Officer">
          <div style={{ backgroundColor: "#111", border: "1px solid #222", borderRadius: 12, padding: "24px" }}>
            {[
              ["성명 / Name", "고랑AI 개인정보보호팀 / GorangAI Privacy Team"],
              ["이메일 / Email", "privacy@gorang-ai.com"],
              ["웹사이트 / Website", "https://gorang-ai.com"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: "#555", minWidth: 180 }}>{label}</span>
                <span style={{ color: "#ccc" }}>{value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section num="10" title="방침 변경 안내" subtitle="Policy Updates">
          <p style={biKo}>본 방침은 법령이나 서비스 변경에 따라 개정될 수 있습니다. 중요한 변경 사항이 있을 경우, 서비스 내 공지사항 또는 이메일을 통해 사전 안내합니다.</p>
          <p style={biEn}>This policy may be updated to reflect changes in law or our services. For material changes, we will provide advance notice via in-service announcements or email.</p>
        </Section>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid #1e1e1e", textAlign: "center", color: "#444", fontSize: 13 }}>
          <p>© 2025 고랑AI / GorangAI. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/terms" style={{ color: "#00d4aa", textDecoration: "none" }}>이용약관 / Terms of Service</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="/" style={{ color: "#666", textDecoration: "none" }}>홈으로 / Home</a>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ num, title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: "#00d4aa",
          backgroundColor: "#00d4aa11", border: "1px solid #00d4aa33",
          padding: "2px 10px", borderRadius: 999, letterSpacing: "0.05em",
        }}>0{num}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>{title}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#00d4aa", fontWeight: 500 }}>{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

const biKo = { margin: "0 0 6px", color: "#ccc", fontSize: 15, lineHeight: 1.7 };
const biEn = { margin: "0 0 16px", color: "#666", fontSize: 14, lineHeight: 1.7, fontStyle: "italic" };
const listStyle = { paddingLeft: 20, margin: "12px 0", display: "grid", gap: 12, color: "#bbb", fontSize: 14, lineHeight: 1.8 };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 };
const thStyle = { padding: "10px 14px", textAlign: "left", backgroundColor: "#111", color: "#888", borderBottom: "1px solid #222", fontWeight: 600 };
const tdStyle = { padding: "10px 14px", borderBottom: "1px solid #1a1a1a", color: "#bbb", verticalAlign: "top" };
