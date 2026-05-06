import express from 'express';
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  protect,
  updateMyEmail,
  verifyEmail,
  revertEmail,
  updateMyPassword,
} from '../controllers/authController.js';
import { getAllUsers } from '../controllers/userController.js';
import {
  authLimiter,
  loginLimiter,
  signupLimiter,
} from '../utils/rateLimiters.js';

export const router = express.Router();

router.route('/signup').post(signupLimiter, signup);
//rather than what's above the course uses which throws an error to say that this route does not exist (see app.js)
// router.route('/signup', signup);
router.route('/login').post(loginLimiter, login);
router.route('/forgotPassword').post(authLimiter, forgotPassword);
router.route('/resetPassword/:token').patch(authLimiter, resetPassword);
router.route('/verifyEmail/:token').patch(authLimiter, verifyEmail);
router.route('/revertEmail/:token').patch(authLimiter, revertEmail);
router.route('/updateMyPassword').patch(authLimiter, protect, updateMyPassword);
router.route('/updateMyEmail').patch(authLimiter, protect, updateMyEmail);

router.route('/').get(getAllUsers);
