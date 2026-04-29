import express from 'express';
import { signup } from '../controllers/authController.js';

export const router = express.Router();

router.route('/signup').post(signup);
//rather than what's above the course uses which throws an error to say that this route does not exist (see app.js)
// router.route('/signup', signup);
