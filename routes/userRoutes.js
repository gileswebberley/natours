import express from 'express';
import { login, signup } from '../controllers/authController.js';
import { getAllUsers } from '../controllers/userController.js';

export const router = express.Router();

router.route('/signup').post(signup);
//rather than what's above the course uses which throws an error to say that this route does not exist (see app.js)
// router.route('/signup', signup);
router.route('/login').post(login);

router.route('/').get(getAllUsers);
