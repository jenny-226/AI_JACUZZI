(() => {
  // ---------- 1. Wikimedia Commons 실사 사진 연결 ----------
  // data-img 에 Commons 파일명을 적으면 해당 사진(가로 1600px 썸네일)을 불러옵니다.
  const COMMONS = 'https://commons.wikimedia.org/wiki/';
  const fileUrl = (name, width = 1600) =>
    `${COMMONS}Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=${width}`;

  const used = new Set();
  document.querySelectorAll('[data-img]').forEach(el => {
    const name = el.dataset.img;
    used.add(name);
    const width = el.classList.contains('reel__shot') || el.matches('.banner__img, .location') ? 1920 : 1000;
    el.style.backgroundImage = `url("${fileUrl(name, width)}")`;
  });

  // 푸터 사진 출처 (CC 라이선스 표기)
  const creditList = document.getElementById('creditList');
  used.forEach(name => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `${COMMONS}File:${encodeURIComponent(name.replace(/ /g, '_'))}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = name;
    li.append(a);
    creditList.append(li);
  });

  // ---------- 2. 히어로 : 외관 → 내부 영상 ----------
  const hero = document.querySelector('.hero');
  const shots = [...document.querySelectorAll('.reel__shot')];
  const label = document.getElementById('heroLabel');
  const bar = document.getElementById('heroBar');
  const SHOT_MS = 6000;
  let idx = 0;
  let reelTimer = null;

  const showShot = i => {
    shots.forEach((s, k) => {
      if (k === i) {
        s.classList.remove('is-on');
        void s.offsetWidth; // Ken Burns 애니메이션 재시작
        s.classList.add('is-on');
      } else {
        s.classList.remove('is-on');
      }
    });
    label.style.opacity = 0;
    setTimeout(() => { label.textContent = shots[i].dataset.label; label.style.opacity = 1; }, 400);
    bar.style.transition = 'none';
    bar.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${SHOT_MS}ms linear`;
      bar.style.width = '100%';
    }));
  };

  const startReel = () => {
    if (reelTimer) return;
    showShot(idx);
    reelTimer = setInterval(() => { idx = (idx + 1) % shots.length; showShot(idx); }, SHOT_MS);
  };

  startReel();

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
