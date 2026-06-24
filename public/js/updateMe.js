import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function updateMe(name, photo = undefined) {
  const bodyObj = { name, ...(photo && { photo }) };
  try {
    const res = await axios.patch(`/api/v1/users/updateMe`, bodyObj);
    showAlert('success', 'You have successfully updated your user settings');
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

document.querySelector('#form-user-data').addEventListener('submit', (e) => {
  e.preventDefault();
  //   console.log('reset password called');
  const name = document.getElementById('name').value;

  updateMe(name);
});
