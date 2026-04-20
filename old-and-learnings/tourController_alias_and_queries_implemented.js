import Tour from '../models/tourModel.js';

//middleware for our first alias route
export const aliasTopTours = (req, res, next) => {
  // This is actually outdated :(
  // req.query.limit = '5'; //keep it as a string cos that's what getAllTours expects
  // req.query.sort = '-ratingsAverage,-price';
  // //set it to limit the fields it returns
  // req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  // as the query object is now immutable we have to create a new one and then check in getAllTours whether it has been through an alias route
  req.aliasQuery = {
    ...req.query,
    limit: '5',
    sort: '-ratingsAverage,price',
    fields: 'name,price,ratingsAverage,summary,difficulty',
  };
  next();
};

export const getAllTours = async (req, res) => {
  try {
    //check if we have been through an alias route and change all references to req.query to this variable instead
    const queryParams = req.aliasQuery || req.query;
    console.log(JSON.stringify(queryParams));
    // we want to filter out the non filtering query parameters so we make a copy and delete the unwanted
    let filteredQuery = { ...queryParams };
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

    //Sorting is the first non-filtering query we'll check for, we can then chain it onto our mongoose query object before we execute it with the await command. The query string for this is?sort=price for example, but we can also sort by multiple fields by separating them with a comma like this?sort=price,-ratingsAverage (in case the price is the same the higher rated one will come first). In the code we have to replace the comma with a space because that is how mongoose wants it. To make it descending rather than ascending simply add a minus sign to the front of the sort-by field name, eg ?sort=-price
    if (queryParams.sort) {
      const sortBy = queryParams.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      //set a default sort method - newest first
      query = query.sort('-createdAt');
    }

    // Field limiting - if we just want a couple of bits returned from the db (called Projecting) then use the 'field' query string with a comma seperated list eg ?fields=name,description which we will convert to spaces just like in the sort functionality and pass it to the select method
    if (queryParams.fields) {
      const projectBy = queryParams.fields.split(',').join(' ');
      query = query.select(projectBy);
    } else {
      // as default we will remove the __v field, we can also exclude fields in the schema
      query = query.select('-__v');
    }

    // Pagination - we use the page and the limit combination of queries eg ?page=2&limit=5 will give the 6th to 10th results. we will use the skip() and limit() methods to make this work. We'll set up a default limit in case the number of documents in the collection is huge
    const page = +queryParams.page || 1; //if no page is set in the query we'll default to 1
    const limit = +queryParams.limit || 100; //if no limit is set in the query we'll default to 100
    const pageSkipper = (page - 1) * limit; //ie limit = 10 so page 1 = results 0-10, page 2 = 11-20 etc
    //Now if the page is set in the query string but it asks for 'out-of-bounds' results we'll throw an error
    if (queryParams.page) {
      //use the handy mongoose function to discover how many are in the collection
      const numTours = await Tour.countDocuments();
      if (pageSkipper >= numTours)
        throw new Error(`Page ${queryParams.page} does not exist`);
    }
    // if we're all good we'll add the functionality to the query object
    query = query.skip(pageSkipper).limit(limit);

    // now we can finally execute our query
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
