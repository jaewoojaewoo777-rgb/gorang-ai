import { supabaseAdmin } from './db'

// 이번 주 월요일 날짜 반환 (YYYY-MM-DD)
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=일, 1=월 ...
  const diff = day === 0 ? -6 : 1 - day // 월요일로
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0] // 'YYYY-MM-DD'
}

// 지난 주 월요일 날짜 반환
function getLastWeekStart(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - 7)
  return getWeekStart(d)
}

/**
 * 업로드 완료 시 streak 업데이트
 * youtube/tiktok/instagram 업로드 완료 후 호출
 */
export async function updateStreak(userId) {
  try {
    const thisWeek = getWeekStart()
    const lastWeek = getLastWeekStart()

    // 1. 이번 주 upload_streaks upsert (업로드 횟수 +1)
    const { data: existing } = await supabaseAdmin
      .from('upload_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', thisWeek)
      .single()

    if (existing) {
      // 이미 이번 주 기록 있으면 count만 +1
      await supabaseAdmin
        .from('upload_streaks')
        .update({
          upload_count: existing.upload_count + 1,
          goal_met: true, // 1회 이상이면 목표 달성
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('week_start', thisWeek)
    } else {
      // 이번 주 첫 업로드
      await supabaseAdmin
        .from('upload_streaks')
        .insert({
          user_id: userId,
          week_start: thisWeek,
          upload_count: 1,
          goal_met: true,
        })
    }

    // 2. streak summary 계산
    const { data: summary } = await supabaseAdmin
      .from('user_streak_summary')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 지난 주에 업로드했는지 확인
    const { data: lastWeekData } = await supabaseAdmin
      .from('upload_streaks')
      .select('goal_met')
      .eq('user_id', userId)
      .eq('week_start', lastWeek)
      .single()

    const lastWeekMet = lastWeekData?.goal_met || false
    const prevStreak = summary?.current_streak || 0

    let newStreak
    if (existing) {
      // 이미 이번 주 업로드한 적 있으면 streak 변화 없음
      newStreak = prevStreak
    } else if (lastWeekMet) {
      // 지난 주도 달성 → 연속 +1
      newStreak = prevStreak + 1
    } else {
      // 지난 주 없으면 1로 리셋
      newStreak = 1
    }

    const longestStreak = Math.max(summary?.longest_streak || 0, newStreak)

    // 3. summary upsert
    await supabaseAdmin
      .from('user_streak_summary')
      .upsert({
        user_id: userId,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_upload_week: thisWeek,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    console.log(`[Streak] userId=${userId} streak=${newStreak}주 연속`)
    return { currentStreak: newStreak, longestStreak }

  } catch (err) {
    // streak 실패가 업로드 실패로 이어지면 안 됨 → 에러 삼킴
    console.error('[Streak] 업데이트 실패:', err.message)
    return null
  }
}

/**
 * 사용자 streak 조회
 */
export async function getStreak(userId) {
  try {
    const { data: summary } = await supabaseAdmin
      .from('user_streak_summary')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!summary) return { currentStreak: 0, longestStreak: 0 }

    // 이번 주 업로드 여부
    const thisWeek = getWeekStart()
    const { data: thisWeekData } = await supabaseAdmin
      .from('upload_streaks')
      .select('upload_count, goal_met')
      .eq('user_id', userId)
      .eq('week_start', thisWeek)
      .single()

    return {
      currentStreak: summary.current_streak,
      longestStreak: summary.longest_streak,
      thisWeekCount: thisWeekData?.upload_count || 0,
      thisWeekMet: thisWeekData?.goal_met || false,
      lastUploadWeek: summary.last_upload_week,
    }
  } catch (err) {
    console.error('[Streak] 조회 실패:', err.message)
    return { currentStreak: 0, longestStreak: 0, thisWeekCount: 0, thisWeekMet: false }
  }
}
