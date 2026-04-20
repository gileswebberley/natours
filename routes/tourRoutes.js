import express from 'express';
import {
  getAllTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
  aliasTopTours,
} from '../controllers/tourController.js';

export const router = express.Router();

//create our first 'alias route' for top 5 cheapest
router.route('/top-5-cheapest').get(aliasTopTours, getAllTours);

router.route('/').get(getAllTours).post(createTour);
// the :id is a placeholder for an id parameter that we can access in our tour controllers with req.params.id Please remember that params are set by having /example at the end of the url, however to build query strings we would use ?example=value&example2=otherValue at the end of the url and then access that with req.query.example in our controllers
router.route('/:id').get(getTourById).patch(updateTour).delete(deleteTour);
