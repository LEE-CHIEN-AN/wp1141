export function highlightActiveNav(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav a.nav-item');
  const current = location.pathname.split('/').pop() || 'index.html';
  links.forEach((a) => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
}

