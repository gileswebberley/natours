import Tour from '../models/tourModel.js';
import AppError from '../utils/appError.js';
import { getOne } from './handlerFactory.js';
import { getTourById } from './tourController.js';

export const getOverview = async (req, res) => {
  const tours = await Tour.find();
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
};

export const getTour = async (req, res) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate([
    { path: 'guides', select: '-__v -passwordChangedAt' },
    { path: 'reviews', select: 'review rating user' },
  ]);
  if (!tour) {
    throw new AppError('There is no tour with that name', 404);
  }
  res.status(200).render('tour', {
    title: tour.name,
    tour,
  });
};

export const getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

export const getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Sign up for Natours',
  });
};

export const resetPassword = (req, res) => {
  res.status(200).render('resetPassword', {
    title: 'Reset your password',
    token: req.params.token,
  });
};
