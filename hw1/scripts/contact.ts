export function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('name') as HTMLInputElement | null)?.value || '';
    const email = (document.getElementById('email') as HTMLInputElement | null)?.value || '';
    const subject = (document.getElementById('subject') as HTMLInputElement | null)?.value || '';
    const message = (document.getElementById('message') as HTMLTextAreaElement | null)?.value || '';
    const mailto = `mailto:b12705041@ntu.edu.tw?subject=${encodeURIComponent('[網站聯絡] ' + subject)}&body=${encodeURIComponent(`姓名：${name}\nEmail：${email}\n\n訊息：\n${message}`)}`;
    window.location.href = mailto;
  });
}

