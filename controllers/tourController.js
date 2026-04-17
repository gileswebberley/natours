import Tour from '../models/tourModel.js';

export const getAllTours = async (req, res) => {
  try {
    let filteredQuery = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete filteredQuery[el]);
    //Advanced filtering (gt, gte, lt, lte)
    // we use a regEx to find these operators and replace them with the mongoose version (ie with a $ at the beginning)
    let queryStr = JSON.stringify(filteredQuery);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // the \b denotes an exact match and the /g at the end denotes that we want to replace all instances rather than just the first which it would do without it
    filteredQuery = JSON.parse(queryStr);
    console.log(filteredQuery);

    let query = Tour.find(filteredQuery);
    const tours = await query;
    if (tours.length === 0) {
      throw new Error('No tours found');
    }
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
      message: err.message,
    });
  }
};

export const createTour = async (req, res) => {
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

export const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) {
      return res.status(404).json({
        staus: 'fail',
        message: `No tour found to be deleted with id: ${req.params.id}`,
      });
    }
    res.status(204).send();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid id format: ${req.params.id}`,
      });
    }
    res.status(500).json({
      status: 'fail',
      message: err,
    });
  }
};
