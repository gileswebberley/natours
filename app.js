import express from 'express';
import { router as tourRouter } from './routes/tourRoutes.js';
//export app for server.js to use
export const app = express();

// set up middleware
app.use(express.json());
//just as an example of things we can do...
app.use((req, res, next) => {
  //   console.log('Hello from our first middleware');
  //we can even add properties to the request obj in here and they will be available in all the other middlewares and route handlers that come after this one in the 'pipeline'
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);
