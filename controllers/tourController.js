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
    // results: tours.length,
    // data: {
    //   tours,
    // },
  });
};

export const createTour = (req, res) => {
  res.status(201).json({
    status: 'success',
    // data: {
    //   tour: newTour,
    // },
  });
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
