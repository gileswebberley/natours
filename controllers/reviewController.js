import Review from '../models/reviewModel.js';

export const getAllReviews = async (req, res) => {
  const reviews = await Review.find();
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
  //remember that mongoose 9 does not automagically cast the ids to ObjectIds and so we have to do it ourselves - this is because the review model has the tour and user fields as ObjectIds and so if we don't do this then the create method will throw an error about the type of the tour and user fields not being correct. This is a bit of a pain but it is what it is - I guess it is a good thing as it forces us to be more explicit about what we are doing and to understand the data types better.
  const newReview = await Review.create({
    ...req.body,
    tour: new mongoose.Types.ObjectId(req.body.tour.toString()),
    user: new mongoose.Types.ObjectId(req.user.id.toString()),
  });
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
};
