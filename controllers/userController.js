import multer from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
//use the new centralised instance of cloudinary instead
import {
  cloudinary,
  uploadViaBuffer,
  getPublicIdFromUrl,
  rollbackCloudinaryUploads,
} from '../utils/cloudinaryUtils.js';
import sharp from 'sharp';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { filterObj } from '../utils/utilFunctions.js';
import { createOne, deleteOne, getAll, getOne } from './handlerFactory.js';
import { multerLimits } from '../utils/multerLimits.js';

//it's time to integrate image upload and storage on cloudinary - for backwards compatability we'll add a virtual property to the user model called photoUrl (remember to add the ability to delete the cloudinary photo when a user is deleted or changes their photo)

//multer is the middleware that handles multi-part form data (like file uploads), here we set it to keep the file in a buffer in memory and the filter checks that it is an image file
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  // console.log('multer file:', file);
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

//we've added the limits property so we have to take care of catching the errors it might throw
export const uploadUserPhoto = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: multerLimits,
}).single('photo'); //this is the name property of the form field that we want to handle - it will be available on req.file in the next middleware function

//we'll configure cloudinary with the .env varaibles - simply sign up for a free Cloudinary account and get the cloud name from the dashboard, you then click on 'Get API Keys' to get the key and secret and then put them in your .env file(s) ! We're now using the centralised instance that's created in cloudinaryUtils.js
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
//   secure: true, // Forces Cloudinary to generate secure HTTPS URLs
// });

// Intercept the memory buffer, optimize with Sharp, and stream directly to Cloudinary
export const resizeAndUploadUserPhoto = async (req, res, next) => {
  // If no file was uploaded, skip straight to the database save middleware
  if (!req.file) return next();

  // FETCH CURRENT USER: Find the old image metadata before overwriting it, added req.params.id in case this is for updateUserById by using 'short-circuit assignment'
  const userId = req.params.id || req.user.id;
  const currentUser = await User.findById(userId);
  const oldPhotoPath = currentUser?.photo;

  // set the filenaming and folder for our new buffer upload functionality - check out all of the centralised cloudinaryUtils.js
  const folderPath = 'natours/users';
  const userPublicId = `user-${userId}-${Date.now()}`;
  const secureUrl = await uploadViaBuffer(
    req.file.buffer,
    folderPath,
    userPublicId,
    { quality: 90, width: 500, height: 500 },
  );

  // Overwrite req.body.photo with the secure Cloudinary string URL
  req.body.photo = secureUrl;
  //Centralised functionality into cloudinaryUtils.js so we can use them again in tourController
  //OLD IMAGE CLEANUP: If the user had a previous custom image, delete it from Cloudinary
  if (oldPhotoPath && oldPhotoPath.startsWith('http')) {
    const publicId = getPublicIdFromUrl(oldPhotoPath);
    if (publicId) {
      // Trigger asynchronous background destruction (don't await it, to keep the response fast)
      rollbackCloudinaryUploads([oldPhotoPath]);
    }
  }

  next();
};

//handy function to filter out any sneaky injected stuff like setting role:admin when updating can be found in the utils/utilFunctions.js file and simply takes an object and a list of allowed fields and then creates a new object with only those fields in it - this is used in the updateMe controller to filter out any fields that the user is not allowed to change (like role or password)
//updating password is seperate in general and so we have done that in authController. The obvious risk of being able to change the email has led to several security considerations. I have therefore implemented a safer forgotPassword in authController and I will require the current password to be able to change the email field - let's make the email change a seperate route actually.
export const updateMe = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm) {
    //this is not the place for password stuff
    throw new AppError(
      'This route is not for password updates, please use /updateMyPassword instead',
      400,
    );
  }
  //as we are no longer dealing with sensitive data we can avoid the find-update-save routine, so by-passing the pre-save hook, and simply use one of the compound functions but be careful to filter the data in the req.body to avoid injections. If the email is changed and forgot password is used then the user could be hijacked!?
  const filteredObj = filterObj(req.body, 'name', 'photo');
  //remember that this will be on a protected route (with protect() as a stage) and so will have the user on the request object. The last argument is the options object which says to pass the new field properties through validation (like isEmail) and to return the newly changed document. runValidators only works on the fields that are being updated so we don't have to worry that it's going to check the password and so on.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredObj, {
    returnDocument: 'after',
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
};

//we do not actually delete a user but instead we hide it by setting active to false and then create a pre-find hook that deselects them - this is not good in terms of gdpr and also means that a user that thinks they've deleted their account can't then sign-up with the same (their) email address. The solution, to keep a user in existence for relational integrity (ie if they have bookings associated with the userid then deleting them completely would cause requests to fail) is to anonymise their data
export const softDeleteUser = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Cannot find a user to delete', 400);
  //add in the new photo stuff as new ones are saved to cloudinary and not stored on the server as per the course
  if (user.photo && user.photo.startsWith('http')) {
    //clear the user's image out of the cloud storage
    rollbackCloudinaryUploads([user.photo]);
  }
  const anonymisedUser = {
    active: false,
    name: 'deleted_user',
    email: `deleted_${Date.now()}@natours.com`,
    password: null,
    photo: null,
  };
  await user.updateOne(anonymisedUser, {
    runValidators: false,
  });
  res.status(204).json({
    status: 'success',
    data: null,
  });
};

//as we hold so much sensitive data in the user model we'll create a seperate getMe controller that only returns some of the logged in user's data (keep in mind this will have been through protect() and so has the user on the req object)
export const getMe = async (req, res) => {
  //we want a plain object which we can filter, rather than the Mongoose Document object that we get from the database so we could use toObject() or we could add .lean() to the query which is more efficient, or we could just use the select() method to only select the fields we want which is the most effiecient option.
  const user = await User.findById(req.user.id).select(
    '-_id name email photo role',
  );
  if (!user || user.active === false) {
    throw new AppError('No user found with that id', 404);
  }
  // this is no longer needed as we are using select()
  // const cleanUser = filterObj(user, 'name', 'email', 'photo', 'role');
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
};

//These are for admin use only (see the softDeleteUser which is for 'user' role users to delete themeselves) - we will not be using these routes for signing up normal users as that is handled by the signup controller in authController
//ALL ADMIN ONLY CONTROLLERS BELOW THIS POINT ----------------------------------------------
export const updateUserById = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm) {
    //this is not the place for password stuff
    throw new AppError(
      'This route is not for password updates, please use /updateMyPassword instead',
      400,
    );
  }
  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
};
export const getAllUsers = getAll(User);
export const deleteUserById = deleteOne(User);
export const getUserById = getOne(User);
//here we'll create an admin only controller for creating a user with roles that are not the default 'user' role - this is for creating guides and admins from the admin dashboard - we will not be using this route for signing up normal users as that is handled by the signup controller in authController
export const createUser = createOne(User);
