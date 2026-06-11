import axios from '/js/axios.js';
import { showAlert } from './alerts.js';
// first time using axios to make use of the backend we wrote
async function login(email, password) {
  //   alert({ email, password });
  try {
    const res = await axios.post('/api/v1/users/login', { email, password });
    console.log(res);
    showAlert('success', 'You have successfully logged in', 1800);
    //wait for a moment and then redirect to the home page
    window.setTimeout(() => {
      window.location.replace('/');
    }, 2000);
  } catch (err) {
    // console.log(err.response);
    //axios produces it's own error wrapper so you can find the response we're sending from the server inside err.response.data
    const message =
      err.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
  }
}

document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault();
  //   console.log('login called');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  login(email, password);
});
