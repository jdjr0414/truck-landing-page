document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Starter form only. Connect this to your CRM or application workflow in Cursor.');
    });
  });
});