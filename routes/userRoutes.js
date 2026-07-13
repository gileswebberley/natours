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
  logout,
} from '../controllers/authController.js';
import {
  createUser,
  deleteUserById,
  getAllUsers,
  getMe,
  getUserById,
  resizeAndUploadUserPhoto,
  softDeleteUser,
  updateMe,
  updateUserById,
  uploadUserPhoto,
} from '../controllers/userController.js';
import {
  authLimiter,
  loginLimiter,
  signupLimiter,
} from '../utils/rateLimiters.js';

export const router = express.Router();

router.route('/signup').post(signupLimiter, signup);
router.route('/login').post(loginLimiter, login);
// to avoid malicious logging out it's apparently modern practise to make this a post request too even though we're not POSTing anything but an empty object
router.post('/logout', logout);
router.route('/forgotPassword').post(authLimiter, forgotPassword);

router.route('/resetPassword/:token').patch(authLimiter, resetPassword);
router.route('/verifyEmail/:token').patch(authLimiter, verifyEmail);
router.route('/revertEmail/:token').patch(authLimiter, revertEmail);

//as everything below this point is a 'protected' route we can use the protect middleware as a stage for all of the routes below this point and then we will have access to the user object on the req object in all of those routes
router.use(protect);
//ALL PROTECTED ROUTES BELOW THIS POINT ---------------------------------------------
router.route('/updateMyPassword').patch(authLimiter, updateMyPassword);
router.route('/updateMyEmail').patch(authLimiter, updateMyEmail);
//this is for changing a name or photo but nothing sensitive like email or password - see the new multer/cloudinary code in userController for how the photo upload is handled (also check out the virtual property we've added to the user model to create a photoUrl property that will work for both local and cloudinary images)
router
  .route('/updateMe')
  .patch(authLimiter, uploadUserPhoto, resizeAndUploadUserPhoto, updateMe);
router.route('/deleteMe').delete(authLimiter, softDeleteUser);
router.route('/me').get(getMe);

//Similarly all the remaining routes should only be accessible to admins so we can use the restrictTo middleware as a stage for all of the routes below this point
router.use(restrictTo('admin'));
//ALL ADMIN ONLY ROUTES BELOW THIS POINT --------------------------------------------
router.route('/').get(getAllUsers).post(createUser);
router
  .route('/:id')
  .get(getUserById)
  .patch(updateUserById)
  .delete(deleteUserById);
//-----------------------------------------------------------------------------------
