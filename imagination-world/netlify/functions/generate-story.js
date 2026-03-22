const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function generateTemplateStory(childStory, childName, age) {
  const name = childName || '주인공';
  const ageText = age ? `${age}살` : '';
  const storySnippet = childStory.slice(0, 30);

  return {
    title: `${name}의 신기한 모험`,
    pages: [
      {
        pageNumber: 1,
        text: `옛날 옛날에 ${ageText} ${name}이(가) 살았어요. 어느 날 ${name}은(는) "${storySnippet}..."라고 상상하기 시작했어요.`,
        imagePrompt: `A cheerful child named ${name} standing in a magical forest, children's book illustration style, soft watercolor colors`,
      },
      {
        pageNumber: 2,
        text: `${name}은(는) 용감하게 앞으로 나아갔어요. 반짝이는 빛이 길을 안내해 주었고, 신비로운 동물 친구들이 나타났어요.`,
        imagePrompt: `Magical glowing path in an enchanted forest with cute animals, children's book illustration style, warm pastel colors`,
      },
      {
        pageNumber: 3,
        text: `길을 가다가 큰 문제를 만났지만 ${name}은(는) 포기하지 않았어요. "할 수 있어!" 라고 외치며 용기를 냈어요.`,
        imagePrompt: `Brave child overcoming a challenge in a magical land, determined expression, children's book illustration style`,
      },
      {
        pageNumber: 4,
        text: `마침내 ${name}은(는) 목표에 도달했어요! 친구들과 함께 기쁨을 나누며 소중한 교훈을 배웠답니다.`,
        imagePrompt: `Happy child celebrating victory with animal friends in a colorful magical setting, children's book illustration style`,
      },
    ],
    moral: '용기를 내면 어떤 어려움도 이겨낼 수 있어요.',
    characters: [name, '숲 속 동물 친구들', '마법의 빛'],
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '허용되지 않는 메서드입니다.' }),
    };
  }

  let childStory, childName, age;
  try {
    const body = JSON.parse(event.body);
    childStory = body.childStory;
    childName = body.childName || '';
    age = body.age || '';
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
    };
  }

  if (!childStory) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '이야기 내용이 필요합니다.' }),
    };
  }

  const claudeApiKey = process.env.CLAUDE_API_KEY;

  if (!claudeApiKey) {
    const story = generateTemplateStory(childStory, childName, age);
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    };
  }

  const systemPrompt = `당신은 아이들을 위한 동화 작가입니다. 아이가 말한 이야기나 상상을 4~6페이지의 따뜻하고 교훈적인 동화로 변환해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명은 포함하지 마세요:

{
  "title": "동화 제목",
  "pages": [
    {
      "pageNumber": 1,
      "text": "페이지 내용 (2~3문장, 따뜻하고 아이에게 적합한 내용)",
      "imagePrompt": "영어로 작성된 이미지 생성 프롬프트, children's book illustration style 명시, 구체적이고 시각적인 묘사"
    }
  ],
  "moral": "이 동화에서 배울 수 있는 교훈 한 문장",
  "characters": ["등장인물1", "등장인물2"]
}

주의사항:
- 아이의 이야기를 존중하되 창의적으로 발전시켜 주세요
- 페이지 수는 4~6개로 유지하세요
- 각 페이지 텍스트는 한국어로 작성하세요
- imagePrompt는 반드시 영어로 작성하고 children's book illustration style을 명시하세요
- 아이의 이름이 제공된 경우 동화에 포함시켜 주세요`;

  const userMessage = `아이 이름: ${childName || '(미입력)'}
나이: ${age || '(미입력)'}
아이의 이야기/상상: ${childStory}

위 내용을 바탕으로 따뜻한 동화를 만들어 주세요.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || '스토리 생성에 실패했습니다.';
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: errMsg }),
      };
    }

    let rawText = data?.content?.[0]?.text || '';
    rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const story = JSON.parse(rawText);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    };
  } catch (err) {
    // Claude 오류 시 템플릿 폴백
    const story = generateTemplateStory(childStory, childName, age);
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    };
  }
};
