import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tourRouter } from './routes/tourRoutes.js';
import { router as userRouter } from './routes/userRoutes.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './controllers/errorController.js';
import { globalLimiter } from './utils/rateLimiters.js';
// import rateLimit from 'express-rate-limit';
//remember these are properties of the node.js wrapper function when using commonJS modules (ie require()) so we do not have access to them when we are using ES modules (import/export) so we have to create our own
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//export app for server.js to use
export const app = express();

// for parsing queries with for example duration[gte]=5 we need to set the extended option to true, unlike in the course where it worked out of the box
app.set('query parser', 'extended');

//to make rate limiting function when deployed to a platform like Heroku (which is essentially a proxy) we must set this
app.set('trust proxy', 1);

//now let's set up our rate limiters in a seperate file
// //general suggested 100 per 15 minutes
// const globalLimiter = rateLimit({
//   max: 100,
//   windowMs: 15 * 60 * 1000,
//   message: {
//     status: 'fail',
//     message: 'Too many requests, please try again later',
//   },
// });
// //sensitive route limit 5 per 15 minutes - as this is a piece of middleware we can simply add it to our sensitive routes just like the protect() that we built earlier
// export const authLimiter = rateLimit({
//   max: 5,
//   windowMs: 15 * 60 * 1000,
//   message: {
//     status: 'fail',
//     message:
//       'Too many attempts to update sensitive data, for security this is very limited',
//   },
// });

//add the global limit to our entire api route
app.use('/api', globalLimiter);

// middleware
//first we add this so that our controllers can access the body of a request as req.body (as seen in checkBody in the tourControllers file)
app.use(express.json());

app.use(express.static(`${__dirname}/public`));

//just as an example of things we can do...
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);
// now add in our users route
app.use('/api/v1/users', userRouter);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`${req.originalUrl} cannot be found on this server`, 404));
});

app.use(globalErrorHandler);
