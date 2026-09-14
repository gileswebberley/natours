import express from 'express';
import { getCheckoutSession } from '../controllers/bookingController.js';
import { isLoggedIn, protect } from '../controllers/authController.js';

export const router = express.Router();

router.get('/checkout-session/:tourId', protect, getCheckoutSession);
