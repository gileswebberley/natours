import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { filterObj } from '../utils/utilFunctions.js';
import { deleteOne, getAll } from './handlerFactory.js';

//handy function to filter out any sneaky injected stuff like setting role:admin when updating can be found in the utils/utilFunctions.js file and simply takes an object and a list of allowed fields and then creates a new object with only those fields in it - this is used in the updateMe controller to filter out any fields that the user is not allowed to change (like role or password)

export const getAllUsers = getAll(User);
//This is for admin use only (see the deleteUser route in userRoutes)
export const deleteUser = deleteOne(User);

//updating password is seperate in general and so we have done that in authController. The obvious risk of being able to change the email has led to several security considerations. I have therefore implemented a safer forgotPassword in authController and I will require the current password to be able to change the email field - let's make the email change a seperate route actually.
export const updateMe = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm) {
    //this is not the place for password stuff
    throw new AppError(
      'This route is not for password updates, please use /updateMyPassword instead',
      400,
    );
  }

  //as we are no longer dealing with sensitive data we can avoid the find-update-save routine, so by-passing the pre-save hook, and simply use one of the compound functions but be careful to filter the data in the req.body to avoid injections. If the email is changed and forgot password is used then the user could be hijacked!? [TODO] Come back and fix this
  const filteredObj = filterObj(req.body, 'name', 'photo');
  //remember that this will be on a protected route (with protect() as a stage) and so will have the user on the request object. The last argument is the options object which says to pass the new field properties through validation (like isEmail) and to return the newly changed document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredObj, {
    new: true,
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
  const anonymisedUser = {
    active: false,
    name: 'deleted_user',
    email: `deleted_${Date.now().getTime()}@natours.com`,
    password: null,
    photo: null,
  };
  await User.findByIdAndUpdate(req.user.id, anonymisedUser, {
    runValidators: false,
  });
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
