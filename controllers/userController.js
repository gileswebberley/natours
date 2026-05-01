import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import { filterObj } from '../utils/utilFunctions.js';

//handy function to filter out any sneaky injected stuff like setting role:admin

export const getAllUsers = async (req, res) => {
  const users = await User.find();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
};

//updating password is seperate in general and so we have done that in authController
export const updateMe = async (req, res) => {
  //this is not the place for password stuff
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError(
      'This route is not for password updates, please use /updateMyPassword instead',
      400,
    );
  }
  //as we are no longer dealing with sensitive data we can avoid the find-update-save routine, so by-passing the pre-save hook, and simply use one of the compound functions but be careful to filter the data in the req.body to avoid injections. If the email is changed and forgot password is used then the user could be hijacked!? [TODO] Come back and fix this
  const filteredObj = filterObj(req.body, 'name', 'email');
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
