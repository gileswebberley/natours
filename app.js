import express from 'express';
import fs from 'fs';
//because I am using modules for a course based on commonjs I have to add this snippet to allow use of __dirname
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`),
);
// access express through our app variable which is standard starting point
const app = express();

// Express needs some middleware to be able to read the body of a request and parse it if it is of the Content-Type application/json. For this we USE the express.json() which is based on the 'body-parser' package. See the notes section called Request - Response Cycle for a bit of explaination, but here we are building our 'middleware stack' and it is worth noting that the order of these definitions is very important. If we had defined our routes before this middleware, then the body of the request would not be parsed and we would not be able to access it in our route handlers. We have an extra function on top of the req and res objects when we are defining middleware and that is the next() function (which is the 3rd function). This is a function that we call when we are done with our middleware and want to pass control to the next middleware in the stack. If we do not call next() then the request will be stuck in this middleware and will never reach the route handlers.
app.use(express.json());
//here's our first middleware function
app.use((req, res, next) => {
  console.log('Hello from our first middleware');
  next();
});
// next create our port number as a varaible so we can find and change it later
const port = 3000;
// now we can start our server listening to the port we defined above. The callback function will execute when the server starts
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//We can refactor these routes and seperate out the handler functions (which are also known as 'controllers'), I'm sure we'll put them in their own module later but this is essentially the refactored version of what you will find (with lots of commenting) in the old-and-learning folder version.

const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

const createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body);
  tours.push(newTour);
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      if (err) {
        res.status(500).json({
          status: 'error',
          message: 'Could not save the new tour',
        });
      }
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    },
  );
};

const getTourById = (req, res) => {
  const thisTour = tours.find((el) => el.id === +req.params.id);
  if (!thisTour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour id invalid',
    });
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour: thisTour,
    },
  });
};

//then create the routes so we only have to change them in one place if they change
//this is fine until we have more than a few routes and the solution is to use Express Routers (which can be thought of as sub-apps). We create a router and then rather than using app.route() we use the router.route() by treating it as middleware, which it is. Notice that when we define the roots that we are simply navigating from the route defined in the router object. This means that our routes can be thought of as relative paths to the router path. Here's the original commented out with the new solution after it.
// app.route('/api/v1/tours').get(getAllTours).post(createTour);
// app.route('/api/v1/tours/:id').get(getTourById);

// first create the router object and then mount it on the app object. This is a bit more work but it is much more scalable and maintainable as we can have multiple routers for different parts of our API and we can also put them in separate files if we want to. We can also use middleware on the router level which will only apply to the routes defined in that router. This is a great way to keep our code organized and modular.
const tourRouter = express.Router();
//now we can put the path in as the first argument of the use() method, which is known as 'mounting the router'...
app.use('/api/v1/tours', tourRouter);
//...and then we do what we did originally but with those relative paths
tourRouter.route('/').get(getAllTours).post(createTour);
tourRouter.route('/:id').get(getTourById);
