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

export const getTourById = async (req, res) => {
  try {
    const thisTour = await Tour.findById(req.params.id);
    //another way to do this would be to use the findOne() method and pass it a filter object to compare the auto produced _id field with the params id like so Tour.findOne({_id: req.params.id})
    res.status(200).json({
      status: 'success',
      data: {
        tour: thisTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

export const updateTour = async (req, res) => {
  try {
    // notice the options object which in this case means that the updated tour is returned by the promise, and also that it runs all the schema validations on the updating data (which is strangely not the default behaviour)
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

// Notice how throughout all these controllers we prefer an early return to an else statement
export const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    // will return null if the document is not found rather than throw an error so check that here
    if (!tour) {
      return res.status(404).json({
        staus: 'fail',
        message: `No tour found to be deleted with id: ${req.params.id}`,
      });
    }
    // 204 denotes a 'no content' response which is standard for deletion and so does not send any data back in the response body
    res.status(204).send();
  } catch (err) {
    // here we'll check the type of error thrown as if it's a Cast error then we know that the id provided was not of the correct ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid id format: ${req.params.id}`,
      });
    }
    //otherwise it's just some generic failure with the server or db (500 - internal server error)
    res.status(500).json({
      status: 'fail',
      message: err,
    });
  }
};
