// ── Navbar: style change on scroll ───────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ── Smooth scroll for anchor links ───────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();

    const navCollapse = document.getElementById('navMenu');
    if (navCollapse.classList.contains('show')) {
      bootstrap.Collapse.getInstance(navCollapse)?.hide();
    }

    const offset = navbar.offsetHeight + 12;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Gallery Carousel (3-up horizontal) ───────────────
const VISIBLE = 3;
let galleryImages = [];
let currentIndex  = 0;
let slideWidth    = 0;

async function initGallery() {
  const track = document.getElementById('galleryTrack');

  try {
    const res = await fetch('/api/gallery');
    if (res.ok) galleryImages = await res.json();
  } catch { /* ignore */ }

  if (galleryImages.length === 0) {
    track.innerHTML = '<div class="carousel-placeholder">No images found.</div>';
    return;
  }

  // Build slides
  track.innerHTML = galleryImages.map((src, i) => `
    <div class="carousel-slide">
      <img src="${src}" alt="Photo ${i + 1}" class="carousel-img" loading="lazy" draggable="false" />
    </div>
  `).join('');

  // Build dots (one per step)
  const maxIndex = Math.max(0, galleryImages.length - VISIBLE);
  const dots = document.getElementById('galleryDots');
  dots.innerHTML = Array.from({ length: maxIndex + 1 }, (_, i) => `
    <button class="dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>
  `).join('');
  dots.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
  });

  measureAndPosition();
  window.addEventListener('resize', measureAndPosition);
}

function measureAndPosition() {
  const wrapper = document.querySelector('.carousel-track-wrapper');
  if (!wrapper) return;

  // Account for gap (padding-right on slides)
  const gap = 10;
  slideWidth = (wrapper.clientWidth - gap * (VISIBLE - 1)) / VISIBLE;

  document.querySelectorAll('.carousel-slide').forEach(slide => {
    slide.style.width = slideWidth + 'px';
  });

  updatePosition(false); // no transition on resize
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
  // Each step moves by one full slide + its gap
  track.style.transform = `translateX(-${currentIndex * (slideWidth + 10)}px)`;
}

function updateDots() {
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIndex);
  });
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
  if (counter && galleryImages.length > 0) {
    counter.textContent = `${currentIndex + 1} / ${maxIndex + 1}`;
  }
}

document.getElementById('galleryPrev')?.addEventListener('click', () => goTo(currentIndex - 1));
document.getElementById('galleryNext')?.addEventListener('click', () => goTo(currentIndex + 1));

document.addEventListener('keydown', e => {
  if (galleryImages.length === 0) return;
  if (e.key === 'ArrowLeft')  goTo(currentIndex - 1);
  if (e.key === 'ArrowRight') goTo(currentIndex + 1);
});

initGallery();

// ── Contact Form ──────────────────────────────────────
document.getElementById('contactForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();
  const feedback = document.getElementById('formFeedback');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');

  if (!name || !email || !message) {
    feedback.innerHTML = '<span class="text-danger">Please fill in all fields.</span>';
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  submitText.textContent = 'Sending...';
  spinner.classList.remove('d-none');
  feedback.innerHTML = '';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });

    if (res.ok) {
      feedback.innerHTML = '<span class="text-success">Message sent! I\'ll get back to you soon.</span>';
      document.getElementById('contactForm').reset();
    } else {
      feedback.innerHTML = '<span class="text-danger">Something went wrong. Please try again.</span>';
    }
  } catch {
    feedback.innerHTML = '<span class="text-danger">Could not connect to server. Please try again later.</span>';
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Send Message';
    spinner.classList.add('d-none');
  }
});

// ── Fade-in on scroll ─────────────────────────────────
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('section').forEach(section => {
  section.classList.add('fade-section');
  observer.observe(section);
});
