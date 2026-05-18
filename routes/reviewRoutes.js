import express from 'express';
import { restrictTo, protect } from '../controllers/authController.js';
import {
  createReview,
  getAllReviews,
} from '../controllers/reviewController.js';

//we have set up a nested route for reviews in our tour routes which carries a tourId in the params object so here we must 'merge params' so that it can be accessed in our createReview controller
export const router = express.Router({ mergeParams: true });
//now we have used mergeParams we can add a check in the GET all reviews that will filter out the results to be reviews for the tour with tourId if it exists otherwise just get all

router
  .route('/')
  .get(getAllReviews)
  .post(protect, restrictTo('user'), createReview);
