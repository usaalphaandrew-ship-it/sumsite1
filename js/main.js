// CodeHelpers Main Interaction Scripts
document.addEventListener('DOMContentLoaded', () => {
  // FAQ Accordion
  const faqRows = document.querySelectorAll('.faq-row');
  faqRows.forEach(row => {
    row.addEventListener('click', () => {
      const isCurrentOpen = row.classList.contains('open');
      faqRows.forEach(r => r.classList.remove('open'));
      if (!isCurrentOpen) {
        row.classList.add('open');
      }
    });
  });

  // Package select navigation
  const selectBtns = document.querySelectorAll('[data-package]');
  selectBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkg = btn.getAttribute('data-package');
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const pkgInput = document.getElementById('selected-package');
        if (pkgInput) {
          pkgInput.value = pkg;
        }
      }
    });
  });
});
