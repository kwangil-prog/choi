/**
 * ui.js - UI 렌더링 모듈
 * 파일: public/js/ui.js
 *
 * 수정 포인트:
 *  - 카드/페이지 HTML 구조 변경 → renderPage(), renderResult()
 *  - 로딩 단계 텍스트 변경 → STEPS 상수
 *  - 배경 플로팅 이모지 변경 → FLOAT_ITEMS 상수
 */

/* ─── 상수 ──────────────────────────────────────────── */

const FLOAT_ITEMS = ['⭐', '🌟', '✨', '🌸', '🌈', '🦋', '🌙', '☁️', '🎈', '🌺'];
const FLOAT_COUNT = 18;

const STEPS = [
  { id: 'step-1', icon: '📝', label: '이야기를 동화로 변환하는 중...' },
  { id: 'step-2', icon: '🎨', label: '각 페이지의 그림을 그리는 중...' },
  { id: 'step-3', icon: '📖', label: '동화책을 완성하는 중...' },
];

/* ─── 배경 초기화 ────────────────────────────────────── */

function initBackground() {
  const container = document.getElementById('bg-floats');
  if (!container) return;

  for (let i = 0; i < FLOAT_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'float-item';
    el.textContent = FLOAT_ITEMS[i % FLOAT_ITEMS.length];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${8 + Math.random() * 14}s`;
    el.style.animationDelay = `${Math.random() * 12}s`;
    el.style.fontSize = `${1 + Math.random() * 1.5}rem`;
    container.appendChild(el);
  }
}

/* ─── API 상태 표시 ──────────────────────────────────── */

function updateApiStatus(isSet) {
  const el = document.getElementById('api-status');
  if (!el) return;

  if (isSet) {
    el.className = 'api-status set';
    el.textContent = '✅ API 키가 설정되었습니다';
  } else {
    el.className = 'api-status unset';
    el.textContent = '⚠️ API 키가 설정되지 않았습니다';
  }
}

/* ─── 에러/알림 ──────────────────────────────────────── */

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) el.innerHTML = `<div class="alert alert-error">⚠️ ${msg}</div>`;
}

function clearFormError() {
  const el = document.getElementById('form-error');
  if (el) el.innerHTML = '';
}

/* ─── 글자 수 카운터 ─────────────────────────────────── */

function updateCharCounter() {
  const ta = document.getElementById('story-input');
  const counter = document.getElementById('char-counter');
  if (!ta || !counter) return;

  const len = ta.value.length;
  counter.textContent = `${len} / 500`;
  counter.className = 'char-counter' + (len > 450 ? ' warn' : '');
}

/* ─── 화면 전환 ──────────────────────────────────────── */

function showSection(sectionId) {
  const sections = ['input-form', 'loading-box', 'result-box'];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === sectionId ? 'block' : 'none';
  });
}

/* ─── 로딩 단계 ──────────────────────────────────────── */

/**
 * 로딩 단계 상태 업데이트
 * @param {number} activeStep - 현재 진행 중인 단계 (1~3)
 */
function setLoadingStep(activeStep) {
  STEPS.forEach((step, idx) => {
    const el = document.getElementById(step.id);
    if (!el) return;
    el.className = 'step';
    if (idx + 1 < activeStep) el.classList.add('done');
    if (idx + 1 === activeStep) el.classList.add('active');
  });
}

/* ─── 결과 렌더링 ────────────────────────────────────── */

/**
 * 전체 결과 화면 렌더링
 * @param {Object} story      - 스토리 데이터
 * @param {Array}  pageImages - 각 페이지 이미지 결과 배열
 */
function renderResult(story, pageImages) {
  // 제목
  document.getElementById('story-title').textContent = `📖 ${story.title}`;

  // 등장인물
  const charsEl = document.getElementById('characters-row');
  charsEl.innerHTML = (story.characters || [])
    .map((c) => `<span class="char-tag">👤 ${c}</span>`)
    .join('');

  // 탭
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = story.pages
    .map((p, i) =>
      `<button class="tab-btn${i === 0 ? ' active' : ''}" onclick="App.showPage(${i})">
        ${p.pageNumber}페이지
      </button>`
    )
    .join('');

  // 페이지 콘텐츠
  const pagesEl = document.getElementById('pages-container');
  pagesEl.innerHTML = story.pages
    .map((page, i) => renderPage(page, i, pageImages[i], story.pages.length))
    .join('');

  // 교훈
  const moralEl = document.getElementById('moral-box');
  moralEl.innerHTML = `<div class="icon">⭐</div><p>💬 ${story.moral}</p>`;
}

/**
 * 단일 페이지 HTML 생성
 * @param {Object} page       - 페이지 데이터
 * @param {number} idx        - 페이지 인덱스
 * @param {Object} imgData    - 이미지 결과 (imageBase64/mimeType 또는 error)
 * @param {number} totalPages - 전체 페이지 수
 * @returns {string} HTML 문자열
 */
function renderPage(page, idx, imgData, totalPages) {
  return `
    <div class="page-content${idx === 0 ? ' active' : ''}" id="page-${idx}">
      <div class="page-image-wrap">
        ${renderPageImage(idx, imgData, page)}
      </div>
      <div class="page-text">${page.text}</div>
      <div class="page-nav">
        <button
          class="btn btn-small btn-secondary"
          onclick="App.prevPage(${idx})"
          ${idx === 0 ? 'disabled' : ''}
        >← 이전</button>

        <span class="page-indicator">${page.pageNumber} / ${totalPages}</span>

        <button
          class="btn btn-small btn-primary"
          onclick="App.nextPage(${idx})"
          ${idx === totalPages - 1 ? 'disabled' : ''}
        >다음 →</button>
      </div>
    </div>
  `;
}

/**
 * 페이지 이미지 영역 HTML 생성
 * (성공 / 오류 / 로딩 중 세 가지 상태)
 */
function renderPageImage(idx, imgData, page) {
  if (!imgData) {
    return `<div class="image-placeholder"><div class="icon">🎨</div><div>이미지 없음</div></div>`;
  }

  if (imgData.imageBase64) {
    return `<img src="data:${imgData.mimeType};base64,${imgData.imageBase64}" alt="${page.pageNumber}페이지 삽화" />`;
  }

  // 오류 상태
  return `
    <div class="image-error">
      <div class="icon">⚠️</div>
      <div>이미지 생성 실패</div>
      <div class="error-detail">${imgData.error.slice(0, 80)}</div>
      <button class="btn btn-small btn-accent" onclick="App.retryImage(${idx})">
        🔄 다시 시도
      </button>
    </div>
  `;
}

/**
 * 이미지 재시도 중 로딩 HTML
 */
function renderImageLoading() {
  return `
    <div class="image-placeholder">
      <div class="loading-spinner" style="width:40px;height:40px;border-width:4px;"></div>
      <div>다시 그리는 중...</div>
    </div>
  `;
}

/* ─── 탭 전환 ────────────────────────────────────────── */

function switchTab(idx) {
  document.querySelectorAll('.page-content').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.tab-btn').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}
