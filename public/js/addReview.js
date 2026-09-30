import axios from '/js/axios.js';
import { showAlert } from './alerts.js';
//reviewId is used as a flag to say whether we are creating or editing
async function addReview(
  review,
  rating,
  tour,
  tourDate,
  btnEl,
  reviewId = null,
) {
  const resetButton = () => {
    btnEl.disabled = false;
    btnEl.textContent = 'Submit';
  };
  try {
    if (reviewId) {
      await axios.patch(`/api/v1/reviews/${reviewId}`, { review, rating });
    } else {
      await axios.post('/api/v1/reviews/', {
        review,
        rating,
        tour,
        tourDate,
      });
    }
    // console.log(res);
    showAlert('success', `Thank you for your ${rating} star review`, 1800);
    //wait for a moment and then redirect to the home page
    window.setTimeout(() => {
      resetButton();
      window.location.replace('/my-reviews');
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
  const tour = document.getElementById('tourId')?.value;
  const tourDate = document.getElementById('tourDate')?.value;
  const reviewId = document.getElementById('reviewId')?.value;
  let review = document.getElementById('review').value;
  if (!review) {
    showAlert('error', 'Please say a few words about your experience');
    return;
  }
  const selectedRating = document.querySelector('input[name="rating"]:checked');
  //a bit of validation to make sure a rating has been provided
  if (!selectedRating) {
    showAlert('error', 'Please give us a star rating');
    return;
  }
  const rating = selectedRating.value;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  if (reviewId) {
    addReview(review, rating, tour, tourDate, submitButton, reviewId);
  } else {
    addReview(review, rating, tour, tourDate, submitButton);
  }
});
