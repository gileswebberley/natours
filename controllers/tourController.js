import Tour from '../models/tourModel.js';

export const getAllTours = async (req, res) => {
  try {
    // we want to filter out the non filtering query parameters so we make a copy and delete the unwanted
    let filteredQuery = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete filteredQuery[el]);
    //Advanced filtering (gt, gte, lt, lte)
    // we use a regEx to find these operators and replace them with the mongoose version (ie with a $ at the beginning)
    let queryStr = JSON.stringify(filteredQuery);
    // the \b denotes an exact match and the /g at the end denotes that we want to replace all instances rather than just the first which it would do without it
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    //then pop it back as json into the filtered query object
    filteredQuery = JSON.parse(queryStr);
    // console.log(filteredQuery);

    let query = Tour.find(filteredQuery);

    //Sorting is the first non-filtering query we'll check for, we can then chain it onto our mongoose query object before we execute it with the await command. The query string for this is?sort=price for example, but we can also sort by multiple fields by separating them with a comma like this?sort=price,ratingsAverage. In the code we have to replace the comma with a space because that is how mongoose wants it. To make it descending rather than ascending simply add a minus sign to the front of the sort-by field name, eg ?sort=-price
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    }

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
