// landing.js
document.addEventListener('DOMContentLoaded', () => {
  // Animate stats on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = 'running';
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.feature-card, .step-card, .role-card').forEach(el => {
    observer.observe(el);
  });

  // Demo button
  document.getElementById('watchDemo')?.addEventListener('click', () => {
    Toast.info('Demo coming soon! Try the live interview instead. 🎤');
  });
});
