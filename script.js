(() => {
  const root = document.querySelector('[data-surface="cosmos-viewport"]');
  if (!root) return;

  window.addEventListener('load', () => {
    root.classList.add('is-awakened');
  });
})();
