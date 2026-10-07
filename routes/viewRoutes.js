import express from 'express';
import {
  addReview,
  checkAlert,
  editReview,
  getLoginForm,
  getMe,
  getMyBookings,
  getMyReviews,
  getOverview,
  getSignupForm,
  getTour,
  resetPassword,
  revertEmail,
  verifyEmail,
} from '../controllers/viewControllers.js';
import { isLoggedIn, protect } from '../controllers/authController.js';
import { createBookingCheckout } from '../controllers/bookingController.js';

export const router = express.Router();
//get the booking success message hack working
// router.use(checkAlert); //actually just put this on the my-tours route as we don't need it elsewhere
// place our protected routes up here so it doesn't go through the isLoggedIn as well
router.get('/me', protect, getMe);
router.get('/my-tours', checkAlert, protect, getMyBookings);
router.get('/my-reviews', protect, getMyReviews);
router.get('/add-review/:tourId/:tourDate', protect, addReview);
router.get('/edit-review/:reviewId', protect, editReview);
// this is not protecting routes but simply there for conditional rendering of the navigation
router.use(isLoggedIn);
// when returning to the overview page after going to the payment page we want to create the booking that has been paid for, otherwise the createBookingCheckout will simply return next() - this has been removed as we are now using the webhook method where our server and Stripe's communicate directly
router.get('/', getOverview);
// this also adds the availability information so that the booking form at the bottom is for an actual date which has spaces remaining
router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/resetPassword/:token', resetPassword);

router.get('/verifyEmail/:token', verifyEmail);

router.get('/revertEmail/:token', revertEmail);

router.get('/signup', getSignupForm);
