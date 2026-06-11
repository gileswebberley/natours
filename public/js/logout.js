import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

const logoutBtn = document.querySelector('.nav__el--logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

const logout = async () => {
  try {
    const res = await axios.post('/api/v1/users/logout', {});
    showAlert('success', 'You have successfully logged out', 1800);
    //wait for a moment and then reload to update the header
    window.setTimeout(() => {
      //   window.location.replace(window.location.href);
      //do it so it's smoother and doesn't go through another render
      const navUser = document.querySelector('.nav--user');
      if (navUser) {
        navUser.innerHTML = `
          <a class="nav__el" href="/login">Log In</a>
          <a class="nav__el nav__el--cta" href="/signup">Sign Up</a>
        `;
      }
    }, 2000);
  } catch (err) {
    showAlert('error', 'Error when trying to log you out');
  }
};
