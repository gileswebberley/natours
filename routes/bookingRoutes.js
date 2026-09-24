import express from 'express';
import { getCheckoutSession } from '../controllers/bookingController.js';
import { isLoggedIn, protect } from '../controllers/authController.js';

export const router = express.Router();
//it's post rather than get because we are now passing through a date and number of tickets
router.post('/checkout-session/:tourId', protect, getCheckoutSession);
