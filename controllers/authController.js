import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

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
  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

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
