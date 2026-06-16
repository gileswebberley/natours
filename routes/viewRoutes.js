import express from 'express';
import {
  getLoginForm,
  getOverview,
  getSignupForm,
  getTour,
  resetPassword,
} from '../controllers/viewControllers.js';
import { isLoggedIn } from '../controllers/authController.js';

export const router = express.Router();
// this is not protecting routes but simply there for conditional rendering of the navigation
router.use(isLoggedIn);

router.get('/', getOverview);

router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/resetPassword/:token', resetPassword);

router.get('/signup', getSignupForm);
