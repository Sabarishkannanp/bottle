const $ = (selector) => document.querySelector(selector);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = $('.loader');
document.body.classList.add('loading');
const bottleImage = $('.moving-bottle img');
let loadStart;
let loading = true;
const loadingColors = ['hue-rotate(282deg) saturate(1.7)', 'none', 'saturate(.15) brightness(.48)', 'hue-rotate(155deg) saturate(.48) brightness(.8)'];
function loadFrame(now) {
  if (loadStart === undefined) loadStart = now;
  const duration = reduceMotion ? 2400 : 4800;
  const progress = Math.min(100, Math.floor((now - loadStart) / duration * 100));
  $('.loading-bottle').style.filter = loadingColors[Math.min(3, Math.floor(progress / 25))];
  $('#load-count').textContent = String(progress).padStart(2, '0');
  $('.loading-track i').style.width = progress + '%';
  if (progress < 100) requestAnimationFrame(loadFrame);
  else {
    loader.classList.add('done');
    setTimeout(() => { document.body.classList.remove('loading'); loading = false; }, reduceMotion ? 0 : 900);
  }
}
bottleImage.decode().catch(() => {}).then(() => requestAnimationFrame(() => requestAnimationFrame(loadFrame)));
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const scene = $('.scroll-scene');
const stage = $('.stage');
const storyTop = () => scene.offsetTop + scene.offsetHeight - stage.offsetHeight;
const collectionTop = () => $('#collection').offsetTop;
const travellingBottle = $('.moving-bottle');
const bottleOrigin = document.createElement('div');
bottleOrigin.className = 'moving-bottle bottle-origin';
bottleOrigin.setAttribute('aria-hidden', 'true');
stage.insertBefore(bottleOrigin, travellingBottle);
travellingBottle.classList.add('travelling-bottle');
document.body.append(travellingBottle);
const greenProduct = $('.product[data-color="green"]');
const greenImage = greenProduct.querySelector('img');
let ticking = false;
function renderScene() {
  const p = clamp(-scene.getBoundingClientRect().top / (scene.offsetHeight - stage.offsetHeight));
  const transition = p;
  const ease = transition * transition * (3 - 2 * transition);
  const mobile = innerWidth <= 700;
  const rotate = reduceMotion ? 0 : -23 * (1 - ease);
  // Measure an invisible origin in the scene, keeping responsive positioning in CSS.
  // Rotation stays on the real bottle so its bounding box does not change its size.
  const portraitPhone = mobile && innerHeight > innerWidth;
  bottleOrigin.style.setProperty('--story-progress', ease);
  bottleOrigin.style.transform = portraitPhone ? 'none' : `translate(${ease * (mobile ? -29 : -59)}%, ${ease * (mobile ? 0 : -6)}%) scale(${1 + ease * (mobile ? -.09 : .07)})`;
  const origin = bottleOrigin.getBoundingClientRect();
  const travel = clamp((scrollY - storyTop()) / (collectionTop() - storyTop()));
  const blend = travel * travel * (3 - 2 * travel);
  const target = greenProduct.querySelector('.product-image').getBoundingClientRect();
  const lerp = (a, b) => a + (b - a) * blend;
  // As the story scrolls away, keep the bottle in the viewport and land it exactly
  // over the green collection image. The original image takes over at the endpoint.
  const sourceTop = origin.top + Math.max(0, scrollY - storyTop());
  const targetTop = target.top + scrollY - collectionTop();
  Object.assign(travellingBottle.style, {
    left: `${lerp(origin.left, target.left)}px`,
    top: `${lerp(sourceTop, targetTop)}px`,
    width: `${lerp(origin.width, target.width)}px`,
    height: `${lerp(origin.height, target.height)}px`,
    transform: `rotate(${rotate}deg)`,
    visibility: travel >= 1 ? 'hidden' : 'visible',
  });
  travellingBottle.style.setProperty('--travel-shadow', 1 - blend);
  greenImage.style.visibility = travel >= 1 ? 'visible' : 'hidden';
  greenProduct.classList.toggle('receiving-bottle', travel > 0 && travel < 1);
  $('.hero-copy').style.opacity = 1 - clamp(p / .32);
  $('.hero-copy').style.transform = `translateY(${-p * 80}px)`;
  $('.hero-orbit').style.opacity = 1 - ease;
  $('.story-copy').style.opacity = clamp((ease - .35) / .65);
  $('.story-copy').style.transform = `translateY(${(1 - ease) * 40}px)`;
  $('.story-copy').style.pointerEvents = ease > .7 ? 'auto' : 'none';
  $('.story-copy').inert = ease < .7;
  const mix = (a, b) => Math.round(a + (b - a) * ease);
  const color = `rgb(${mix(160,244)},${mix(211,244)},${mix(111,233)})`;
  stage.style.background = `radial-gradient(ellipse at 50% 65%,rgba(237,246,220,${.2 * (1-ease)}),transparent 65%), ${color}`;
  ticking = false;
}
function scheduleScene() { if (!ticking) { ticking = true; requestAnimationFrame(renderScene); } }
addEventListener('scroll', scheduleScene, { passive: true });
addEventListener('resize', scheduleScene);
renderScene();
// Each deliberate gesture advances one scene. Trackpad inertia cannot skip a scene.
let animating = false;
let wheelLocked = false;
let wheelRelease;
function releaseWheel() {
  clearTimeout(wheelRelease);
  wheelRelease = setTimeout(() => { if (animating) releaseWheel(); else wheelLocked = false; }, 200);
}
function goToScene(target) {
  if (animating || loading) return;
  const from = scrollY;
  const started = performance.now();
  animating = true;
  wheelLocked = true;
  function frame(now) {
    const t = reduceMotion ? 1 : clamp((now - started) / 1100);
    const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    scrollTo({ top: from + (target - from) * eased, behavior: 'instant' });
    if (t < 1) requestAnimationFrame(frame);
    else { animating = false; releaseWheel(); }
  }
  requestAnimationFrame(frame);
}
function nextScene(direction) {
  const position = scrollY;
  if (position > collectionTop() + 3) return null;
  if (direction > 0) {
    if (position < storyTop() - 3) return storyTop();
    if (position < collectionTop() - 3) return collectionTop();
  } else {
    if (position > storyTop() + 3) return storyTop();
    if (position > 3) return 0;
  }
  return null;
}
addEventListener('wheel', event => {
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || $('#product-dialog').open) return;
  if (loading) { event.preventDefault(); return; }
  if (wheelLocked) { event.preventDefault(); releaseWheel(); return; }
  if (Math.abs(event.deltaY) < 3) return;
  const target = nextScene(Math.sign(event.deltaY));
  if (target !== null) { event.preventDefault(); goToScene(target); }
}, { passive: false });
let touchStart = null;
addEventListener('touchstart', event => {
  touchStart = event.touches.length === 1 && !$('#product-dialog').open ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
addEventListener('touchmove', event => {
  if (event.touches.length !== 1) { touchStart = null; return; }
  if (touchStart === null) return;
  const difference = touchStart.y - event.touches[0].clientY;
  if (Math.abs(touchStart.x - event.touches[0].clientX) > Math.abs(difference)) { touchStart = null; return; }
  if (loading || animating || (Math.abs(difference) > 8 && nextScene(Math.sign(difference)) !== null)) event.preventDefault();
}, { passive: false });
addEventListener('touchend', event => {
  if (touchStart === null) return;
  const difference = touchStart.y - event.changedTouches[0].clientY;
  touchStart = null;
  if (Math.abs(difference) < 35 || loading || animating) return;
  const target = nextScene(Math.sign(difference));
  if (target !== null) goToScene(target);
});
addEventListener('touchcancel', () => { touchStart = null; });
addEventListener('keydown', event => {
  if ($('#product-dialog').open || event.target.closest('button, a, input, textarea, select, [contenteditable]') || event.ctrlKey || event.metaKey || event.altKey) return;
  const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
  if (!direction) return;
  if (loading || animating) { event.preventDefault(); return; }
  const target = nextScene(direction);
  if (target !== null) { event.preventDefault(); goToScene(target); }
});
$('#scroll-link').addEventListener('click', e => { e.preventDefault(); goToScene(scrollY < storyTop() - 3 ? storyTop() : collectionTop()); });
document.querySelector('nav a[href="#story"]').addEventListener('click', e => { e.preventDefault(); goToScene(storyTop()); });
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
const colors = {orange:'Sunset orange',green:'Field green',black:'Midnight black',purple:'Dusk purple'};
const dialog = $('#product-dialog');
function selectColor(color) {
  $('#color-name').textContent = colors[color];
  $('#detail-image').className = 'detail-image ' + color;
  $('#detail-image img').alt = colors[color] + ' bottle';
  document.querySelectorAll('.swatches button').forEach(button => button.setAttribute('aria-pressed', button.dataset.color === color));
}
document.querySelectorAll('.product').forEach(button => button.addEventListener('click', () => { selectColor(button.dataset.color); dialog.showModal(); }));
document.querySelectorAll('.swatches button').forEach(button => button.addEventListener('click', () => selectColor(button.dataset.color)));
$('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
$('#replay').addEventListener('click', () => { if (loading || animating) return; scrollTo({ top: 0, behavior: 'instant' }); loader.classList.remove('done'); document.body.classList.add('loading'); loading = true; loadStart = undefined; requestAnimationFrame(loadFrame); });
$('#year').textContent = new Date().getFullYear();
