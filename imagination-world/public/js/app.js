/**
 * app.js - 메인 진입점 & 상태 관리
 * 파일: public/js/app.js
 *
 * 수정 포인트:
 *  - 삽화 스타일 추가/변경 → STYLE_PROMPTS 객체
 *  - localStorage 키 변경 → STORAGE_KEY 상수
 *  - 생성 흐름 변경 → App.generate() 함수
 */

/* ─── 삽화 스타일 프롬프트 힌트 ──────────────────────── */
// 새 스타일 추가 시 여기에 추가하고 index.html <select>에도 option 추가
const STYLE_PROMPTS = {
  watercolor: "soft watercolor illustration, children's book art style, warm pastel colors",
  cartoon:    "cute cartoon illustration, vibrant colors, bold outlines, cheerful children's animation style",
  dreamlike:  "dreamy magical illustration, ethereal glowing light, fantasy art, mystical atmosphere",
  pixel:      "cute pixel art, 16-bit video game style, colorful pixels, retro charm",
  pastel:     "soft pastel illustration, kawaii style, gentle colors, adorable characters",
};

const STORAGE_KEY = 'gemini_api_key';

/* ─── 앱 상태 ────────────────────────────────────────── */
const state = {
  geminiApiKey: '',
  story: null,
  pageImages: [],
  currentPage: 0,
  selectedStyle: 'watercolor',
};

/* ─── API 키 관리 ────────────────────────────────────── */

function loadApiKey() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state.geminiApiKey = saved;
    document.getElementById('gemini-key-input').value = saved;
    updateApiStatus(true);
  }
  updateGenerateBtn();
}

function saveApiKey() {
  const val = document.getElementById('gemini-key-input').value.trim();
  if (!val) {
    alert('API 키를 입력해주세요.');
    return;
  }
  state.geminiApiKey = val;
  localStorage.setItem(STORAGE_KEY, val);
  updateApiStatus(true);
  updateGenerateBtn();
}

function clearApiKey() {
  state.geminiApiKey = '';
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('gemini-key-input').value = '';
  updateApiStatus(false);
  updateGenerateBtn();
}

/** 생성 버튼 활성/비활성 (API 키 유무에 따라) */
function updateGenerateBtn() {
  const btn = document.querySelector('.generate-btn');
  if (!btn) return;
  const hasKey = !!state.geminiApiKey;
  btn.disabled = !hasKey;
  btn.title = hasKey ? '' : 'Gemini API 키를 먼저 저장해주세요';
}

/* ─── 입력값 읽기 ────────────────────────────────────── */

function getFormValues() {
  return {
    childStory: document.getElementById('story-input').value.trim(),
    childName:  document.getElementById('child-name').value.trim(),
    age:        document.getElementById('child-age').value.trim(),
    style:      document.getElementById('story-style').value,
  };
}

/* ─── 유효성 검사 ────────────────────────────────────── */

function validate({ childStory }) {
  if (!childStory) {
    showFormError('아이의 이야기를 입력해주세요!');
    return false;
  }
  return true;
}

/* ─── 메인 생성 흐름 ─────────────────────────────────── */

async function generate() {
  clearFormError();

  const formValues = getFormValues();
  if (!validate(formValues)) return;

  const { childStory, childName, age, style } = formValues;
  state.selectedStyle = style;

  // 로딩 화면으로 전환
  showSection('loading-box');
  setLoadingStep(1);

  try {
    // 1단계: 스토리 생성
    state.story = await fetchStory({ childStory, childName, age });

    // 2단계: 이미지 생성
    setLoadingStep(2);
    const styleHint = STYLE_PROMPTS[style] || STYLE_PROMPTS.watercolor;
    state.pageImages = await fetchAllImages(
      state.story.pages,
      styleHint,
      state.geminiApiKey,
      // 진행 콜백 (필요 시 여기서 퍼센트 UI 등 업데이트 가능)
      (_idx, _result) => {}
    );

    // 3단계: 완성
    setLoadingStep(3);
    await new Promise((r) => setTimeout(r, 500));

    renderResult(state.story, state.pageImages);
    showSection('result-box');
    document.getElementById('result-box').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showSection('input-form');
    showFormError(`오류가 발생했습니다: ${err.message}`);
  }
}

/* ─── 페이지 탭 제어 ─────────────────────────────────── */

function showPage(idx) {
  state.currentPage = idx;
  switchTab(idx);
}

function prevPage(idx) {
  if (idx > 0) showPage(idx - 1);
}

function nextPage(idx) {
  if (state.story && idx < state.story.pages.length - 1) showPage(idx + 1);
}

/* ─── 이미지 개별 재시도 ─────────────────────────────── */

async function retryImage(idx) {
  if (!state.story || !state.geminiApiKey) return;

  const page = state.story.pages[idx];
  const styleHint = STYLE_PROMPTS[state.selectedStyle] || STYLE_PROMPTS.watercolor;
  const prompt = buildImagePrompt(page.imagePrompt, styleHint);

  // 로딩 상태로 교체
  const wrap = document.querySelector(`#page-${idx} .page-image-wrap`);
  if (wrap) wrap.innerHTML = renderImageLoading();

  try {
    const imgData = await fetchImage(prompt, state.geminiApiKey);
    state.pageImages[idx] = imgData;
    if (wrap) {
      wrap.innerHTML = `<img src="data:${imgData.mimeType};base64,${imgData.imageBase64}" alt="${page.pageNumber}페이지 삽화" />`;
    }
  } catch (err) {
    state.pageImages[idx] = { error: err.message };
    if (wrap) {
      wrap.innerHTML = renderPageImage(idx, state.pageImages[idx], page);
    }
  }
}

/* ─── 텍스트 복사 ────────────────────────────────────── */

async function copyText() {
  if (!state.story) return;

  let text = `📖 ${state.story.title}\n\n`;
  state.story.pages.forEach((p) => {
    text += `【${p.pageNumber}페이지】\n${p.text}\n\n`;
  });
  text += `⭐ 교훈: ${state.story.moral}`;

  try {
    await navigator.clipboard.writeText(text);
    alert('텍스트가 클립보드에 복사되었습니다! 📋');
  } catch {
    alert('복사에 실패했습니다. 텍스트를 직접 선택해 복사해주세요.');
  }
}

/* ─── 앱 초기화 ──────────────────────────────────────── */

function resetApp() {
  state.story = null;
  state.pageImages = [];
  state.currentPage = 0;

  document.getElementById('story-input').value = '';
  document.getElementById('child-name').value = '';
  document.getElementById('child-age').value = '';
  updateCharCounter();
  clearFormError();

  showSection('input-form');
  updateGenerateBtn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── 전역 노출 (HTML onclick에서 사용) ──────────────── */
// HTML에서 onclick="App.xxx()" 형태로 호출
const App = {
  generate,
  showPage,
  prevPage,
  nextPage,
  retryImage,
  copyText,
  resetApp,
  saveApiKey,
  clearApiKey,
};

/* ─── DOMContentLoaded ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initBackground();
  loadApiKey();

  // 글자 수 카운터 이벤트
  const ta = document.getElementById('story-input');
  if (ta) ta.addEventListener('input', updateCharCounter);
});
