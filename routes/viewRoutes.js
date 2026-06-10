import express from 'express';
import {
  getLoginForm,
  getOverview,
  getSignupForm,
  getTour,
} from '../controllers/viewControllers.js';
// import { protect } from '../controllers/authController.js';

export const router = express.Router();

router.get('/', getOverview);

router.get('/tour/:slug', getTour);

router.get('/login', getLoginForm);

router.get('/signup', getSignupForm);
