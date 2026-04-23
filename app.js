import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tourRouter } from './routes/tourRoutes.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './controllers/errorController.js';
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

app.use(express.static(`${__dirname}/public`));

//just as an example of things we can do...
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`${req.originalUrl} cannot be found on this server`, 404));
});

app.use(globalErrorHandler);
