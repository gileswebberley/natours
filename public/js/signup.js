import axios from '/js/axios.js';
import { showAlert } from './alerts.js';
// first time using axios to make use of the backend we wrote
async function signup(name, email, password, passwordConfirm, btnEl) {
  const resetButton = () => {
    btnEl.disabled = false;
    btnEl.textContent = 'Sign Up';
  };
  try {
    const res = await axios.post('/api/v1/users/signup', {
      name,
      email,
      password,
      passwordConfirm,
    });
    // console.log(res);
    showAlert('success', `Welcome to Natours ${name}`, 1800);
    //wait for a moment and then redirect to the home page
    window.setTimeout(() => {
      resetButton();
      window.location.replace('/');
    }, 2000);
  } catch (err) {
    // console.log(err.response);
    //axios produces it's own error wrapper so you can find the response we're sending from the server inside err.response.data
    const message =
      err.response?.data?.message || 'Something unexpected went wrong';
    resetButton();
    showAlert('error', message);
  }
}
// by adding this script to the head of the login page with type='module' it waits for the form to render and then grabs all of this info
document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault();
  // console.log('Sign up clicked...');
  const submitButton = e.submitter;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  signup(name, email, password, passwordConfirm, submitButton);
});
