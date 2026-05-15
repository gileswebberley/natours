import express from 'express';
import {
  createReview,
  getAllReviews,
} from '../controllers/reviewController.js';

export const router = express.Router();

router.route('/').get(getAllReviews).post(createReview);
