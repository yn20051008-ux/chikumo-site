const headerHTML = `
<div class="wrap">
  <nav class="main">
    <a href="/">Home</a>
    <a href="/about.html">About</a>
    <a href="/works.html">Works</a>
    <a href="/blog/">Blog</a>
    <span class="spacer"></span>
    <a class="social" href="https://x.com/YN2005100816"
       target="_blank" rel="noopener noreferrer nofollow" aria-label="公式X">
      <img src="/assets/x.svg" alt="X"><span class="sr-only">X</span>
    </a>
    <a class="social" href="https://www.youtube.com/@chikumonogatari"
       target="_blank" rel="noopener noreferrer nofollow" aria-label="公式YouTube">
      <img src="/assets/youtube.svg" alt="YouTube"><span class="sr-only">YouTube</span>
    </a>
  </nav>
</div>`;
document.addEventListener("DOMContentLoaded", () => {
  const h = document.querySelector("header");
  if (h) h.innerHTML = headerHTML;
});
