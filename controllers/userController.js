import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import {
  filterObj,
  mimicEmailTimer,
  mimicWorkTime,
} from '../utils/utilFunctions.js';

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

//seperate from updateMe as it deals with security issues, should it be in authController?
//body must contain email and passwordCurrent
export const updateMyEmail = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm) {
    //this is not the place for password stuff
    throw new AppError(
      'This route is not for password updates, please use /updateMyPassword instead',
      400,
    );
  }

  if (!req.body.passwordCurrent) {
    throw new AppError(
      'You must provide your current password to be able to change email address',
      401,
    );
  }

  if (!validator.isEmail(req.body.email)) {
    throw new AppError('Your new email address is not considered valid', 400);
  }
  //we need the password from the db and it is set to select:false so we need to add it back in to the result (this is why we strip it out in the authController when returning a token, no need here though)
  const user = await User.findById(req.user.id).select('+password');

  //use the bcrypt compare method to validate the password entered
  if (!(await user.comparePassword(req.body.passwordCurrent, user.password))) {
    throw new AppError('Authentication Failed', 401);
  }

  const isEmailTaken = await User.findOne({ email: req.body.email });
  if (isEmailTaken) {
    await mimicWorkTime(mimicEmailTimer);
    return res.status(200).json({
      status: 'success',
      message:
        'A verification has been sent to your new email address, if it is valid and available',
      data: null,
    });
  }

  //done our checks so we'll set up the pending email change
  user.pendingEmail = req.body.email;
  const verifyToken = user.createEmailResetToken();
  //we'll also notify the current email that this is happening so they can block it - we have it so the password can't be changed for 24hrs too
  user.oldEmail = user.email;
  const revertToken = user.createEmailRevertToken();
  //we've made changes inside the instance method createEmailResetToken so we'll save the user
  await user.save({ validateBeforeSave: false });

  const verifyURL = `${req.protocol}://${req.get('host')}/api/v1/users/verifyEmail/${verifyToken}`;
  const messageNew = `To confirm the change to your email address registered to Natours please go to ${resetURL}\nPlease note that this link is only valid for 10 minutes \nIf you did not send this email change request please ignore this email`;

  const revertURL = `${req.protocol}://${req.get('host')}/api/v1/users/revertEmail/${revertToken}`;
  const messageOld = `A request was made to change your email address to ${req.body.email}. This may be an attempt by a hacker to hijack your account. If this wasn't you please go to ${revertURL} urgently to block this attempt and secure your account`;
  //because there may be an error when trying to send an email it might throw an error and we will want to clean up the user so the token doesn't exist
  try {
    // send email to new address to confirm
    await sendEmail({
      email: req.body.email,
      subject:
        'You must confirm the change to your email on Natours within 10 minutes',
      messageNew,
    });
    //send the warning to the current email to revert/block
    await sendEmail({
      email: user.email,
      subject:
        '[URGENT SECURITY ISSUE] A request has been made to change your email',
      messageOld,
    });
    return res.status(200).json({
      status: 'success',
      message: 'Verification link sent to your new email address',
      data: null,
    });
  } catch (err) {
    user.set('emailResetToken', undefined, { strict: false });
    user.set('emailResetExpires', undefined, { strict: false });
    user.save({ validateBeforeSave: false });
    //for the improved security version of this we'll simply log any errors rather than throw them
    console.error(`There was an error sending the email change email: ${err}`);
  }
};

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
  const filteredObj = filterObj(req.body, 'name');
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
