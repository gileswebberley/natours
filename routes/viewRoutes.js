import express from 'express';
import {
  getLoginForm,
  getOverview,
  getSignupForm,
  getTour,
} from '../controllers/viewControllers.js';
import { isLoggedIn } from '../controllers/authController.js';
// import { protect } from '../controllers/authController.js';

export const router = express.Router();

router.use(isLoggedIn);

router.get('/', getOverview);

router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/signup', getSignupForm);
