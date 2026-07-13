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
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.querySelector('#btn-password');
    btn.textContent = 'Updating...';
    btn.disabled = true;
    //   console.log('change password called');
    const password = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password').value;
    const newPasswordConfirm =
      document.getElementById('password-confirm').value;

    await updatePassword(password, newPassword, newPasswordConfirm);
    btn.textContent = 'Save password';
    btn.disabled = false;
  });
