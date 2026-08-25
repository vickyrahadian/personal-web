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
      window.trackAnalyticsEvent?.('contact_submit');
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
