import { promisify } from 'node:util';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { cryptoHash } from '../utils/utilFunctions.js';

//we'll make a little token generation utility function
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  //remove the password from the user document cos it's a security issue. It's not a query object so we can't use select() at this stage
  //   user.select('-password');
  const userObject = user.toObject();
  delete userObject.password;
  //convert the expiry into an actual timestamp, jsonwebtoken apparently uses a package called ms to parse these strings
  const expiresMS = ms(process.env.JWT_EXPIRES_IN);
  const expiresTimestamp = Date.now() + expiresMS;
  //It doesn't in the course but should we not send the client the expires-in time too?
  res.status(statusCode).json({
    status: 'success',
    token,
    token_expires_at: expiresTimestamp,
    data: {
      user: userObject,
    },
  });
};

//Later in the course when we're dealing with security and authentication there is a comment about the original create implementation, apparently we will be setting up user roles and if we didn't do the changes then a vicious user could set their own role as admin and get the least restricted access to the database.
export const signup = async (req, res) => {
  //   const newUser = await User.create(req.body); - Dangerous version
  //to avoid user role: admin from being injected into the body of the request
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createAndSendToken(newUser, 201, res);
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  //check if email and password exists
  if (!email || !password)
    throw new AppError('Please supply an email and password', 400);
  //check if user exists and that password is correct
  //because we have set the password to not be returned by default, by setting select: false in the userModel, we have to add it back into the results here by using the '+password'
  const user = await User.findOne({ email }).select('+password');
  //for safety don't give any information about what was wrong with the login attempt
  if (!user) throw new AppError('Incorrect email or password', 401);
  //now because the password returned is the hashed version we need to hash the password supplied in the req.body and compare to that - see the userModel as we are keeping the 'model fat but the controller thin' as discussed in the section about MVC
  //because we have added the instance method to the user model, and because the user variable is in fact a user-document object we can call the method
  const correct = await user.comparePassword(password, user.password);
  //we could do if(!user || !(await user.comparePassword(password, user.password))) instead as if there was no user it would not try the second OR argument and so would not throw an error for password not being a property of user. I prefer it like this though because it is much clearer to me.
  if (!correct) throw new AppError('Incorrect email or password', 401);

  createAndSendToken(user, 201, res);
};

//we'll create a middleware function to protect routes by verifying the token. The standard way of doing this is to send a request header called authorization (American spelling) with a value of 'Bearer [token]'. Notice we are going to take manual control of the next function by having it as the 3rd arg because this is middleware rather than a 'destination' controller that sends a response
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError(
        'You are not currently logged in and you are trying to reach a protected route',
        401,
      ),
    );
  }
  //Now, as we are using the old but popular jsonwebtoken package rather than jose we need to use a node utility function so we can carry on working with Promises and the async/await
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //We also want to check that the user still actually exists
  const checkUser = await User.findById(decoded.id);
  if (!checkUser) {
    return next(new AppError('The token does not match a user', 401));
  }

  //and just in case a user has had to change their password since the token was issued we'll create a new instance method in the user model which we can call on the checkUser document returned above (iat is the property of the token payload and is Issued At Timestamp)
  if (checkUser.changedPasswordAfterJwtIssue(decoded.iat)) {
    return next(
      new AppError(
        'The user has recently changed their password, please log in again',
        401,
      ),
    );
  }
  //made it through all of the checks so move along the pipeline and add this user to the request object for the next stage - we will use this in the roles manager function restrictTo()
  req.user = checkUser;
  next();
};

// 403 - Forbidden btw
//Roles manager - a nice use of a closure and the ...rest operator
export const restrictTo = (...roles) => {
  //now we return the middleware function itself
  return (req, res, next) => {
    //here we have access to the outer function's roles argument and we also have access to the user that protect() passed on to here on the req object
    if (!req?.user?.role || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
  };
  next();
};

//we will now add the functionality for a user forgetting their password. We'll create a temporary reset token inside an instance method of our user model to produce it, encrypt it, and save it to the user document on the database
export const forgotPassword = async (req, res) => {
  //first get our user based on the email they provide (to send the reset token to)
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    throw new AppError(
      'There is no user with the email address you provided',
      404,
    );
  }
  //now we'll use the instance method we created in the user model
  const resetToken = user.createPasswordResetToken();
  //because the instance method createPasswordResetToken has added some fields we need to save the user to the database again, but we don't want to go through all of the schema validation
  await user.save({ validateBeforeSave: false });

  //We have now set up our email sending function so we'll send a link to the reset route
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm in the body to: ${resetURL} \nPlease note that this link is only valid for 10 minutes \nIf you did not send this password reset request please ignore this email`;
  //because there may be an error when trying to send an email it might throw an error and we will want to clean up the user so the token doesn't exist
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset link',
      message,
    });
    //finally finish the request-response cycle
    res.status(200).json({
      status: 'success',
      message: 'Reset password token send by email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    throw new AppError(
      `There was an error sending the password reset email: ${err}`,
      500,
    );
  }
};

export const resetPassword = async (req, res) => {
  //get user based on token, but remember the token on the db is encryted and the token in the param is not. Because we just used a fairly simple hashing we can simply hash this token and it will result in the same string as when we did it in userModel instance method
  const hashedToken = cryptoHash(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    throw new AppError(
      'Could not find a user with the reset password token recieved or that token has expired',
      400,
    );
  }
  //save the new password - via the encryting pre-save hook in the user modal and remove the reset token so it can only be used once (even if it is still valid)
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //now save so that it goes through the validation and pre-save hook
  await user.save();

  createAndSendToken(user, 200, res);
};

//allow a logged in user to change their password by entering their existing password and their new one
//expects a body of 'password', 'newPassword', and 'newPasswordConfirm' and it should have been through the protect() middleware
export const updatePassword = async (req, res) => {
  //assume this is a protected route and so we should be able to get our token from the headers - NO NEED remember that protect() adds the current user to the request object
  //   const token = req.headers.authorization.split(' ')[1];
  //   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //   const user = await User.findOne({ _id: decoded.id });
  //don't forget to 'reselect' the password cos it's removed from results by default
  const user = User.findById(req.user.id).select('+password');
  if (!user) {
    throw new AppError('Cannot find a user to update their password', 404);
  }
  if (await user.comparePassword(req.body.password, user.password)) {
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;
    //as usual we are using the seperate save() method so that it passes through the pre-save hook and validation functions that rely on the this keyword
    await user.save();

    createAndSendToken(user, 200, res);
  } else {
    throw new AppError(
      'The current password supplied was not correct for your user',
      401,
    );
  }
};
