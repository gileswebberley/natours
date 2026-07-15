import express from 'express';
import {
  getAllTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeAndUploadTourImages,
} from '../controllers/tourController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import { router as reviewRouter } from './reviewRoutes.js';

export const router = express.Router();
//we want to pass on the review route /:tourId/reviews to the review router instead of implementing it twice (ie here and there). As the Router is simply a bit of middleware we can use the use() method to do this, however we'll need to add a mergeParams option in our review router to be able to access tourId
router.use('/:tourId/reviews', reviewRouter);

//create our first 'alias route' for top 5 cheapest
router.route('/top-5-cheapest').get(aliasTopTours, getAllTours);

//use our first aggregation pipeline
router.route('/tour-stats').get(getTourStats);

router
  .route('/tour-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

//a geospatial query route that uses params to carry the data - so within distance of the latlng point and expressed in unit (mi/km)
router
  .route('/tours-within/distance/:distance/latlng/:latlng/unit/:unit')
  .get(getToursWithin);

//now calculate the distance of each tour from a given point
router.route('/distances/:latlng/unit/:unit').get(getDistances);

router
  .route('/')
  .get(getAllTours)
  .post(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeAndUploadTourImages,
    createTour,
  );
// the :id is a placeholder for an id parameter that we can access in our tour controllers with req.params.id Please remember that params are set by having /example at the end of the url, however to build query strings we would use ?example=value&example2=otherValue at the end of the url and then access that with req.query.example in our controllers
//we'll imlplement our authentication and authorisation on the delete tour route so only admin and lead-guide can use that functionality
router
  .route('/:id')
  .get(getTourById)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeAndUploadTourImages,
    updateTour,
  )
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour);
