import express from 'express';
import {
  getAllTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
  checkID,
  checkBody,
} from '../controllers/tourController.js';

//Think of this, and any other routers we create, as mini apps that we can mount on our main app. This is a really nice way to keep our code organized and modular. We can have a router for each resource in our API (e.g. tours, users, reviews, etc.) and then we can import those routers into our main app and mount them on specific paths.
export const router = express.Router();

//In this router file we are have defined one route that will handle a param being passed in (in this case the :id of a tour) and we can set up a local middleware function that can gain access to this by using the param() method on the router. Notice that like all middleare we have a next parameter but also a forth parameter that holds the value of the param we are grabbing from the url. The first argument is the name we have given to the param we want to deal with and the second is the function itself. Note that this will only run for routes that have the param in them (eg /:id) and not for those that do not (eg /). Within several of our tour controllers we have checks to see if the id is valid, all the same code and that is something you always want to avoid. So instead we can use this param middleware to do the check for us and then we can be sure that if the code gets past this point in the 'pipeline' then the id is valid and we don't have to worry about it anymore in the rest of our code. Because the check relies on checking the length of the tours array, which is only available in the tourControllers file we will create the function in there (remembering to add the val property to the function parameters) and import it here.
router.param('id', checkID);

//as an example of running multiple middlewares in order we will add a chaeckBody function to the post route which checks if there is a price and name in the body of the request and if not it will send a 400 (bad request) response
router.route('/').get(getAllTours).post(checkBody, createTour);
router.route('/:id').get(getTourById).patch(updateTour).delete(deleteTour);
