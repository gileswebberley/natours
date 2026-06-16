import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function sendPasswordResetEmail(email) {
  try {
    //This is for where the link sent in the email will take you, eg if this is resetPassword we'll end up with a link to {protocol}{host}/resetPassword/{token}
    const resetEndpoint = 'resetPassword';
    const res = await axios.post('api/v1/users/forgotPassword', {
      email,
      resetEndpoint,
    });
    showAlert('success', res.data.message);
  } catch (error) {
    const message =
      error.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  }
}

document.getElementById('forgot-pword').addEventListener('click', (e) => {
  e.preventDefault();
  e.target.blur();
  const email = document.getElementById('email').value;
  if (!email) {
    showAlert(
      'error',
      'A valid email address is required to send you the password reset link',
    );
    return;
  }
  sendPasswordResetEmail(email);
});
