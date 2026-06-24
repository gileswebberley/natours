import express from 'express';
import {
  getLoginForm,
  getMe,
  getOverview,
  getSignupForm,
  getTour,
  resetPassword,
  revertEmail,
  verifyEmail,
} from '../controllers/viewControllers.js';
import { isLoggedIn, protect } from '../controllers/authController.js';

export const router = express.Router();
// place our protected routes up here so it doesn't go through the isLoggedIn as well
router.get('/me', protect, getMe);
// this is not protecting routes but simply there for conditional rendering of the navigation
router.use(isLoggedIn);

router.get('/', getOverview);

router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/resetPassword/:token', resetPassword);

router.get('/verifyEmail/:token', verifyEmail);

router.get('/revertEmail/:token', revertEmail);

router.get('/signup', getSignupForm);
