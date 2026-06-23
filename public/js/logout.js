import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

const logoutBtn = document.querySelector('.nav__el--logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

const protectedPaths = ['/me'];

const logout = async () => {
  try {
    const res = await axios.post('/api/v1/users/logout', {});
    showAlert('success', 'You have successfully logged out', 1800);
    //wait for a moment and then reload to update the header
    window.setTimeout(() => {
      if (protectedPaths.includes(window.location.pathname)) {
        //we're in a protected route so go to home on logout
        window.location.replace('/');
      } else {
        //otherwise simply replace the menu items and stay on the same page, it may cause a layout shift but at least it doesn't go through an entirely new render
        const navUser = document.querySelector('.nav--user');
        if (navUser) {
          navUser.innerHTML = `
          <a class="nav__el" href="/login">Log In</a>
          <a class="nav__el nav__el--cta" href="/signup">Sign Up</a>
        `;
        }
      }
    }, 2000);
  } catch (err) {
    showAlert('error', 'Error when trying to log you out');
  }
};
