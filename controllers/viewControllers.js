import Booking from '../models/bookingModel.js';
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

//get all tours that have been booked by this logged in user
export const getMyTours = async (req, res) => {
  //find all the bookings for this user
  const bookings = await Booking.find({ user: req.user.id });
  //create an array of the tour ids from the bookings
  const tourIds = bookings?.map((booking) => booking.tour);
  //then we can use the handy $in operator to get all of the tours whose id is in our tourIds
  const tours = await Tour.find({ _id: { $in: tourIds } });
  console.log(tours);
};

//try the alternative virtual thing so we can have the booking info with the tours too I think...
export const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).populate({
    path: 'tourDetails',
  });
  const tourDetails = bookings.map((booking) => {
    // added the justOne: true to the virtual property to avoid these being inside a single object array
    // set the only start date to the date that the tour has been booked for
    booking.tourDetails.startDates = [booking.tourStartDate];
    return booking.tourDetails;
  });
  console.log(tourDetails);
  console.log();
  res.status(200).render('userAccountBookings', {
    title: 'Your Tours',
    tours: tourDetails,
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

export const verifyEmail = (req, res) => {
  res.status(200).render('verifyEmail', {
    title: 'Verify Your Email',
    token: req.params.token,
  });
};

export const revertEmail = (req, res) => {
  res.status(200).render('revertEmail', {
    title: 'Secure Your Email',
    token: req.params.token,
  });
};

export const getMe = (req, res) => {
  res.status(200).render('userAccountSettings', {
    title: 'User Account',
  });
};
