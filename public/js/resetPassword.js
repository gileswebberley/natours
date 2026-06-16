import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function resetPassword(password, passwordConfirm, token) {
  try {
    const res = await axios.patch(`/api/v1/users/resetPassword/${token}`, {
      password,
      passwordConfirm,
    });
    showAlert('success', 'You have successfully reset your password', 1800);
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
  console.log('reset password called');
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('confirmPassword').value;
  const token = document.getElementById('token').value;

  resetPassword(password, passwordConfirm, token);
});
