import express from 'express';
import { router as tourRouter } from './routes/tourRoutes.js';
import { __dirname, __filename } from './utils/pathHackForModules.js';

//export app for server.js to use
export const app = express();

// middleware
//first we add this so that our controllers can access the body of a request as req.body (as seen in checkBody in the tourControllers file)
app.use(express.json());

// we do not use this at this point but to serve static files (eg html, css, images, etc) we can use this built in middleware and specify the folder where our stic files will be served from, in this case the public folder
app.use(express.static(`${__dirname}/public`));

//just as an example of things we can do...
app.use((req, res, next) => {
  //   console.log('Hello from our first middleware');
  //we can even add properties to the request obj in here and they will be available in all the other middlewares and route handlers that come after this one in the 'pipeline'
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);
