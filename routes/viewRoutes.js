import express from 'express';
import {
  getLoginForm,
  getMe,
  getMyTours,
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
// place our protected routes up here so it doesn't go through the isLoggedIn as well
router.get('/me', protect, getMe);
router.get('/my-tours', protect, getMyTours);
// this is not protecting routes but simply there for conditional rendering of the navigation
router.use(isLoggedIn);

router.get('/', createBookingCheckout, getOverview);

router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/resetPassword/:token', resetPassword);

router.get('/verifyEmail/:token', verifyEmail);

router.get('/revertEmail/:token', revertEmail);

router.get('/signup', getSignupForm);
