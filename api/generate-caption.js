export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shopName, shopLoc, shopType } = req.body;

  if (!shopName) {
    return res.status(400).json({ error: '가게 이름이 필요해요' });
  }

  const prompt = `당신은 제주 관광업 SNS 마케팅 전문가입니다.

가게 정보:
- 이름: ${shopName}
- 위치: ${shopLoc || '제주도'}
- 업종: ${shopType === 'cafe' ? '카페' : '펜션/숙박'}

아래 3개 언어로 인스타그램/유튜브/틱톡 영상 캡션을 각각 작성해주세요.
각 언어 앞에 국기 이모지를 붙이고, 해시태그 3개씩 포함해주세요.
설명 없이 캡션만 출력하세요.

🇺🇸 영어 캡션:
🇨🇳 중국어 캡션:
🇯🇵 일본어 캡션:`;

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
        max_tokens: 800,
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
