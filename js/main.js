(() => {
  // ---------- 1. 사진 연결 ----------
  // data-img 에 assets/images/... 경로(내 사진) 또는 Wikimedia Commons 파일명을 적습니다.
  // "사진A|사진B" 처럼 적으면 A가 안 열릴 때 B를 씁니다. 모두 실패하면 .img-fallback 화면이 나옵니다.
  const TIMEOUT_MS = 12000;
  const isLocal = name => name.startsWith('assets/');
  const commonsUrl = name =>
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=1400`;

  const loadImage = url => new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('error')); };
    img.src = url;
  });

  const applyImage = async el => {
    const names = el.dataset.img.split('|').map(n => n.trim()).filter(Boolean);
    el.classList.remove('img-ready', 'img-fallback');
    el.classList.add('img-loading');
    for (const name of names) {
      try {
        const url = await loadImage(isLocal(name) ? encodeURI(name) : commonsUrl(name));
        el.style.backgroundImage = `url("${url}")`;
        el.classList.remove('img-loading');
        el.classList.add('img-ready');
        return true;
      } catch (e) { /* 다음 후보 시도 */ }
    }
    el.classList.remove('img-loading');
    el.classList.add('img-fallback');
    return false;
  };
  const hydrate = root => root.querySelectorAll('[data-img]').forEach(el => applyImage(el));

  const imageJobs = new Map();
  document.querySelectorAll('[data-img]').forEach(el => imageJobs.set(el, applyImage(el)));

  // ---------- 2. 히어로 슬라이드 : 외관 → 내부 → 기념품 ----------
  const hero = document.querySelector('.hero');
  const allShots = [...document.querySelectorAll('.reel__shot')];
  const label = document.getElementById('heroLabel');
  const bar = document.getElementById('heroBar');
  const dotsBox = document.getElementById('heroDots');
  const nowEl = document.getElementById('heroNow');
  const totalEl = document.getElementById('heroTotal');
  const SHOT_MS = 6000;
  const pad = n => String(n).padStart(2, '0');
  let shots = allShots.slice();   // 불러오기에 실패한 컷은 순서에서 빠집니다
  let current = null;
  let timer = null;

  const renderDots = () => {
    dotsBox.innerHTML = '';
    shots.forEach((shot, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', `${i + 1}번 사진`);
      b.classList.toggle('is-on', shot === current);
      b.addEventListener('click', () => go(shot, shots.indexOf(shot) < shots.indexOf(current) ? -1 : 1));
      dotsBox.append(b);
    });
    totalEl.textContent = pad(shots.length);
    nowEl.textContent = pad(Math.max(1, shots.indexOf(current) + 1));
  };

  // dir 1 = 오른쪽에서 들어옴, -1 = 왼쪽에서 들어옴
  const go = (next, dir = 1) => {
    if (!next || next === current) return;
    const prev = current;
    // 들어올 사진을 시작 위치로 순간 이동
    next.style.transition = 'none';
    next.style.translate = dir > 0 ? '100% 0' : '-100% 0';
    void next.offsetWidth;
    next.style.transition = '';
    next.style.translate = '';
    allShots.forEach(s => s.classList.remove('is-on', 'is-out'));
    next.classList.add('is-on');
    if (prev) {
      prev.style.translate = dir > 0 ? '-30% 0' : '30% 0';
      prev.classList.add('is-out');
      setTimeout(() => { if (prev !== current) prev.style.translate = ''; }, 1200);
    }
    current = next;
    label.style.opacity = 0;
    setTimeout(() => { label.textContent = next.dataset.label; label.style.opacity = 1; }, 400);
    bar.style.transition = 'none';
    bar.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${SHOT_MS}ms linear`;
      bar.style.width = '100%';
    }));
    renderDots();
    restart();
  };

  // 아직 불러오는 중인 사진은 빈 화면이 되지 않도록 건너뜁니다
  const isShowable = shot => !shot.classList.contains('img-loading');
  const step = dir => {
    if (!shots.length) return;
    const i = shots.indexOf(current);
    for (let k = 1; k <= shots.length; k++) {
      const next = shots[(i + dir * k + shots.length * k) % shots.length];
      if (isShowable(next)) return go(next, dir);
    }
  };
  const restart = () => { clearInterval(timer); timer = setInterval(() => step(1), SHOT_MS); };

  document.getElementById('heroNext').addEventListener('click', () => step(1));
  document.getElementById('heroPrev').addEventListener('click', () => step(-1));
  let touchX = null;
  hero.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  // 그리드 슬라이드(대표 상품 모음)는 자체 data-img 가 없으므로 항상 표시
  allShots.forEach(shot => (imageJobs.get(shot) || Promise.resolve(true)).then(ok => {
    if (ok) return;
    if (shot === current) step(1);
    shots = shots.filter(s => s !== shot);
    shot.classList.remove('is-on');
    if (!shots.length) { hero.classList.add('hero--fallback'); clearInterval(timer); }
    renderDots();
  }));

  go(shots[0]);

  // ---------- 3. 온천 김(steam) 캔버스 ----------
  const canvas = document.getElementById('steam');
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, puffs = [];

  const resize = () => {
    W = canvas.width = hero.clientWidth;
    H = canvas.height = hero.clientHeight;
  };
  const makePuff = (initial) => ({
    x: Math.random() * W,
    y: initial ? Math.random() * H : H + 80,
    r: 80 + Math.random() * 160,
    vy: 0.25 + Math.random() * 0.55,
    vx: (Math.random() - 0.5) * 0.3,
    a: 0.05 + Math.random() * 0.07,
    phase: Math.random() * Math.PI * 2
  });
  const tick = t => {
    ctx.clearRect(0, 0, W, H);
    puffs.forEach((p, i) => {
      p.y -= p.vy;
      p.x += p.vx + Math.sin(t / 2400 + p.phase) * 0.35;
      p.r += 0.12;
      const life = Math.min(1, p.y / H + 0.15);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255,255,255,${p.a * life})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.y + p.r < 0) puffs[i] = makePuff(false);
    });
    requestAnimationFrame(tick);
  };
  if (!reduce) {
    resize();
    puffs = Array.from({ length: 26 }, () => makePuff(true));
    window.addEventListener('resize', resize);
    requestAnimationFrame(tick);
  }

  // ---------- 4. 헤더 / 메뉴와 화면 전환 ----------
  const header = document.getElementById('header');
  const toTop = document.getElementById('toTop');
  const onScroll = () => {
    header.classList.toggle('is-solid', window.scrollY > hero.clientHeight - 80);
    toTop.classList.toggle('is-on', window.scrollY > 400);
  };
  toTop.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', e => {
    if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.classList.remove('is-open'); }
  });

  const validPages = ['home', 'about', 'reservation', 'shop'];
  const showPage = (page, push = true) => {
    if (!validPages.includes(page)) page = 'home';
    document.querySelectorAll('.page-panel').forEach(panel => {
      panel.hidden = panel.dataset.view !== page;
    });
    document.body.className = document.body.className.replace(/\bview-\w+\b/g, '').trim();
    document.body.classList.add(`view-${page}`);
    document.querySelectorAll('.nav [data-page]').forEach(link => link.classList.toggle('is-active', link.dataset.page === page));
    if (push && location.hash !== `#${page}`) history.pushState({ page }, '', `#${page}`);
    window.scrollTo({ top: 0, behavior: push ? 'smooth' : 'auto' });
    onScroll();
  };
  document.querySelectorAll('[data-page]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    showPage(link.dataset.page);
  }));
  window.addEventListener('popstate', () => showPage(location.hash.slice(1), false));

  // ---------- 5. 스크롤 등장 애니메이션 ----------
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 0.12}s`;
    io.observe(el);
  });

  // ---------- 6. 아코디언 : 하나만 열기 ----------
  const items = document.querySelectorAll('.accordion details');
  items.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
  }));

  // ---------- 7. 객실 · 온천 데이터 ----------
  // 객실 사진은 Wikimedia Commons 실사 사진(사람 없는 객실 내부)입니다.
  const B = 'assets/images/baths/';
  const A = 'assets/images/';
  const ITEMS = [
    { id: 'room-moon', type: 'hotel', name: '달빛 다다미 객실',
      img: 'Kasumi room - Takahan ryokan - Gala Yuzawa, Niigata Prefecture, Japan - DSC09391.JPG|Ryokan Matsumae in Nara.jpg|Interior of a ryokan room (2999708441).jpg',
      desc: '등불 하나와 이불 두 채, 창밖으로 밤바다를 달리는 열차가 보이는 달과 용신을 위한 고요한 다다미 객실입니다.',
      kind: '다다미 객실', size: '10첩', base: 2, max: 2, price: 32000, unit: '1박',
      feats: ['이불 2채 · 좌탁 · 다과', '도코노마 족자와 꽃', '밤바다 전망 창'] },
    { id: 'room-garden', type: 'hotel', name: '정원 노천탕 객실',
      img: 'Tawaraya Ryokan, Kyoto 02.jpg|Tawaraya Ryokan, Kyoto 03.jpg|Ryokan roomIMG 0819C.JPG',
      desc: '전용 석탕과 작은 정원을 갖춘 귀빈실로, 정원을 바라보며 조용히 쉬어가실 수 있습니다.',
      kind: '귀빈실', size: '14첩', base: 2, max: 4, price: 48000, unit: '1박',
      feats: ['전용 석탕', '안뜰 정원', '다도 세트'] },
    { id: 'room-hall', type: 'hotel', name: '대신령 연회 객실',
      img: 'Fukiage Palace - interior 01.jpg|Fukiage Palace - interior 02.jpg|Tawaraya Ryokan, Kyoto 01.jpg',
      desc: '금빛 장지문과 높은 격자 천장 아래, 큰 몸집의 신과 수행단이 함께 머물며 연회를 여는 넓은 객실입니다.',
      kind: '연회 객실', size: '60첩', base: 6, max: 8, price: 72000, unit: '1박',
      feats: ['연회상 차림 가능', '이불 8채 준비', '바다 열차 전망 툇마루'] },

    { id: 'bath-rooftop', type: 'shared', name: '전망 노천탕', img: B + 'rooftop-view.jpg',
      desc: '구름 위에서 내려온 하늘의 신을 맞는 옥상탕입니다.', hours: '해 질 녘 – 자정',
      max: 6, price: 1500, child: 800, unit: '1柱 1회', feats: ['산과 바다 전망', '수건 · 유카타 포함'] },
    { id: 'bath-thatched', type: 'shared', name: '초가지붕 유백색 노천탕', img: B + 'thatched-milky.jpg',
      desc: '숲의 신령이 머무는 초가지붕 아래 푸른빛 원천입니다.', hours: '해 질 녘 – 동틀 녘',
      max: 6, price: 1500, child: 800, unit: '1柱 1회', feats: ['유백색 유황천', '숲속 바위탕'] },
    { id: 'bath-snow', type: 'shared', name: '설경 노천탕', img: B + 'snow-rotenburo.jpg',
      desc: '눈의 신이 겨울마다 찾는 산자락 노천탕입니다.', hours: '겨울 한정 · 해 질 녘 – 동틀 녘',
      max: 6, price: 1800, child: 900, unit: '1柱 1회', feats: ['겨울 한정 운영', '고드름 설경'] },
    { id: 'bath-mural', type: 'shared', name: '타일 벽화 대욕장', img: A + 'interior-mural.jpg',
      desc: '큰 몸집의 신도 넉넉한 벽화 대욕장입니다.', hours: '해 질 녘 – 동틀 녘',
      max: 6, price: 1200, child: 600, unit: '1柱 1회', feats: ['산 그림 타일 벽화', '가장 넓은 탕'] },
    { id: 'bath-sea', type: 'shared', name: '바다 노천탕', img: B + 'sea-rock.jpg',
      desc: '바다의 신이 썰물 때 쉬어가는 바위탕입니다.', hours: '썰물 때 운영',
      max: 6, price: 1500, child: 800, unit: '1柱 1회', feats: ['바닷가 바위 노천탕', '물때표 확인 필수'] },
    { id: 'bath-autumn', type: 'private', name: '단풍 계곡 전세 노천탕', img: B + 'autumn-private.jpg',
      desc: '산신께서 홀로 쉬시는 계곡의 나무 욕조입니다.', hours: '50분 단위 예약',
      max: 4, price: 6000, unit: '50분', feats: ['나무 욕조', '계곡 물소리', '1~4柱 전세'] },
    { id: 'bath-night', type: 'private', name: '야간 암반 전세탕', img: B + 'night-rock.jpg',
      desc: '밤의 신을 위해 등불만 밝힌 암반탕입니다.', hours: '50분 단위 예약',
      max: 4, price: 6000, unit: '50분', feats: ['바위 욕조', '은은한 등불', '1~4柱 전세'] },
    { id: 'bath-stone', type: 'private', name: '김 오르는 바위 전세탕', img: B + 'private-stone.jpg',
      desc: '통바위를 파낸 욕조와 휴식 데크가 있는 전세탕입니다.', hours: '50분 단위 예약',
      max: 3, price: 7000, unit: '50분', feats: ['통바위 욕조', '라탄 휴식 의자', '1~3柱 전세'] },
  ];
  const TYPE_LABEL = { hotel: '객실', shared: '공용 온천', private: '개인 온천' };
  const won = n => `¥${n.toLocaleString('ja-JP')}`;
  const byId = id => ITEMS.find(i => i.id === id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- 8. 카드 목록 + 상세 패널 ----------
  const grid = document.getElementById('optionGrid');
  grid.innerHTML = ITEMS.map(it => `
      <label class="option is-in" data-type="${it.type}" data-id="${it.id}">
        <input type="radio" name="pick" value="${it.id}">
        <figure data-img="${esc(it.img)}" data-ph="${it.type === 'hotel' ? '客' : '湯'}"><span class="option__badge option__badge--${it.type}">${TYPE_LABEL[it.type]}</span></figure>
        <strong>${esc(it.name)}</strong>
        <p>${esc(it.desc)}</p>
        <em>${it.type === 'hotel' ? `${it.kind} · 기본 ${it.base}柱 · 최대 ${it.max}柱` : `${TYPE_LABEL[it.type]} · ${it.hours}`}</em>
      </label>`).join('');
  hydrate(grid);

  const detail = document.getElementById('detail');
  let selected = null;
  const showDetail = id => {
    const it = byId(id);
    selected = it;
    const img = document.getElementById('detailImg');
    img.dataset.img = it.img;
    img.dataset.ph = it.type === 'hotel' ? '客' : '湯';
    applyImage(img);
    document.getElementById('detailBadge').textContent = TYPE_LABEL[it.type];
    document.getElementById('detailBadge').className = `detail__badge detail__badge--${it.type}`;
    document.getElementById('detailName').textContent = it.name;
    document.getElementById('detailDesc').textContent = it.desc;
    const spec = it.type === 'hotel'
      ? [['객실 형태', `${it.kind} · ${it.size}`], ['인원', `기본 ${it.base}柱 · 최대 ${it.max}柱`], ['이용', '체크인 해 질 녘 · 체크아웃 동틀 녘']]
      : [['구분', TYPE_LABEL[it.type]], ['이용 시간', it.hours], ['인원', `최대 ${it.max}柱`]];
    document.getElementById('detailSpec').innerHTML = spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    document.getElementById('detailFeats').innerHTML = it.feats.map(f => `<li>${esc(f)}</li>`).join('');
    document.getElementById('detailPrice').innerHTML = `<small>${it.unit}</small> ${won(it.price)}${it.child ? ` <small>· 어린 신 ${won(it.child)}</small>` : ''}`;
    detail.hidden = false;
    detail.classList.remove('is-open');
    void detail.offsetWidth;
    detail.classList.add('is-open');
    const r = detail.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  grid.addEventListener('change', e => { if (e.target.name === 'pick') showDetail(e.target.value); });
  document.getElementById('detailClose').addEventListener('click', () => {
    detail.hidden = true;
    const checked = grid.querySelector('input:checked');
    if (checked) checked.checked = false;
  });

  const tabs = document.querySelectorAll('.options__tabs button');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    tabs.forEach(b => b.classList.toggle('is-on', b === btn));
    grid.querySelectorAll('.option').forEach(c =>
      c.classList.toggle('is-hidden', filter !== 'all' && c.dataset.type !== filter));
    if (selected && filter !== 'all' && selected.type !== filter) document.getElementById('detailClose').click();
  }));

  // ---------- 9. 예약 창 (호텔 객실 / 온천 단독) ----------
  const book = document.getElementById('book');
  const form = document.getElementById('bookForm');
  const done = document.getElementById('bookDone');
  const listEl = document.getElementById('bookList');
  const extrasEl = document.getElementById('bookExtras');
  const errEl = document.getElementById('bookError');
  const EXTRAS = {
    room: [
      { id: 'feast', name: '신찬 연회상', desc: '제철 공물과 술을 객실로 차려드립니다.', price: 5000, perPerson: true },
      { id: 'herb', name: '약탕 나무패 추가', desc: '공용 온천 무제한 약탕 나무패를 드립니다.', price: 2000, perPerson: true },
      { id: 'bath', name: '공용 대욕장 이용', desc: '숙박하시는 신은 공용 온천을 무료로 이용하실 수 있습니다.', price: 0 },
    ],
    bath: [
      { id: 'towel', name: '수건 · 유카타 대여', desc: '입욕에 필요한 수건과 유카타를 준비해드립니다.', price: 0 },
      { id: 'tea', name: '목욕 후 약초차와 만주', desc: '휴게실에서 약초차와 신찬 만주를 드립니다.', price: 800, perPerson: true },
    ],
  };
  const state = { mode: 'room', date: null, month: null, picks: {}, extras: {} };
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // 달력
  const calDays = document.getElementById('calDays');
  const calTitle = document.getElementById('calTitle');
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const fmtDate = d => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
  const renderCal = () => {
    const m = state.month;
    calTitle.textContent = `${m.getFullYear()}년 ${m.getMonth() + 1}월`;
    document.getElementById('calPrev').disabled = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(first.getDay());
    for (let d = 1; d <= last; d++) {
      const day = new Date(m.getFullYear(), m.getMonth(), d);
      const past = day < today;
      const sel = state.date && day.getTime() === state.date.getTime();
      const cls = [day.getDay() === 0 ? 'sun' : '', day.getDay() === 6 ? 'sat' : '', sel ? 'is-on' : ''].join(' ').trim();
      html += `<button type="button" class="${cls}" data-day="${d}"${past ? ' disabled' : ''}>${d}</button>`;
    }
    calDays.innerHTML = html;
    document.getElementById('pickedDate').textContent = state.date ? fmtDate(state.date) : '날짜를 선택해주세요';
  };
  calDays.addEventListener('click', e => {
    const d = e.target.dataset.day;
    if (!d) return;
    state.date = new Date(state.month.getFullYear(), state.month.getMonth(), +d);
    renderCal(); update();
  });
  document.getElementById('calPrev').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); });
  document.getElementById('calNext').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); });

  // 목록 (객실 또는 온천)
  const opts = (from, to, label) => Array.from({ length: to - from + 1 }, (_, i) => `<option value="${from + i}">${label(from + i)}</option>`).join('');
  const itemsForMode = () => ITEMS.filter(i => state.mode === 'room' ? i.type === 'hotel' : i.type !== 'hotel');
  const lineTotal = it => {
    const row = listEl.querySelector(`[data-row="${it.id}"]`);
    if (!row) return 0;
    const v = k => +row.querySelector(`[name="${k}"]`).value;
    if (it.type === 'hotel') {
      const n = v('nights'), adults = v('adults'), kids = v('kids');
      const extra = Math.max(0, adults + kids - it.base) * 3000;
      return (it.price + extra) * n;
    }
    if (it.type === 'private') return it.price * v('slots');
    return it.price * v('adults') + it.child * v('kids');
  };
  const renderList = () => {
    const isRoom = state.mode === 'room';
    document.getElementById('listTitle').innerHTML = isRoom
      ? '객실 안내 <small>객실을 선택해 주세요.</small>'
      : '온천 안내 <small>이용하실 온천을 선택해 주세요.</small>';
    listEl.innerHTML = itemsForMode().map(it => {
      const selects = it.type === 'hotel'
        ? `<label>숙박기간 <select name="nights">${opts(1, 5, n => `${n}박 ${n + 1}일`)}</select></label>
           <label>신 <select name="adults">${opts(1, it.max, n => `${n}柱`).replace(`value="${Math.min(it.base, it.max)}"`, `value="${Math.min(it.base, it.max)}" selected`)}</select></label>
           <label>어린 신 <select name="kids">${opts(0, it.max - 1, n => `${n}柱`)}</select></label>`
        : it.type === 'private'
          ? `<label>이용시간 <select name="slots">${opts(1, 3, n => `${n * 50}분`)}</select></label>
             <label>인원 <select name="adults">${opts(1, it.max, n => `${n}柱`)}</select></label>`
          : `<label>신 <select name="adults">${opts(1, it.max, n => `${n}柱`)}</select></label>
             <label>어린 신 <select name="kids">${opts(0, it.max - 1, n => `${n}柱`)}</select></label>`;
      const sub = it.type === 'hotel'
        ? `${it.kind} · ${it.size} · 기본 ${it.base}柱 · 최대 ${it.max}柱`
        : `${TYPE_LABEL[it.type]} · ${it.hours}`;
      return `<div class="item${state.picks[it.id] ? ' is-on' : ''}" data-row="${it.id}">
          <figure data-img="${esc(it.img)}" data-ph="${it.type === 'hotel' ? '客' : '湯'}"></figure>
          <div class="item__body">
            <p class="item__name"><b>${esc(it.name)}</b><span>${sub}</span></p>
            <div class="item__sel">${selects}</div>
            <p class="item__price">결제금액 <b data-price>${won(it.price)}</b></p>
          </div>
          <button type="button" class="item__pick">${state.picks[it.id] ? '선택 완료 ✓' : (isRoom ? '객실 선택하기' : '온천 선택하기')}</button>
        </div>`;
    }).join('');
    hydrate(listEl);
  };
  listEl.addEventListener('change', () => update());
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.item__pick');
    if (!btn) return;
    const id = btn.closest('.item').dataset.row;
    state.picks[id] = !state.picks[id];
    const row = btn.closest('.item');
    row.classList.toggle('is-on', state.picks[id]);
    btn.textContent = state.picks[id] ? '선택 완료 ✓' : (state.mode === 'room' ? '객실 선택하기' : '온천 선택하기');
    update();
  });

  const renderExtras = () => {
    extrasEl.innerHTML = EXTRAS[state.mode].map(x => `
        <div class="extra">
          <p class="extra__name"><b>${x.name}</b><span>${x.desc}</span></p>
          <p class="extra__price">${x.price ? `${won(x.price)}${x.perPerson ? ' <small>/ 1柱</small>' : ''}` : '무료'}</p>
          <button type="button" class="extra__toggle${state.extras[x.id] ? ' is-on' : ''}" data-extra="${x.id}" aria-pressed="${!!state.extras[x.id]}" aria-label="${x.name} 선택"></button>
        </div>`).join('');
  };
  extrasEl.addEventListener('click', e => {
    const id = e.target.dataset.extra;
    if (!id) return;
    state.extras[id] = !state.extras[id];
    e.target.classList.toggle('is-on', state.extras[id]);
    e.target.setAttribute('aria-pressed', state.extras[id]);
    update();
  });

  const guestsOf = it => {
    const row = listEl.querySelector(`[data-row="${it.id}"]`);
    if (!row) return 0;
    return ['adults', 'kids'].reduce((n, k) => n + (+(row.querySelector(`[name="${k}"]`)?.value || 0)), 0);
  };
  const picked = () => itemsForMode().filter(it => state.picks[it.id]);
  const computeTotal = () => {
    let total = 0, guests = 0;
    itemsForMode().forEach(it => {
      const row = listEl.querySelector(`[data-row="${it.id}"]`);
      const line = lineTotal(it);
      if (row) row.querySelector('[data-price]').textContent = won(line);
      if (state.picks[it.id]) { total += line; guests += guestsOf(it); }
    });
    EXTRAS[state.mode].forEach(x => { if (state.extras[x.id]) total += x.perPerson ? x.price * Math.max(guests, 1) : x.price; });
    return total;
  };
  const update = () => {
    document.getElementById('totalPrice').textContent = won(computeTotal());
    errEl.textContent = '';
  };

  const setMode = mode => {
    state.mode = mode;
    book.querySelectorAll('.book__mode button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === mode));
    renderList(); renderExtras(); update();
  };
  book.querySelectorAll('.book__mode button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  let lastFocus = null;
  const openBook = (itemId) => {
    lastFocus = document.activeElement;
    const it = itemId ? byId(itemId) : null;
    state.picks = {}; state.extras = {};
    if (it) state.picks[it.id] = true;
    state.date = state.date && state.date >= today ? state.date : null;
    state.month = new Date((state.date || today).getFullYear(), (state.date || today).getMonth(), 1);
    form.hidden = false; done.hidden = true;
    setMode(it && it.type !== 'hotel' ? 'bath' : 'room');
    renderCal();
    book.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => book.classList.add('is-open'));
    book.querySelector('.book__panel').scrollTop = 0;
    book.querySelector('.book__x').focus();
  };
  const closeBook = () => {
    book.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { book.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  };
  book.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeBook(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !book.hidden) closeBook(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('guestName').value.trim();
    const tel = document.getElementById('guestTel').value.trim();
    const problems = [];
    if (!state.date) problems.push('날짜');
    if (!picked().length) problems.push(state.mode === 'room' ? '객실' : '온천');
    if (!name) problems.push('예약자 이름');
    if (!/^[0-9+\-\s]{8,}$/.test(tel)) problems.push('연락처');
    if (!document.getElementById('guestAgree').checked) problems.push('약관 동의');
    if (problems.length) { errEl.textContent = `${problems.join(', ')}을(를) 확인해주세요.`; return; }
    const rows = [
      ['예약 구분', state.mode === 'room' ? '호텔 (객실) 예약' : '온천 단독 예약'],
      ['날짜', fmtDate(state.date)],
      [state.mode === 'room' ? '객실' : '온천', picked().map(i => i.name).join(', ')],
      ['옵션', EXTRAS[state.mode].filter(x => state.extras[x.id]).map(x => x.name).join(', ') || '없음'],
      ['예약자', `${name} · ${tel}`],
      ['결제금액', document.getElementById('totalPrice').textContent],
    ];
    document.getElementById('doneSummary').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    form.hidden = true; done.hidden = false;
    book.querySelector('.book__panel').scrollTop = 0;
  });

  // 예약 창을 여는 버튼들
  document.getElementById('detailBook').addEventListener('click', () => openBook(selected && selected.id));
  document.getElementById('agreeBtn').addEventListener('click', e => { e.preventDefault(); openBook(selected && selected.id); });

  // ---------- 10. 신들의 상점 ----------
  const shopState = JSON.parse(localStorage.getItem('aburaya-offerings') || '[]');
  const renderShopCart = () => {
    document.getElementById('shopCount').textContent = shopState.length;
    document.getElementById('shopTotal').textContent = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(shopState.reduce((sum, item) => sum + item.price, 0));
  };
  document.querySelectorAll('.buy-button').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('article');
    shopState.push({ name: card.dataset.name, price: Number(card.dataset.price) });
    localStorage.setItem('aburaya-offerings', JSON.stringify(shopState));
    renderShopCart();
    button.textContent = '공물함에 담았습니다 ✓';
    setTimeout(() => { button.textContent = `공물함에 담기 · ¥${Number(card.dataset.price).toLocaleString()}`; }, 1400);
  }));
  renderShopCart();
  showPage(location.hash.slice(1) || 'home', false);
})();
