import Tour from '../models/tourModel.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';

//middleware for our first alias route (see tourRoutes as well)
export const aliasTopTours = (req, res, next) => {
  req.aliasQuery = {
    ...req.query,
    ...req.aliasQuery,
    limit: '5',
    sort: '-ratingsAverage,price',
    fields: 'name,price,ratingsAverage,summary,difficulty',
  };
  next();
};

export const getAllTours = async (req, res) => {
  //check if we have been through an alias route and change all references to req.query to this variable instead
  const queryParams = req.aliasQuery || req.query;

  //use our new features class - simply pass in the initial query object and the query string
  const features = new APIFeatures(Tour.find(), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // now we can finally execute our query
  const tours = await features.query;
  //Not really an error so just return no results
  // if (tours.length === 0) {
  //   return next(new AppError('No tours found', 404));
  // }
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

export const createTour = async (req, res) => {
  const newTour = await Tour.create(req.body);
  //as an example of not returning next(err) but throwing the error instead - both work, just don't add the next argument otherwise it expects you to use it manually
  if (!newTour) throw new AppError('Failed to create new tour', 400);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
};

export const getTourById = async (req, res, next) => {
  //now we have implemented the global error handler in app.js apparently Express 5 will automatically throw rejected promises to that - let's see....yup it works but the statusCode is not set so it defaults to 500
  const thisTour = await Tour.findById(req.params.id);
  //to get around the status code being 500 we can do this - just call next with an instance of our new AppError class
  //This doesn't however deal with the castError that is thrown by the findById(), for this we'll go back to our global error handler function and deal with these cases...
  if (!thisTour) {
    return next(
      new AppError(`No tour can be found with id: ${req.params.id}`, 400),
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour: thisTour,
    },
  });
};

export const updateTour = async (req, res) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!tour)
    throw new AppError(`Failed to update tour with id ${req.params.id}`, 400);
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

export const deleteTour = async (req, res) => {
  // try {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour)
    throw new AppError(
      `No tour found to be deleted with id: ${req.params.id}`,
      404,
    );

  res.status(204).send();
  // } catch (err) {
  //   if (err.name === 'CastError') {
  //     return res.status(400).json({
  //       status: 'fail',
  //       message: `Invalid id format: ${req.params.id}`,
  //     });
  //   }
  //   res.status(500).json({
  //     status: 'fail',
  //     message: err,
  //   });
  // }
};

export const getTourStats = async (req, res) => {
  // try {
  //here we grab all the tours with a ratingsAverage of over 4.5 and then group them by difficulty
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.5 } } },
    {
      $group: {
        //set which field the grouping is based on, set to null if you simply want all of the matched records
        _id: { $toUpper: '$difficulty' },
        // for each record add 1 to the number of tours in the group
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    //now we'll sort the data based on one of the fields we just created in the group stage, the avgPrice, and we'll make it ascending by putting 1 (-1 for descending)
    { $sort: { avgPrice: 1 } },
    //then just as an example we'll do another match to use $ne (not-equal) and notice that we have set _id to difficulty so that is what we are matching to. Also note that we made the difficulty field upper case so we would need to put that in here
    // { $match: { _id: { $ne: 'EASY' } } },
  ]);

  if (!stats || stats?.length === 0)
    throw new AppError('Could not produce tour stats', 500);

  res.status(200).json({
    status: 'success',
    results: stats.length,
    data: {
      stats,
    },
  });
  // } catch (err) {
  //   res.status(500).json({
  //     status: 'fail',
  //     message: err,
  //   });
  // }
};

export const getMonthlyPlan = async (req, res) => {
  // try {
  // get the year param and convert to a number
  if (!req.params?.year) {
    throw new AppError(
      'A year parameter must be passed to getMonthlyPlan',
      400,
    );
  }
  const year = req.params.year * 1;
  //each tour has an array of start dates and we want to essentially create one tour per array element, this is called 'unwinding'. Notice in our match we are comparing dates, in mongoDB this is not the usual nightmare you face in JavaScript. Let's make it gte to the start of the year passed in, and less than the start of year + 1 (format yyyy-mm-dd)
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
      },
    },
    //now we're going to group the results by the month that their start dates lie in. For dealing with dates there are a load of aggregation operators, like $month, and then we create an array of the names by using the $push operator
    {
      $group: {
        _id: { $month: '$startDates' },
        toursStarting: { $sum: 1 },
        tourNames: { $push: '$name' },
      },
    },
    //next we'll add a field to replace the _id in the results (which we'll remove with the $project stage, as projection is what we call field limiting). There is also a way to make the month be the name rather than simply a month number
    {
      $addFields: {
        month: {
          $arrayElemAt: [
            [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ],
            { $add: ['$_id', -1] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { toursStarting: -1 },
    },
  ]);

  if (!plan || plan?.length === 0)
    throw new AppError('Could not produce monthly plan', 500);

  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan,
    },
  });
  // } catch (err) {
  //   res.status(500).json({
  //     status: 'fail',
  //     message: err,
  //   });
  // }
};
