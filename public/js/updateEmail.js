import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function updateEmail(passwordCurrent, email) {
  if (!passwordCurrent || !email) {
    showAlert('error', 'You must provide your password to change your email');
    return;
  }
  try {
    const res = await axios.patch(`/api/v1/users/updateMyEmail`, {
      passwordCurrent,
      email,
      resetEndpoint: 'verifyEmail',
      revertEndpoint: 'revertEmail',
    });
    showAlert('success', res.data.message);
    //wait for a moment and then redirect to the home page
    // window.setTimeout(() => {
    //   window.location.replace('/');
    // }, 2000);
  } catch (error) {
    const message =
      error.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  }
}

document.querySelector('#form-user-email').addEventListener('submit', (e) => {
  e.preventDefault();
  //   console.log('reset password called');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password-email').value;

  updateEmail(password, email);
});
