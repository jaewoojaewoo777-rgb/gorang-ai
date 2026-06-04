export const metadata = {
  title: "이용약관 | Terms of Service | 고랑AI",
  description: "고랑AI 이용약관 / GorangAI Terms of Service",
};

export default function TermsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0a0a",
      color: "#e8e8e8",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* Header */}
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
          <span style={{ fontSize: 14, color: "#888" }}>이용약관 / Terms of Service</span>
        </div>
      </header>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(180deg, #0d1520 0%, #0a0a0a 100%)",
        padding: "64px 24px 48px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: 999,
            border: "1px solid #0099ff33",
            backgroundColor: "#0099ff11",
            fontSize: 12,
            color: "#0099ff",
            marginBottom: 20,
            letterSpacing: "0.05em",
          }}>TERMS OF SERVICE · 이용약관</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, margin: "0 0 16px", color: "#fff", lineHeight: 1.2 }}>
            이용약관<br />
            <span style={{ color: "#0099ff", fontSize: "0.65em", fontWeight: 600 }}>Terms of Service</span>
          </h1>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            시행일 / Effective Date: <strong style={{ color: "#888" }}>2025년 1월 1일 / January 1, 2025</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            최종 수정 / Last Updated: <strong style={{ color: "#888" }}>2025년 6월 1일 / June 1, 2025</strong>
          </p>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 96px" }}>

        <Notice color="#0099ff">
          본 이용약관은 고랑AI(이하 &quot;회사&quot;)가 제공하는 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.<br />
          <em>These Terms of Service govern the relationship between GorangAI ("Company") and users ("User") regarding the use of our services.</em>
        </Notice>

        <Section num="1" title="서비스 소개" subtitle="About Our Service" color="#0099ff">
          <Bilingual
            ko={<>고랑AI는 제주도 카페 및 펜션 사업자를 위한 SNS 마케팅 자동화 플랫폼입니다. YouTube, TikTok, Instagram에 영상을 자동으로 업로드하고, Google 지도 리뷰에 AI가 자동으로 답변하는 기능을 제공합니다.</>}
            en={<>GorangAI is an SNS marketing automation platform for café and pension business owners in Jeju Island. We provide automated video uploading to YouTube, TikTok, and Instagram, as well as AI-powered auto-replies to Google Maps reviews.</>}
          />
        </Section>

        <Section num="2" title="약관의 동의" subtitle="Agreement to Terms" color="#0099ff">
          <Bilingual
            ko={<>서비스에 가입하거나 이용함으로써, 이용자는 본 약관에 동의한 것으로 간주됩니다. 만 14세 미만인 경우 서비스를 이용할 수 없습니다.</>}
            en={<>By registering for or using our service, you agree to be bound by these Terms. Users under 14 years of age may not use the service.</>}
          />
        </Section>

        <Section num="3" title="계정 및 보안" subtitle="Account & Security" color="#0099ff">
          <Bilingual
            ko={<>이용자는 Google 계정을 통해 고랑AI에 가입할 수 있습니다. 이용자는 자신의 계정 정보 보안에 대한 책임을 집니다. 계정 도용 또는 보안 위협이 발생한 경우 즉시 회사에 통보해야 합니다.</>}
            en={<>Users may register via Google account. You are responsible for maintaining the security of your account. Please notify us immediately if you become aware of any unauthorized use of your account or security breach.</>}
          />
          <ul style={listStyle}>
            <li>KO: 계정은 본인만 사용 가능하며 타인에게 양도할 수 없습니다.<br />EN: Accounts are personal and non-transferable.</li>
            <li>KO: 정확하고 최신 정보를 유지할 책임이 있습니다.<br />EN: You are responsible for keeping your information accurate and up-to-date.</li>
            <li>KO: 허위 정보 기재 시 서비스 이용이 제한될 수 있습니다.<br />EN: Providing false information may result in service termination.</li>
          </ul>
        </Section>

        <Section num="4" title="서비스 이용 조건" subtitle="Service Usage Conditions" color="#0099ff">
          <Bilingual
            ko={<>이용자는 다음 행위를 해서는 안 됩니다:</>}
            en={<>Users must not engage in the following activities:</>}
          />
          <ul style={listStyle}>
            <li>KO: 저작권, 상표권 등 제3자의 지식재산권 침해<br />EN: Infringement of third-party intellectual property rights (copyright, trademark, etc.)</li>
            <li>KO: 불법적이거나 유해한 콘텐츠 업로드<br />EN: Uploading illegal or harmful content</li>
            <li>KO: 스팸, 허위 광고, 사기 행위<br />EN: Spam, false advertising, or fraudulent activities</li>
            <li>KO: 서비스의 정상적인 운영을 방해하는 행위<br />EN: Interfering with the normal operation of the service</li>
            <li>KO: 타인의 계정 도용 또는 개인정보 무단 수집<br />EN: Unauthorized use of another person's account or collection of personal information</li>
            <li>KO: 연동된 SNS 플랫폼(TikTok, YouTube, Instagram)의 이용약관 위반<br />EN: Violation of the terms of service of connected SNS platforms (TikTok, YouTube, Instagram)</li>
            <li>KO: 관련 법령 위반 행위 일체<br />EN: Any other activity that violates applicable laws</li>
          </ul>
        </Section>

        <Section num="5" title="구독 및 결제" subtitle="Subscription & Payment" color="#0099ff">
          <Bilingual
            ko={<>고랑AI는 아래와 같은 구독 플랜을 제공합니다. 모든 가격은 부가세 포함입니다.</>}
            en={<>GorangAI offers the following subscription plans. All prices include VAT.</>}
          />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>플랜 / Plan</th>
                <th style={thStyle}>가격 / Price</th>
                <th style={thStyle}>주요 기능 / Features</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["베이직 / Basic", "₩29,000/월", "기본 SNS 자동화 / Basic SNS automation"],
                ["스탠다드 / Standard", "₩59,000/월", "다채널 업로드 + AI 리뷰 / Multi-channel + AI reviews"],
                ["프로 / Pro", "₩129,000/월", "전체 기능 + 우선 지원 / Full features + priority support"],
                ["엔터프라이즈 / Enterprise", "별도 문의 / Custom", "맞춤형 솔루션 / Custom solutions"],
              ].map(([plan, price, features]) => (
                <tr key={plan}>
                  <td style={tdStyle}><strong>{plan}</strong></td>
                  <td style={tdStyle} ><span style={{ color: "#0099ff", fontWeight: 600 }}>{price}</span></td>
                  <td style={tdStyle}>{features}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 20 }}>
            <Bilingual
              ko={<>구독은 매월 자동 갱신되며, 해지는 다음 결제일 전까지 설정 메뉴에서 가능합니다. 월 구독은 환불이 원칙적으로 불가하나, 서비스 오류로 인한 경우는 개별 처리합니다.</>}
              en={<>Subscriptions renew automatically each month. You may cancel before the next billing date in the settings menu. Monthly subscriptions are generally non-refundable; however, cases involving service errors will be handled individually.</>}
            />
          </div>
        </Section>

        <Section num="6" title="SNS 플랫폼 연동" subtitle="SNS Platform Integration" color="#0099ff">
          <Bilingual
            ko={<>고랑AI는 이용자의 동의 하에 TikTok, YouTube, Instagram 계정을 연동합니다. 이용자는 각 플랫폼의 이용약관을 준수할 책임이 있으며, 연동 해제 시 해당 플랫폼으로의 자동 업로드가 중단됩니다.</>}
            en={<>GorangAI integrates with TikTok, YouTube, and Instagram with your consent. You are responsible for complying with each platform's terms of service. Disconnecting a platform will stop automated uploads to that platform.</>}
          />
          <Bilingual
            ko={<>각 SNS 플랫폼의 API 정책 변경으로 인해 일부 기능이 제한되거나 변경될 수 있으며, 이는 회사의 귀책사유가 아닙니다.</>}
            en={<>Some features may be limited or changed due to API policy changes by SNS platforms. Such limitations are not attributable to the Company.</>}
          />
        </Section>

        <Section num="7" title="지식재산권" subtitle="Intellectual Property" color="#0099ff">
          <Bilingual
            ko={<>이용자가 서비스를 통해 업로드하는 콘텐츠(사진, 영상, 텍스트 등)의 저작권은 이용자에게 있습니다. 회사는 서비스 제공 목적 외에 이용자의 콘텐츠를 사용하지 않습니다.</>}
            en={<>Copyright in content uploaded by users (photos, videos, text, etc.) remains with the user. The Company will not use user content for any purpose other than service provision.</>}
          />
          <Bilingual
            ko={<>고랑AI의 서비스, 로고, 브랜드, 소프트웨어 등은 회사의 지식재산권으로 보호받습니다.</>}
            en={<>GorangAI's service, logo, brand, and software are protected as the Company's intellectual property.</>}
          />
        </Section>

        <Section num="8" title="서비스 변경 및 중단" subtitle="Service Changes & Interruptions" color="#0099ff">
          <Bilingual
            ko={<>회사는 서비스 개선을 위해 기능을 변경하거나 중단할 수 있습니다. 중요한 변경 사항은 사전 공지합니다. 불가피한 기술적 사유로 서비스가 일시 중단될 수 있으며, 이 경우 신속히 복구합니다.</>}
            en={<>The Company may modify or discontinue service features for improvements. Material changes will be notified in advance. The service may be temporarily interrupted for unavoidable technical reasons; we will restore it promptly.</>}
          />
        </Section>

        <Section num="9" title="책임의 한계" subtitle="Limitation of Liability" color="#0099ff">
          <Bilingual
            ko={<>회사는 다음 사항에 대해 책임을 지지 않습니다:</>}
            en={<>The Company is not liable for the following:</>}
          />
          <ul style={listStyle}>
            <li>KO: SNS 플랫폼의 정책 변경 또는 API 제한으로 인한 서비스 제약<br />EN: Service restrictions due to SNS platform policy changes or API limitations</li>
            <li>KO: 이용자의 콘텐츠로 인해 발생한 제3자와의 분쟁<br />EN: Disputes with third parties arising from user content</li>
            <li>KO: 천재지변, 해킹 등 불가항력적 사유로 인한 서비스 중단<br />EN: Service interruptions due to force majeure events (natural disasters, hacking, etc.)</li>
            <li>KO: 이용자의 귀책사유로 인한 손해<br />EN: Damages attributable to the user's own actions</li>
          </ul>
        </Section>

        <Section num="10" title="분쟁 해결 및 준거법" subtitle="Dispute Resolution & Governing Law" color="#0099ff">
          <Bilingual
            ko={<>본 약관은 대한민국 법률에 따라 해석 및 적용됩니다. 서비스 이용과 관련한 분쟁은 먼저 협의를 통해 해결하며, 협의가 이루어지지 않을 경우 서울중앙지방법원을 제1심 관할 법원으로 합니다.</>}
            en={<>These Terms are governed by and construed in accordance with the laws of the Republic of Korea. Disputes shall first be resolved through consultation; if unsuccessful, the Seoul Central District Court shall have exclusive jurisdiction as the court of first instance.</>}
          />
        </Section>

        <Section num="11" title="문의처" subtitle="Contact Us" color="#0099ff">
          <div style={{
            backgroundColor: "#0d1520",
            border: "1px solid #0099ff33",
            borderRadius: 12,
            padding: "24px",
          }}>
            <p style={{ margin: "0 0 16px", color: "#aaa", fontSize: 14 }}>
              KO: 이용약관에 관한 문의는 아래로 연락해 주세요.<br />
              EN: For inquiries regarding these Terms of Service, please contact us at:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                ["서비스명 / Service", "고랑AI / GorangAI"],
                ["이메일 / Email", "support@gorang-ai.com"],
                ["웹사이트 / Website", "https://gorang-ai.com"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 12, fontSize: 14 }}>
                  <span style={{ color: "#555", minWidth: 180 }}>{label}</span>
                  <span style={{ color: "#ccc" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: "1px solid #1e1e1e",
          textAlign: "center",
          color: "#444",
          fontSize: 13,
        }}>
          <p>© 2025 고랑AI / GorangAI. All rights reserved.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/privacy" style={{ color: "#0099ff", textDecoration: "none" }}>개인정보처리방침 / Privacy Policy</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="/" style={{ color: "#666", textDecoration: "none" }}>홈으로 / Home</a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ num, title, subtitle, color = "#0099ff", children }: {
  num: string; title: string; subtitle: string; color?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color,
          backgroundColor: `${color}11`, border: `1px solid ${color}33`,
          padding: "2px 10px", borderRadius: 999, letterSpacing: "0.05em",
        }}>0{num}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>{title}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color, fontWeight: 500 }}>{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Bilingual({ ko, en }: { ko: React.ReactNode; en: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 6px", color: "#ccc", fontSize: 15, lineHeight: 1.7 }}>{ko}</p>
      <p style={{ margin: 0, color: "#666", fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>{en}</p>
    </div>
  );
}

function Notice({ children, color = "#0099ff" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      backgroundColor: "#0d1520",
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: "20px 24px",
      marginBottom: 48,
      fontSize: 14,
      lineHeight: 1.8,
      color: "#999",
    }}>
      {children}
    </div>
  );
}

const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: "12px 0",
  display: "grid",
  gap: 12,
  color: "#bbb",
  fontSize: 14,
  lineHeight: 1.8,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 16,
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  backgroundColor: "#111",
  color: "#888",
  borderBottom: "1px solid #222",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid #1a1a1a",
  color: "#bbb",
  verticalAlign: "top",
};
