import express from 'express';
import { getOverview, getTour } from '../controllers/viewControllers.js';

export const router = express.Router();
// here we go setting up the routes for the View part of MVC
// router.get('/', (req, res) => {
//   //the second argument to render is how you inject local variables
//   res.status(200).render('base', {
//     title: 'Welcome',
//     tour: 'The Forest Hiker',
//     user: 'Giles',
//   });
// });

router.get('/', getOverview);

router.get('/tour/:slug', getTour);
