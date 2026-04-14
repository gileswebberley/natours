import fs from 'fs'; //this needs to be the first line for eslint airbnb plugin
import { __dirname, __filename } from '../utils/pathHackForModules.js'; //remember these are properties of the node.js wrapper function when using commonJS modules (ie require()) so we do not have access to them when we are using ES modules (import/export) so we have to create our own (see the utils file for how we do this)

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
);

export const checkID = (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);
  //I think this is better than just checking the length of the array and I also couldn't understand why we were still using req.params.id instead of val in the course video, I might discover the reason later or when I test it. As it stands this now blocks invalid id requests and if the id is valid it attaches it to the req object as req.thisTour.
  const thisTour = tours.find((el) => el.id === +val);
  if (!thisTour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour id invalid',
    });
  } else {
    //I don't need else but I think it makes it more readable
    req.thisTour = thisTour;
    next();
  }
};

//our validation middleware for post requests (see the post route for usage)
export const checkBody = (req, res, next) => {
  //remember that this only works because we are using use(express.json()) in our app.js file to parse the body of the request and make it available as req.body
  if (!req.body.price || !req.body.name) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  console.log('body of POST request checked and has price and name');
  next();
};

export const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

export const createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body);
  tours.push(newTour);
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    'utf-8',
    (err) => {
      //I'm not sure why but this throws an error every time even though the new tour is created
      //   if (err) {
      //     res.status(500).json({
      //       status: 'error',
      //       message: 'Could not save the new tour',
      //     });
      //   }
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    },
  );
};

export const getTourById = (req, res) => {
  //because it is now going through the checkID param middleware it will only get here if the id is valid and will have been added to the request object as req.tour
  res.status(200).json({
    status: 'success',
    data: {
      tour: req.thisTour,
    },
  });
};

export const updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};

export const deleteTour = (req, res) => {
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
