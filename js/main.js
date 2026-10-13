(() => {
  // ---------- 1. Wikimedia Commons 실사 사진 연결 ----------
  // data-img 에 Commons 파일명을 적으면 해당 사진을 불러옵니다.
  // "파일A|파일B" 처럼 적으면 A가 안 열릴 때 B를 대신 씁니다.
  // 모두 실패하면 .img-fallback 디자인(따뜻한 그라데이션 + 湯)이 표시됩니다.
  const COMMONS = 'https://commons.wikimedia.org/wiki/';
  const encode = name => encodeURIComponent(name.replace(/ /g, '_'));
  const fileUrl = (name, width) => `${COMMONS}Special:FilePath/${encode(name)}?width=${width}`;
  const TIMEOUT_MS = 12000;

  const loadImage = url => new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, TIMEOUT_MS);
    img.onload = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('error')); };
    img.src = url;
  });

  const creditList = document.getElementById('creditList');
  const credited = new Set();
  const addCredit = name => {
    if (credited.has(name)) return;
    credited.add(name);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `${COMMONS}File:${encode(name)}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = name;
    li.append(a);
    creditList.append(li);
  };

  const applyImage = async el => {
    const names = el.dataset.img.split('|').map(n => n.trim()).filter(Boolean);
    const width = el.matches('.reel__shot, .banner__img, .location') ? 1920 : 1000;
    el.classList.add('img-loading');
    for (const name of names) {
      try {
        const url = await loadImage(fileUrl(name, width));
        el.style.backgroundImage = `url("${url}")`;
        el.classList.remove('img-loading');
        el.classList.add('img-ready');
        addCredit(name);
        return true;
      } catch (e) { /* 다음 후보 시도 */ }
    }
    el.classList.remove('img-loading');
    el.classList.add('img-fallback');
    return false;
  };

  const imageJobs = new Map();
  document.querySelectorAll('[data-img]').forEach(el => imageJobs.set(el, applyImage(el)));

  // ---------- 2. 히어로 : 외관 → 내부 영상 (HTML·CSS·JS) ----------
  const hero = document.querySelector('.hero');
  const allShots = [...document.querySelectorAll('.reel__shot')];
  const label = document.getElementById('heroLabel');
  const bar = document.getElementById('heroBar');
  const SHOT_MS = 6000;
  let shots = allShots.slice();   // 불러오기에 실패한 컷은 순서에서 빠집니다
  let idx = 0;

  const showShot = shot => {
    allShots.forEach(s => s.classList.remove('is-on'));
    void shot.offsetWidth; // Ken Burns 애니메이션 재시작
    shot.classList.add('is-on');
    label.style.opacity = 0;
    setTimeout(() => { label.textContent = shot.dataset.label; label.style.opacity = 1; }, 400);
    bar.style.transition = 'none';
    bar.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${SHOT_MS}ms linear`;
      bar.style.width = '100%';
    }));
  };

  allShots.forEach(shot => imageJobs.get(shot).then(ok => {
    if (ok) return;
    shots = shots.filter(s => s !== shot);
    shot.classList.remove('is-on');
    if (!shots.length) hero.classList.add('hero--fallback');
  }));

  showShot(shots[0]);
  setInterval(() => {
    if (!shots.length) return;
    idx = (idx + 1) % shots.length;
    showShot(shots[idx]);
  }, SHOT_MS);

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
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > hero.clientHeight - 80);
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

  document.getElementById('agreeBtn').addEventListener('click', e => {
    e.preventDefault();
    alert('안내사항에 동의하셨습니다. 예약 페이지로 이동합니다.');
  });
})();
