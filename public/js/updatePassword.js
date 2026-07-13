import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function updatePassword(password, newPassword, newPasswordConfirm) {
  if (!password || !newPassword || !newPasswordConfirm) {
    showAlert(
      'error',
      'You must provide your current password, new password, and confirm your new password',
    );
    return;
  }
  try {
    const res = await axios.patch(`/api/v1/users/updateMyPassword`, {
      password,
      newPassword,
      newPasswordConfirm,
    });
    showAlert('success', 'You have successfully updated your password');
    //wait for a moment and then redirect to the home page
    // window.setTimeout(() => {
    //   window.location.replace('/');
    // }, 2000);
  } catch (error) {
    const message =
      error.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  } finally {
    //clear the password fields
    document.querySelector('#form-user-password').reset();
  }
}

document
  .querySelector('#form-user-password')
  .addEventListener('submit', (e) => {
    e.preventDefault();
    //   console.log('change password called');
    const password = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password').value;
    const newPasswordConfirm =
      document.getElementById('password-confirm').value;

    updatePassword(password, newPassword, newPasswordConfirm);
  });
