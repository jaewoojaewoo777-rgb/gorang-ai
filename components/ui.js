'use client'
import { useRouter, usePathname } from 'next/navigation'

export function BottomNav() {
  const router = useRouter()
  const path = usePathname()
  const items = [
    { href: '/home', icon: '🏠', label: '홈' },
    { href: '/video', icon: '🎬', label: '영상' },
    { href: '/review', icon: '💬', label: '리뷰' },
    { href: '/stats', icon: '📊', label: '성과' },
    { href: '/settings', icon: '⚙️', label: '설정' },
  ]
  return (
    <div style={{ display:'flex', borderTop:'1.5px solid #E6EAE8', background:'#fff', padding:'10px 0 14px', flexShrink:0 }}>
      {items.map(item => {
        const active = path === item.href
        return (
          <button key={item.href} onClick={() => router.push(item.href)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'2px 0', border:'none', background:'transparent', cursor:'pointer' }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontSize:9, fontWeight:500, color: active ? '#1D9E75' : '#B0BAB6', fontFamily:'Noto Sans KR, sans-serif' }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TopBar({ title, sub, onBack }) {
  const router = useRouter()
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'18px 18px 12px' }}>
      <button onClick={onBack || (() => router.back())}
        style={{ width:34, height:34, borderRadius:'50%', border:'1.5px solid #E6EAE8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#6B7875', cursor:'pointer', background:'#fff', flexShrink:0 }}>
        ←
      </button>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:'#1A2421' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'#B0BAB6', marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

export function PrimaryBtn({ children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width:'100%', padding:14, borderRadius:14, border:'none', background: disabled ? '#B0BAB6' : '#1D9E75', color:'#fff', fontSize:15, fontWeight:700, fontFamily:'Noto Sans KR, sans-serif', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}>
      {children}
    </button>
  )
}

export function GhostBtn({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick}
      style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'#F4F6F5', color:'#1A2421', fontSize:15, fontWeight:700, fontFamily:'Noto Sans KR, sans-serif', cursor:'pointer', ...style }}>
      {children}
    </button>
  )
}

export function Card({ children, teal, style = {} }) {
  return (
    <div style={{ background: teal ? '#E1F5EE' : '#fff', border: `1.5px solid ${teal ? '#5DCAA5' : '#E6EAE8'}`, borderRadius:14, padding:'14px 16px', marginBottom:10, ...style }}>
      {children}
    </div>
  )
}

export function StatCard({ value, label, green }) {
  return (
    <div style={{ background:'#F4F6F5', borderRadius:10, padding:12, textAlign:'center' }}>
      <div style={{ fontSize:20, fontWeight:700, color: green ? '#1D9E75' : '#1A2421' }}>{value}</div>
      <div style={{ fontSize:10, color:'#B0BAB6', marginTop:2 }}>{label}</div>
    </div>
  )
}

export function LoadingDots() {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', padding:'4px 0' }}>
      <div className="loading-dot" />
      <div className="loading-dot" />
      <div className="loading-dot" />
    </div>
  )
}

export function AiBox({ children, label = '✦ AI 생성 결과' }) {
  return (
    <div style={{ background:'#E1F5EE', borderRadius:14, padding:14, border:'1.5px solid #5DCAA5', marginBottom:12 }}>
      <div style={{ fontSize:10, color:'#0F6E56', fontWeight:700, marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:13, color:'#1A2421', lineHeight:1.7, whiteSpace:'pre-line' }}>{children}</div>
    </div>
  )
}

export function Badge({ children, type = 'wait' }) {
  const styles = {
    wait: { background:'#FAEEDA', color:'#854F0B' },
    done: { background:'#E1F5EE', color:'#0F6E56' },
    auto: { background:'#EEEDFE', color:'#534AB7' },
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20, ...styles[type] }}>
      {children}
    </span>
  )
}
