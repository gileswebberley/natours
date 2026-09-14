import Tour from '../models/tourModel.js';
import AppError from '../utils/appError.js';

export const getCheckoutSession = async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  // 2) Create checkout session
};
