/**
 * Site-wide behaviors: demo form guard, sticky financing CTA bar.
 * Sticky bar show/hide matches commercialfinancereferrals.com (axiant-referral-landing-baseline) logic.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (
        form.classList.contains('referral-form') ||
        /formspree\.io/i.test(form.getAttribute('action') || '')
      ) {
        return;
      }
      event.preventDefault();
      alert(
        'Starter form only. Connect this to your CRM or application workflow in Cursor.'
      );
    });
  });

  initStickyFinancingCta();
});

function initStickyFinancingCta() {
  const AXIANT_MATCH =
    'https://axiantpartners.com/match?ref=commercialvehicleguide';

  const stickyHtml = `
    <div class="sticky-cta-bar" id="sticky-cta" aria-hidden="true">
      <div class="container sticky-cta-inner">
        <p class="sticky-cta-text">Need financing for your truck or equipment?</p>
        <a href="#" class="btn sticky-cta-btn" id="sticky-cta-btn">Apply Now</a>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', stickyHtml);

  const stickyBar = document.getElementById('sticky-cta');
  const btn = document.getElementById('sticky-cta-btn');
  const applyEl = document.getElementById('apply');
  const footer = document.querySelector('.site-footer');

  if (applyEl && btn) {
    btn.href = '#apply';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const reduced =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      applyEl.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  } else if (btn) {
    btn.href = AXIANT_MATCH;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
  }

  function toggleStickyBar() {
    const scrollY = window.scrollY || window.pageYOffset;
    const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
    const footerInView = footerTop < window.innerHeight;
    const pastHero = scrollY > 400;
    if (pastHero && !footerInView) {
      stickyBar.classList.add('visible');
      stickyBar.setAttribute('aria-hidden', 'false');
    } else {
      stickyBar.classList.remove('visible');
      stickyBar.setAttribute('aria-hidden', 'true');
    }
  }

  window.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(toggleStickyBar);
    },
    { passive: true }
  );
  if (footer) {
    const obs = new IntersectionObserver(
      () => {
        requestAnimationFrame(toggleStickyBar);
      },
      { threshold: 0, rootMargin: '0px' }
    );
    obs.observe(footer);
  }
  toggleStickyBar();
}
