export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shopName, reviewText, reviewLang } = req.body;

  if (!reviewText) {
    return res.status(400).json({ error: '리뷰 내용이 필요해요' });
  }

  const langMap = { en: '영어', zh: '중국어', ko: '한국어', ja: '일본어' };
  const lang = langMap[reviewLang] || '영어';

  const prompt = `당신은 제주 관광업 숙박업체 사장님의 구글 리뷰 답변 전문가입니다.

가게 이름: ${shopName || '제주 펜션'}
리뷰 내용: ${reviewText}
리뷰 언어: ${lang}

위 리뷰에 대해 ${lang}로 따뜻하고 진심 어린 답변을 작성해주세요.
- 3~5문장 분량
- 방문에 감사하고 구체적인 내용 언급
- 재방문 유도
- 이모지 1~2개 포함
- 다른 설명 없이 답변만 출력`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '생성 실패';
    res.status(200).json({ result: text });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했어요' });
  }
}
