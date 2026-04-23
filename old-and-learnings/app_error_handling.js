import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tourRouter } from '../routes/tourRoutes.js';
import AppError from '../utils/appError.js';
import globalErrorHandler from '../controllers/errorController.js';
//remember these are properties of the node.js wrapper function when using commonJS modules (ie require()) so we do not have access to them when we are using ES modules (import/export) so we have to create our own
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//export app for server.js to use
export const app = express();

// for parsing queries with for example duration[gte]=5 we need to set the extended option to true, unlike in the course where it worked out of the box
app.set('query parser', 'extended');

// middleware
//first we add this so that our controllers can access the body of a request as req.body (as seen in checkBody in the tourControllers file)
app.use(express.json());

// we do not use this at this point but to serve static files (eg html, css, images, etc) we can use this built in middleware and specify the folder where our stic files will be served from, in this case the public folder
app.use(express.static(`${__dirname}/public`));

//just as an example of things we can do...
app.use((req, res, next) => {
  //we can even add properties to the request obj in here and they will be available in all the other middlewares and route handlers that come after this one in the 'pipeline'
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);

//to handle routes that are not part of our api we add one final middleware stage. The request has got through all of the other middleware including our routes that are defined above and so it has clearly not matched them, THIS MUST COME AFTER ALL OTHER ROUTES. Essentially we capture all of the verbs (get, post, patch, delete) for all routes (the * wildcard - NOT IN EXPRESS 5+ because it now uses path-to-regexp and so means something different, the new alternative is '/{*any}') that have not been redirected and return a JSON response in the JSend format rather than the default HTML response. Or we could simply do this as an app.use() because it's the last one. Now that we're adding a central error middleware stage we do now use next() to pass that error on.
app.all('/{*any}', (req, res, next) => {
  //we'll probably create our own error class to deal with this
  // const err = new Error(`${req.originalUrl} cannot be found on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  //by putting error in as an argument to next() the req will pass any other stages and go straight to the middleware with err as it's first parameter
  // next(err);
  //we have now created our AppError subclass and so we will simply pass an instance of that to next()
  next(new AppError(`${req.originalUrl} cannot be found on this server`, 404));
});

//By specifying four params Express knows it's an error handling middleware
app.use(globalErrorHandler);
