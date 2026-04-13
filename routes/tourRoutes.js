import express from 'express';
import {
  getAllTours,
  createTour,
  getTourById,
} from '../controllers/tourController.js';

//Think of this, and any other routers we create, as mini apps that we can mount on our main app. This is a really nice way to keep our code organized and modular. We can have a router for each resource in our API (e.g. tours, users, reviews, etc.) and then we can import those routers into our main app and mount them on specific paths.
export const router = express.Router();

//In this router file we are have defined one route that will handle a param being passed in (in this case the :id of a tour) and we can set up a local middleware function that can gain access to only this by using the param() method on the router. As an example let's just set that up to log the id that is being passed in. Notice that like all middleare we have a next parameter but also a forth parameter that holds the value of the param we are grabbing from the url. The first argument is the name we have given to the param we want to deal with and the second is the function itself. Note that this will only run for routes that have the param in them (eg /:id) and not for those that do not (eg /).
router.param('id', (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);
  //and of course we need to call next as usual so that the 'pipeline' doesn't stop here...
  next();
});

router.route('/').get(getAllTours).post(createTour);
router.route('/:id').get(getTourById);
