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
  restrictTo,
} from '../controllers/authController.js';
import {
  deleteUser,
  getAllUsers,
  softDeleteUser,
  updateMe,
} from '../controllers/userController.js';
import {
  authLimiter,
  loginLimiter,
  signupLimiter,
} from '../utils/rateLimiters.js';

export const router = express.Router();

router.route('/signup').post(signupLimiter, signup);
router.route('/login').post(loginLimiter, login);
router.route('/forgotPassword').post(authLimiter, forgotPassword);

router.route('/resetPassword/:token').patch(authLimiter, resetPassword);
router.route('/verifyEmail/:token').patch(authLimiter, verifyEmail);
router.route('/revertEmail/:token').patch(authLimiter, revertEmail);
router.route('/updateMyPassword').patch(authLimiter, protect, updateMyPassword);
router.route('/updateMyEmail').patch(authLimiter, protect, updateMyEmail);
//this is for changing a name or photo but nothing sensitive like email or password
router.route('/updateMe').patch(authLimiter, protect, updateMe);

router.route('/deleteMe').delete(authLimiter, protect, softDeleteUser);
router.route('/deleteUser').delete(protect, restrictTo('admin'), deleteUser);

router.route('/').get(getAllUsers);
