(() => {
  // ---------- 1. 사진 연결 ----------
  // data-img 에 assets/images/... 경로를 적으면 해당 사진을 배경으로 불러옵니다.
  // "사진A.jpg|사진B.jpg" 처럼 적으면 A가 안 열릴 때 B를 씁니다.
  const TIMEOUT_MS = 12000;

  const loadImage = url => new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('error')); };
    img.src = url;
  });

  const applyImage = async el => {
    const names = el.dataset.img.split('|').map(n => n.trim()).filter(Boolean);
    el.classList.add('img-loading');
    for (const name of names) {
      try {
        const url = await loadImage(encodeURI(name));
        el.style.backgroundImage = `url("${url}")`;
        el.classList.remove('img-loading');
        el.classList.add('img-ready');
        return true;
      } catch (e) { /* 다음 후보 시도 */ }
    }
    el.classList.remove('img-loading');
    el.classList.add('img-fallback');
    // 사진이 없는 탕 옵션은 목록에서 뺍니다
    const card = el.closest('.option');
    if (card) {
      card.remove();
      // 선택돼 있던 탕이 빠지면 남은 첫 번째 탕을 선택
      if (!document.querySelector('.option input:checked')) {
        const next = document.querySelector('.option:not(.is-hidden) input');
        if (next) { next.checked = true; next.dispatchEvent(new Event('change')); }
      }
    }
    return false;
  };

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

  // ---------- 4. 헤더 / 메뉴 ----------
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

  // ---------- 7. 탕 선택 옵션 : 공용 / 개인 필터 ----------
  const getCards = () => [...document.querySelectorAll('.option')];
  const pickedBath = document.getElementById('pickedBath');
  const pickedType = document.getElementById('pickedType');
  const TYPE_LABEL = { shared: '공용', private: '개인' };
  const selectedCard = () => getCards().find(c => c.querySelector('input').checked);
  const updatePicked = () => {
    const card = selectedCard();
    pickedBath.textContent = card ? card.querySelector('input').value : '없음';
    pickedType.textContent = card ? `(${TYPE_LABEL[card.dataset.type]})` : '';
  };
  getCards().forEach(c => c.querySelector('input').addEventListener('change', updatePicked));

  document.querySelectorAll('.options__tabs button').forEach(btn => btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.options__tabs button').forEach(b => b.classList.toggle('is-on', b === btn));
    getCards().forEach(c => {
      c.classList.toggle('is-hidden', filter !== 'all' && c.dataset.type !== filter);
      c.classList.add('is-in'); // 필터로 새로 보이는 카드도 바로 표시
    });
    // 선택된 탕이 숨겨지면 보이는 첫 번째 탕을 선택
    const card = selectedCard();
    if (!card || card.classList.contains('is-hidden')) {
      const first = getCards().find(c => !c.classList.contains('is-hidden'));
      if (first) first.querySelector('input').checked = true;
    }
    updatePicked();
  }));
  updatePicked();

  document.getElementById('agreeBtn').addEventListener('click', e => {
    e.preventDefault();
    const card = selectedCard();
    const bath = card ? `${card.querySelector('input').value} (${TYPE_LABEL[card.dataset.type]})` : '선택한 탕';
    alert(`안내사항에 동의하셨습니다.\n「${bath}」 예약 페이지로 이동합니다.`);
  });
})();
