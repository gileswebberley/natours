import axios from '/js/axios.js';
import { showAlert } from './alerts.js';

async function bookTour(tourId, buttonElement) {
  try {
    //remember we don't need to await res.json() when using axios as it automagically parses the JSON and returns it in res.data
    const res = await axios.get(`/api/v1/bookings/checkout-session/${tourId}`);
    if (res.data.status === 'success') {
      showAlert('success', 'Redirecting to our secure payment page...', 1800);
      //wait for a moment and then redirect to the Stripe checkout
      window.setTimeout(() => {
        //we can now redirect the user to the Stripe checkout page using the session url that we got back from the server
        window.location.assign(res.data.sessionUrl);
        buttonElement.textContent = 'Book Tour Now';
        buttonElement.disabled = false;
      }, 2000);
    }
  } catch (error) {
    const message =
      err.response?.data?.message || 'Something unexpected went wrong';
    showAlert('error', message);
    buttonElement.textContent = 'Book Tour Now';
    buttonElement.disabled = false;
  }
}

document.querySelector('#book-tour')?.addEventListener('click', async (e) => {
  e.preventDefault();
  e.target.textContent = 'Processing...';
  e.target.disabled = true;
  const { tourId } = e.target.dataset; //remember tour-id as a data-attribute is converted to camelCase in the dataset object
  //we'll pass the event in so it can be used to un-disable the button and change the text back in case of an error or the such
  await bookTour(tourId, e.target);
  // e.target.textContent = 'Book tour now';
});
