import { promisify } from 'node:util';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import AppError from '../utils/appError.js';

//we'll make a little token generation utility function
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
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
  //login user on signup using jsonwebtoken package - Jose is another option btw
  const token = signToken(newUser._id);

  //It doesn't in the course but should we not send the client the expires-in time too?
  res.status(201).json({
    status: 'success',
    token,
    token_expires_in: process.env.JWT_EXPIRES_IN,
    data: {
      user: newUser,
    },
  });
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

  //if all is good send back the token
  const token = signToken(user._id);

  //It doesn't in the course but should we not send the client the expires-in time too?
  res.status(201).json({
    status: 'success',
    token,
    token_expires_in: process.env.JWT_EXPIRES_IN,
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
