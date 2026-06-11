document.addEventListener('DOMContentLoaded', () => {
  // for mouse or touchscreen users
  document.addEventListener('mousedown', (event) => {
    // Find if the clicked element (or its SVG/path parents) is a toggle button by using [] as the attribute selector
    const button = event.target.closest('[data-toggle-for]');
    if (!button) return;
    event.preventDefault(); // Prevent default button behavior to keep the focus in the input element

    togglefn(button);
  });
  // for users with accessibility needs who might be using keyboard navigation, we also want to listen for "Enter" key presses on the toggle button
  document.addEventListener('click', (event) => {
    // Find if the clicked element (or its SVG/path parents) is a toggle button
    const button = event.target.closest('[data-toggle-for]');
    if (!button) return;
    // check that it was a keyboard click (event.detail === 0) and not a mouse click (event.detail > 0)
    if (event.detail === 0) togglefn(button);
  });
});

const togglefn = (button) => {
  const targetId = button.getAttribute('data-toggle-for');
  const passwordField = document.getElementById(targetId);

  if (passwordField) {
    const isPassword = passwordField.type === 'password';
    passwordField.type = isPassword ? 'text' : 'password';

    // 1. Toggle the CSS state class on the button
    button.classList.toggle('is-visible', isPassword);

    // Update screen reader text
    const labelText = isPassword ? 'Hide password' : 'Show password';
    button.setAttribute('aria-label', labelText);
  }
};
