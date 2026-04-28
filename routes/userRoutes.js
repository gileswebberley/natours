import express from 'express';
import { signup } from '../controllers/authController.js';

export const router = express.Router();

router.route('/signup').post(signup);
