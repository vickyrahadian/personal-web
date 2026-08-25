const VISIBLE = 3;
let galleryImages = [];
let currentIndex = 0;
let slideWidth = 0;

async function initGallery() {
  const track = document.getElementById('galleryTrack');
  if (!track) return;

  try {
    const res = await fetch('/api/gallery');
    if (res.ok) galleryImages = await res.json();
  } catch {
    galleryImages = [];
  }

  if (galleryImages.length === 0) {
    track.innerHTML = '<div class="carousel-placeholder">No images found.</div>';
    return;
  }

  track.innerHTML = galleryImages.map((photo, i) => `
    <div class="carousel-slide">
      <img src="${photo.src || photo}" alt="${photo.alt_text || `Photo ${i + 1}`}" class="carousel-img" loading="lazy" draggable="false" />
    </div>
  `).join('');

  const maxIndex = Math.max(0, galleryImages.length - VISIBLE);
  const dots = document.getElementById('galleryDots');
  dots.innerHTML = Array.from({ length: maxIndex + 1 }, (_, i) => `
    <button class="dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>
  `).join('');
  dots.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index, 10)));
  });

  measureAndPosition();
  window.addEventListener('resize', measureAndPosition);
}

function measureAndPosition() {
  const wrapper = document.querySelector('.carousel-track-wrapper');
  if (!wrapper) return;
  const gap = 10;
  slideWidth = (wrapper.clientWidth - gap * (VISIBLE - 1)) / VISIBLE;
  document.querySelectorAll('.carousel-slide').forEach(slide => { slide.style.width = `${slideWidth}px`; });
  updatePosition(false);
  updateArrows();
}

function goTo(index) {
  const maxIndex = Math.max(0, galleryImages.length - VISIBLE);
  currentIndex = Math.max(0, Math.min(index, maxIndex));
  updatePosition(true);
  updateDots();
  updateArrows();
  updateCounter();
}

function updatePosition(animate) {
  const track = document.getElementById('galleryTrack');
  if (!track) return;
  track.style.transition = animate ? 'transform 0.4s ease' : 'none';
  track.style.transform = `translateX(-${currentIndex * (slideWidth + 10)}px)`;
}

function updateDots() {
  document.querySelectorAll('.dot').forEach((dot, index) => { dot.classList.toggle('active', index === currentIndex); });
}

function updateArrows() {
  const maxIndex = Math.max(0, galleryImages.length - VISIBLE);
  const prev = document.getElementById('galleryPrev');
  const next = document.getElementById('galleryNext');
  if (prev) prev.disabled = currentIndex === 0;
  if (next) next.disabled = currentIndex >= maxIndex;
}

function updateCounter() {
  const counter = document.getElementById('galleryCounter');
  const maxIndex = Math.max(0, galleryImages.length - VISIBLE);
  if (counter && galleryImages.length > 0) counter.textContent = `${currentIndex + 1} / ${maxIndex + 1}`;
}

document.getElementById('galleryPrev')?.addEventListener('click', () => goTo(currentIndex - 1));
document.getElementById('galleryNext')?.addEventListener('click', () => goTo(currentIndex + 1));
document.addEventListener('keydown', event => {
  if (!galleryImages.length) return;
  if (event.key === 'ArrowLeft') goTo(currentIndex - 1);
  if (event.key === 'ArrowRight') goTo(currentIndex + 1);
});

initGallery();
