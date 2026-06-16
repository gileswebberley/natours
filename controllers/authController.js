import { promisify } from 'node:util';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import validator from 'validator';
import {
  cryptoHash,
  mimicEmailTimer,
  mimicWorkTime,
} from '../utils/utilFunctions.js';
// import strict from 'node:assert/strict';

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
  //convert the expiry into an actual timestamp, jsonwebtoken apparently uses a package called ms to parse these strings (like 90d or 300m)
  const expiresMS = ms(process.env.JWT_EXPIRES_IN);
  const expiresTimestamp = Date.now() + expiresMS;

  //we'll now send a cookie with the token as well. All of these options must be the same in the logout cookie for modern browsers. The sameSite option should be 'lax' for a monolith structure that we have (ie no seperate front end built in React or some such) and 'none' if we want our api available to the seperate front-end. If set to none then secure must be true!!
  const cookieOptions = {
    expires: new Date(expiresTimestamp),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
  };
  //and add this to the response by using the cookie(name, value, options) method - the name is unique so if you send a new one it will simply replace the cookie that the client has in their browser.
  res.cookie('jwt', token, cookieOptions);
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

//Later in the course when we're dealing with security and authentication there is a comment about the original create implementation, apparently we will be setting up user roles and if we didn't do the changes then a vicious user could set their own role as admin and get the least restricted access to the database. We'll implement a createUser controller for admin use only which will allow for roles to be set.
export const signup = async (req, res) => {
  //   const newUser = await User.create(req.body); - Dangerous version
  //to avoid user role: admin from being injected into the body of the request
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createAndSendToken(newUser, 201, res);
};

export const login = async (req, res) => {
  // const { email, password } = req.body;
  //we'll do these checks to belt-and-braces the validation that we have to avoid any malicious scripts that may have not been caught by the sanitizer in the app.js
  const email = typeof req.body.email === 'string' ? req.body.email : '';
  const password =
    typeof req.body.password === 'string' ? req.body.password : '';
  //check if email and password exists
  if (!email || !password)
    throw new AppError('Please supply an email and password', 400);
  //check if user exists and that password is correct
  //because we have set the password to not be returned by default, by setting select: false in the userModel, we have to add it back into the results here by using the '+password'
  const user = await User.findOne({ email }).select('+password');
  //for safety don't give any information about what was wrong with the login attempt
  if (!user) {
    mimicWorkTime(mimicPasswordCheckTimer);
    throw new AppError('Incorrect email or password', 401);
  }
  //now because the password returned is the hashed version we need to hash the password supplied in the req.body and compare to that - see the userModel as we are keeping the 'model fat but the controller thin' as discussed in the section about MVC
  //because we have added the instance method to the user model, and because the user variable is in fact a user-document object we can call the method
  const correct = await user.comparePassword(password, user.password);
  //we could do if(!user || !(await user.comparePassword(password, user.password))) instead as if there was no user it would not try the second OR argument and so would not throw an error for password not being a property of user. I prefer it like this though because it is much clearer to me.
  if (!correct) throw new AppError('Incorrect email or password', 401);

  createAndSendToken(user, 200, res);
};

//now to log out we essentially need to replace the valid cookie we sent with the createAndSendToken with a short lived mock cookie that has the same name and also, since the course was recorded, you need to have all of the other options the same
export const logout = (req, res) => {
  res.cookie('jwt', 'mockdata', {
    expires: new Date(Date.now() + 10 * 1000),
    secure: process.env.NODE_ENV === 'production',
    //'lax' is for the monolith structure we are creating with pug templates being served from the same domain, if using it as a backend for a react app or something we should simply rely on the Bearer Token system.
    sameSite: 'lax',
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

//we'll create a middleware function to protect routes by verifying the token. The standard way of doing this is to send a request header called authorization (American spelling) with a value of 'Bearer [token]'. Notice we are going to take manual control of the next function by having it as the 3rd arg because this is middleware rather than a 'destination' controller that sends a response
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // we haven't got it in the header so grab it from the cookie that is provided by createAndSendToken()
    token = req.cookies.jwt;
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
  //also add it to the locals so we can send view routes through this and pug templates will still have access to the user, just like in our isLoggedIn controller
  res.locals.user = checkUser;
  next();
};

//for conditionally rendering pages we'll just check if a user is logged in - we'll set the res.locals variable which is accessible from pug templates just like when we pass things through in the render() in our view controllers - we do not want to throw any errors in this as it will just be setting the locals user variable if all good
export const isLoggedIn = async (req, res, next) => {
  //we are using the cookie rather than headers in our front-end pug site
  try {
    let token;
    if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next();
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const checkUser = await User.findById(decoded.id);
    if (!checkUser) {
      return next();
    }

    if (checkUser.changedPasswordAfterJwtIssue(decoded.iat)) {
      return next();
    }

    //made it through all of the checks so move along the pipeline and add this user to the res.locals
    res.locals.user = checkUser;
    next();
  } catch (err) {
    //for when a user logs out to prevent the malformed jwt token error
    return next();
  }
};

// 403 - Forbidden btw
//Roles manager - a nice use of a closure and the ...rest operator. used in routes
export const restrictTo = (...roles) => {
  //now we return the middleware function itself
  return (req, res, next) => {
    //here we have access to the outer function's roles argument and we also have access to the user that protect() passed on to here on the req object
    if (!req?.user?.role || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

//[TODO][DONE] implement a secure route for changing user email to avoid hijacking

//because we have learnt that it is bad to send errors from the forgotPassword function we want to mimic the time it would take to send an email (apparently this helps to stop an attacker from using 'Timing Attacks') - this is not the best approach but ok for now, this leaves the sockets open which uses up RAM on the server. Instead we should consider using background 'workers' - Agenda is a good choice when working with MongoDB and it avoids the need for Redis, which BullMQ requires. I've added this to my utilFunctions as I want to use it in userController for attempted email changes
// const mimicEmailTimer = 800 + Math.random() * 700;
// const mimicWorkTime = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//we will now add the functionality for a user forgetting their password. We'll create a temporary reset token inside an instance method of our user model to produce it, encrypt it, and save it to the user document on the database
export const forgotPassword = async (req, res) => {
  //first get our user based on the email they provide (to send the reset token to)
  const user = await User.findOne({ email: req.body.email });
  //let's try to lock this down a bit - check if they already have a reset request pending (No, it's best just to overwrite the token with a new one) and make sure you're not being flooded by requests to reset
  if (!user) {
    //don't give away the information that the email is not valid as this can be used to create a valid users list by hackers
    console.error(
      'ERROR: password reset request received for an invalid email address',
    );
    //wait to mimic working
    await mimicWorkTime(mimicEmailTimer);
  } else {
    //check if the request is too soon after the initial request and send a response to break out of the function
    if (user.passwordResetExpires) {
      //NO you silly c***
      const coolDown = 60 * 1000;
      const timeSinceLastRequest =
        Date.now() -
        (user.passwordResetExpires -
          Number(process.env.RESET_PASSWORD_EXPIRES_IN));
      if (timeSinceLastRequest < coolDown) {
        console.error(
          'ERROR: password reset request too soon after initial request (<1min)',
        );
        //wait to mimic working
        await mimicWorkTime(mimicEmailTimer);
        //stop the rest of this method from executing - remember the return!!
        return res.status(200).json({
          status: 'success',
          message:
            'Reset password token sent by email if your account is valid',
        });
      }
    }
    //add in the lock for if the email has been changed and let the old user know that they are at risk of being hijacked
    if (user.emailChangedAt) {
      const emailCoolDown = 24 * 60 * 60 * 1000;
      const isChangeLocked =
        Date.now() - user.emailChangedAt.getTime() < emailCoolDown;
      if (isChangeLocked) {
        if (user.oldEmail) {
          await sendEmail({
            email: user.oldEmail,
            subject:
              '[SECURITY NOTIFICATION] Someone has tried to reset your password',
            message: `Someone tried to reset your password shortly after changing your Natours email address to ${user.email}. You should have received an email when this change was made, please find it and follow the link to revert to this address and secure your account.`,
          });
        }
        throw new AppError(
          `For your security password resets are restricted for 24hrs after an email change`,
        );
      }
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
      // console.log('sending reset email');
      await sendEmail({
        email: user.email,
        subject: 'Your password reset link (expires in 10 minutes)',
        message,
      });
    } catch (err) {
      user.set('passwordResetToken', undefined, { strict: false });
      user.set('passwordResetExpires', undefined, { strict: false });
      await user.save({ validateBeforeSave: false });
      //for the improved security version of this we'll simply log any errors rather than throw them
      console.error(
        `There was an error sending the password reset email: ${err}`,
      );
    }
  }
  //finally finish the request-response cycle whether successful or not for security reasons
  res.status(200).json({
    status: 'success',
    message: 'Reset password token sent by email if your account is valid',
  });
};

export const resetPassword = async (req, res) => {
  //get user based on token, but remember the token on the db is encryted and the token in the param is not. Because we just used a fairly simple hashing we can simply hash this token and it will result in the same string as when we did it in userModel instance method
  const hashedToken = cryptoHash(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    throw new AppError('Invalid reset password token', 498);
  }
  //save the new password - via the encryting pre-save hook in the user modal and remove the reset token so it can only be used once (even if it is still valid)
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  //somehow my passwordResetToken is still on my user documenent, and without an expiry time!! Use belt and braces aproach of using the set() method instead of simply = undefined
  user.set('passwordResetToken', undefined, { strict: false });
  user.set('passwordResetExpires', undefined, { strict: false });
  //now save so that it goes through the validation and pre-save hook
  console.log('Reset password is saving');
  await user.save();

  createAndSendToken(user, 200, res);
};

//allow a logged in user to change their password by entering their existing password and their new one
//expects a body of 'password', 'newPassword', and 'newPasswordConfirm' and it should have been through the protect() middleware
export const updateMyPassword = async (req, res) => {
  //assume this is a protected route and so we should be able to get our token from the headers - NO NEED remember that protect() adds the current user to the request object
  //don't forget to 'reselect' the password cos it's removed from results by default
  const user = await User.findById(req.user.id).select('+password');
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

//seperate from updateMe as it deals with security issues, should it be in authController - yes I think so?
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

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/verifyEmail/${verifyToken}`;
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
      message: messageNew,
    });
    //send the warning to the current email to revert/block - can't on the Mailtrap free plan :(
    if (process.env.NODE_ENV !== 'development') {
      await sendEmail({
        email: user.email,
        subject:
          '[URGENT SECURITY ISSUE] A request has been made to change your email',
        message: messageOld,
      });
    } else {
      console.log(`Fake email for development: ${messageOld}`);
    }
    return res.status(200).json({
      status: 'success',
      message: 'Verification link sent to your new email address',
      data: null,
    });
  } catch (err) {
    user.set('emailResetToken', undefined, { strict: false });
    user.set('emailResetExpires', undefined, { strict: false });
    user.set('emailRevertToken', undefined, { strict: false });
    user.set('emailRevertExpires', undefined, { strict: false });
    user.set('oldEmail', undefined, { strict: false });
    user.set('pendingEmail', undefined, { strict: false });
    await user.save({ validateBeforeSave: false });
    //for the improved security version of this we'll simply log any errors rather than throw them
    console.error(`There was an error sending the email change email: ${err}`);
    return res.status(200).json({
      status: 'success',
      message: 'Verification link sent to your new email address if valid',
      data: null,
    });
  }
};

//this has been added as there was an obvious security risk to allowing an email to be changed without any checks (ie change email, forgotPassword, reset password = user hijacked)
export const verifyEmail = async (req, res) => {
  const hashedToken = cryptoHash(req.params.token);
  //don't worry about the select:false on the emailResetToken as it will still work for the query
  const user = await User.findOne({
    emailResetToken: hashedToken,
    emailResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Email reset token is invalid or has expired', 400);
  }

  // user.oldEmail = user.email;
  user.set('oldEmail', user.email, { strict: false });
  // user.email = user.pendingEmail;
  user.set('email', user.pendingEmail, { strict: false });
  user.set('pendingEmail', undefined, { strict: false });
  user.set('emailResetToken', undefined, { strict: false });
  user.set('emailResetExpires', undefined, { strict: false });

  await user.save({ validateBeforeSave: false });

  createAndSendToken(user, 200, res);
};

//So the original user can change the email back to as it was before someone tried to change it
export const revertEmail = async (req, res) => {
  const hashedToken = cryptoHash(req.params.token);
  const user = await User.findOne({
    emailRevertToken: hashedToken,
    emailRevertExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Email revert token is invalid or has expired', 400);
  }

  // user.oldEmail = user.email;
  user.set('email', user.oldEmail, { strict: false });
  // user.email = user.pendingEmail;
  user.set('oldEmail', undefined, { strict: false });
  user.set('pendingEmail', undefined, { strict: false });
  user.set('emailResetToken', undefined, { strict: false });
  user.set('emailResetExpires', undefined, { strict: false });
  user.set('emailRevertToken', undefined, { strict: false });
  user.set('emailRevertExpires', undefined, { strict: false });
  //this is so someone who has averted a hijacking can then immediately change their password if they wish - see the changes to the pre-save hook in the userModel that handles setting this field
  user.set('emailChangedAt', undefined, { strict: false });
  //kick out the hacker if there is one by invalidating their jwt, the pre-save hook would not do this automatically as we have not changed the password!
  user.passwordChangedAt = new Date(Date.now() - 1000);

  await user.save({ validateBeforeSave: false });

  createAndSendToken(user, 200, res);
};
