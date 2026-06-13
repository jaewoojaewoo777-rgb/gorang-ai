'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav, TopBar, PrimaryBtn } from '../../components/ui'

const SUGGESTIONS = [
  '영상 어떻게 만들어요?',
  '유튜브 업로드가 안 돼요',
  '요금제 알려주세요',
  '자막을 바꾸고 싶어요',
]

export default function HelpPage() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 고랑AI 사용 중 궁금한 점을 물어보세요 😊', logId: null },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    setMessages(p => [...p, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessages(p => [...p, { role: 'assistant', content: data.answer, logId: data.logId, feedback: null }])
      } else {
        setMessages(p => [...p, { role: 'assistant', content: '죄송해요, 답변을 못 만들었어요. 잠시 후 다시 시도해주세요.', logId: null }])
      }
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: '연결에 문제가 있어요. 잠시 후 다시 시도해주세요.', logId: null }])
    }
    setLoading(false)
  }

  const sendFeedback = async (idx, fb) => {
    const m = messages[idx]
    if (!m.logId) return
    setMessages(p => p.map((x, i) => i === idx ? { ...x, feedback: fb } : x))
    try {
      await fetch('/api/chatbot', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: m.logId, feedback: fb }),
      })
    } catch {}
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%' }}>
      <TopBar title="도움말" sub="궁금한 걸 물어보세요" />

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'12px 16px 16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom:10 }}>
            <div style={{ maxWidth:'82%' }}>
              <div style={{
                padding:'10px 13px', borderRadius:14, fontSize:13.5, lineHeight:1.5, whiteSpace:'pre-wrap',
                background: m.role === 'user' ? '#1D9E75' : '#fff',
                color: m.role === 'user' ? '#fff' : '#1A2421',
                border: m.role === 'user' ? 'none' : '1.5px solid #E6EAE8',
                borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
              }}>
                {m.content}
              </div>
              {/* 피드백 버튼 (어시스턴트 답변 + logId 있을 때만) */}
              {m.role === 'assistant' && m.logId && (
                <div style={{ display:'flex', gap:6, marginTop:5, paddingLeft:4 }}>
                  {m.feedback == null ? (
                    <>
                      <button onClick={() => sendFeedback(i, 1)}
                        style={{ border:'1px solid #E6EAE8', background:'#fff', borderRadius:8, padding:'3px 9px', fontSize:12, cursor:'pointer', color:'#6B7875' }}>👍 도움됐어요</button>
                      <button onClick={() => sendFeedback(i, -1)}
                        style={{ border:'1px solid #E6EAE8', background:'#fff', borderRadius:8, padding:'3px 9px', fontSize:12, cursor:'pointer', color:'#6B7875' }}>👎 별로예요</button>
                    </>
                  ) : (
                    <span style={{ fontSize:11, color:'#B0BAB6' }}>
                      {m.feedback === 1 ? '👍 피드백 감사해요!' : '👎 운영팀이 확인할게요'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:10 }}>
            <div style={{ padding:'10px 14px', borderRadius:14, background:'#fff', border:'1.5px solid #E6EAE8', fontSize:13, color:'#B0BAB6' }}>
              답변 작성 중...
            </div>
          </div>
        )}

        {/* 추천 질문 (대화 시작 전에만) */}
        {messages.length <= 1 && !loading && (
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:11, color:'#B0BAB6', marginBottom:8, paddingLeft:2 }}>이런 걸 물어볼 수 있어요</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ border:'1.5px solid #E6EAE8', background:'#fff', borderRadius:18, padding:'7px 13px', fontSize:12.5, cursor:'pointer', color:'#1A2421' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid #EEF1F0', background:'#fff', display:'flex', gap:8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder="궁금한 걸 입력하세요"
          style={{ flex:1, padding:'11px 14px', borderRadius:22, border:'1.5px solid #E6EAE8', fontSize:13.5, outline:'none' }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ width:44, height:44, borderRadius:'50%', border:'none', background: input.trim() && !loading ? '#1D9E75' : '#D5DBD9', color:'#fff', fontSize:18, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', flexShrink:0 }}>
          ↑
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
