/**
 * api.js - 서버 API 호출 모듈
 * 파일: public/js/api.js
 *
 * 수정 포인트:
 *  - API 엔드포인트 경로 변경 시 ENDPOINTS 객체만 수정
 *  - 요청/응답 구조 변경 시 각 함수 내부만 수정
 */

const ENDPOINTS = {
  story: '/api/generate-story',
  image: '/api/generate-image',
};

/**
 * 스토리 생성 API 호출
 * @param {Object} params
 * @param {string} params.childStory - 아이의 이야기
 * @param {string} params.childName  - 아이 이름 (선택)
 * @param {string} params.age        - 나이 (선택)
 * @returns {Promise<Object>} story 객체
 */
async function fetchStory({ childStory, childName = '', age = '' }) {
  const res = await fetch(ENDPOINTS.story, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childStory, childName, age }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || '스토리 생성에 실패했습니다.');
  }

  return data;
}

/**
 * 이미지 생성 API 호출
 * @param {string} prompt    - 이미지 생성 프롬프트 (영어)
 * @param {string} apiKey    - Gemini API 키
 * @returns {Promise<{imageBase64: string, mimeType: string}>}
 */
async function fetchImage(prompt, apiKey) {
  const res = await fetch(ENDPOINTS.image, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, apiKey }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || '이미지 생성에 실패했습니다.');
  }

  return data; // { imageBase64, mimeType }
}

/**
 * 모든 페이지의 이미지를 순차 생성
 * (Gemini rate limit 방지: 페이지 사이 300ms 딜레이)
 *
 * @param {Array}    pages      - story.pages 배열
 * @param {string}   styleHint  - 삽화 스타일 프롬프트 힌트
 * @param {string}   apiKey     - Gemini API 키
 * @param {Function} onProgress - 진행 콜백: onProgress(pageIndex, result)
 * @returns {Promise<Array>} 각 페이지의 이미지 결과 배열
 */
async function fetchAllImages(pages, styleHint, apiKey, onProgress) {
  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const prompt = buildImagePrompt(pages[i].imagePrompt, styleHint);

    try {
      const imgData = await fetchImage(prompt, apiKey);
      results.push(imgData);
      if (onProgress) onProgress(i, imgData);
    } catch (err) {
      const errResult = { error: err.message };
      results.push(errResult);
      if (onProgress) onProgress(i, errResult);
    }

    // 마지막 페이지가 아니면 딜레이
    if (i < pages.length - 1) {
      await delay(300);
    }
  }

  return results;
}

/**
 * 이미지 프롬프트 조합
 * @param {string} basePrompt  - 페이지별 기본 프롬프트
 * @param {string} styleHint   - 스타일 힌트
 * @returns {string}
 */
function buildImagePrompt(basePrompt, styleHint) {
  return `${basePrompt}, ${styleHint}, no text, no words, child-friendly, safe for kids`;
}

/** 유틸: ms 딜레이 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
