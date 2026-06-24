import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function verifyEmail(token) {
  try {
    const res = await axios.patch(`/api/v1/users/verifyEmail/${token}`, {});
    showAlert('success', 'Your Email has been Verified', 1800);
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

  verifyEmail(token);
});
