import express from 'express';
import { restrictTo, protect } from '../controllers/authController.js';
import {
  createReview,
  createTourReviewFilter,
  deleteReview,
  getAllReviews,
  getReviewById,
  isUsersReview,
  markReviewAsInappropriate,
  updateFilter,
  updateReview,
} from '../controllers/reviewController.js';

//we have set up a nested route for reviews in our tour routes which carries a tourId in the params object so here we must 'merge params' so that it can be accessed in our createReview controller
export const router = express.Router({ mergeParams: true });
//now we have used mergeParams we can add a check in the GET all reviews that will filter out the results to be reviews for the tour with tourId if it exists otherwise just get all

//I'm leaving the getAll (which includes getAllForTourId) open to the public but have added an approved field so an admin can hide reviews that are inappropriate
router
  .route('/')
  .get(createTourReviewFilter, getAllReviews)
  .post(protect, restrictTo('user'), createReview);

//all the rest should be protected
router.use(protect);

//isUsersReview checks that users can only update or delete their own reviews, or that they are an admin, and updateFilter checks that the tour and user fields are not being updated as part of the review update
router
  .route('/:id')
  .get(getReviewById)
  .patch(updateFilter, isUsersReview, updateReview)
  .delete(isUsersReview, deleteReview);

//this is an admin only route to mark a review as inappropriate without deleting it so that it won't be shown to the public but will still be in the database
router
  .route('/:id/mark-inappropriate')
  .patch(restrictTo('admin'), markReviewAsInappropriate);
