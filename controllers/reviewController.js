import mongoose from 'mongoose';
import Review from '../models/reviewModel.js';

export const getAllReviews = async (req, res) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };
  const reviews = await Review.find(filter);
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
};

//this is running through the protect middleware in authController and so we have the user object on the req object
export const createReview = async (req, res) => {
  console.log('Creating review');
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
