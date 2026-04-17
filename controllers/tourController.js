//Now that we are developing Models with Mongoose we will import our first one here
import Tour from '../models/tourModel.js';

export const getAllTours = async (req, res) => {
  try {
    const tours = await Tour.find();
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

export const createTour = async (req, res) => {
  //rather than create an instance of the Tour model and then execute it's save method we can just use what can be thought of as a static method on the Tour model itself which is called create(). This too returns a promise so we'll make these controller functions async
  try {
    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
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
