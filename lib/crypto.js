import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  const raw = process.env.NAVER_SESSION_KEY
  if (!raw) throw new Error('NAVER_SESSION_KEY 환경변수가 설정되지 않았습니다')
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) {
    throw new Error('NAVER_SESSION_KEY는 32바이트(64자 hex) 문자열이어야 합니다')
  }
  return key
}

// 네이버 세션쿠키 같은 민감 데이터를 암호화해서 DB에 저장하기 위한 유틸.
// 기존 google/meta 토큰처럼 평문 저장하지 않는다 — 세션쿠키 유출 시 계정 전체가 탈취되기 때문.
export function encrypt(plainText) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decrypt({ encrypted, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
