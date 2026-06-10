import axios from '/js/axios.js';
// first time using axios to make use of the backend we wrote
async function login(email, password) {
  //   alert({ email, password });
  try {
    const res = await axios.post('/api/v1/users/login', { email, password });
    console.log(res);
    window.location.replace('/');
  } catch (err) {
    console.log(err);
  }
}

document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault();
  //   console.log('login called');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  login(email, password);
});
