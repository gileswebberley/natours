import mongoose from 'mongoose';
import Review from '../models/reviewModel.js';
import { deleteOne, getAll, getOne, updateOne } from './handlerFactory.js';
import AppError from '../utils/appError.js';

//so we can use the factory getAll we'll need a tiny bit of middleware for the possibility of this being a nested route with the tourId in the params
export const createTourReviewFilter = (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };
  req.getAllFilter = filter;
  next();
};

//we don't want reviews to be updated so that they seem to be for a different tour or user as that would be dodgy, so we'll add in a check for that in a piece of middleware that we can use in the update route before the updateOne factory function
export const updateFilter = async (req, res, next) => {
  if (req.body.tour || req.body.user) {
    throw new AppError(
      'The tour and user connected to this review cannot be changed as part of an update',
      403,
    );
  }
  next();
};

//check that the user trying to update or delete a review is the one that created it, or an admin
export const isUsersReview = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('No review found with that id', 404);
  }
  if (review.user !== req.user.id && req.user.role !== 'admin') {
    throw new AppError(
      'You do not have permission to perform this action',
      403,
    );
  }
  next();
};

//now we can call get all as we have implemented the filtering that is created by createTourReviewFilter to get all but only for a particular tour
export const getAllReviews = getAll(Review);
export const getReviewById = getOne(Review);
export const deleteReview = deleteOne(Review);
export const updateReview = updateOne(Review);

//so an admin can hide reviews from the public without deleteing them
export const markReviewAsInappropriate = async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { approved: false },
    {
      returnDocument: 'after',
      runValidators: false,
    },
  );
  if (!review) {
    throw new AppError('No review found with that id', 404);
  }
  res.status(200).json({
    status: 'success',
    review,
  });
};
//this is running through the protect middleware in authController and so we have the user object on the req object
export const createReview = async (req, res) => {
  //we are going to allow this to work with a nested route, seeing as this relates to a tour and we don't want the user to have to add the tour id manually to the req.body we'll check if it has been supplied and if not we'll assume it is in the params
  const tourId = req.body.tour ? req.body.tour : req.params.tourId;
  if (!tourId) {
    throw new AppError('No tour id supplied for review', 400);
  }
  //and let's do the same for a user, so it's either manually entered in the req.body or it is the user who is logged in (so we can get it from the req.user object that is added by the protect() middleware in authController)
  const userId = req.body.user ? req.body.user : req.user.id;
  if (!userId) {
    throw new AppError('No user id supplied for review', 400);
  }
  //remember that mongoose 9 does not automagically cast the ids to ObjectIds and so we have to do it ourselves - this is because the review model has the tour and user fields as ObjectIds and so if we don't do this then the create method will throw an error about the type of the tour and user fields not being correct. This is a bit of a pain but it is what it is - I guess it is a good thing as it forces us to be more explicit about what we are doing and to understand the data types better.
  const newReview = await Review.create({
    ...req.body,
    tour: new mongoose.Types.ObjectId(tourId.toString()),
    user: new mongoose.Types.ObjectId(userId.toString()),
  });
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
};
