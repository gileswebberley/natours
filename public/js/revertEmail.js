import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function revertEmail(token) {
  try {
    const res = await axios.patch(`/api/v1/users/revertEmail/${token}`);
    showAlert('success', 'Your email has been reverted safely', 1800);
    //wait for a moment and then redirect to the home page
    window.setTimeout(() => {
      window.location.replace('/');
    }, 2000);
  } catch (error) {
    const message =
      error.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  }
}

document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault();
  const token = document.getElementById('token').value;

  revertEmail(token);
});
