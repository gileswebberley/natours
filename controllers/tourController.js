import Tour from '../models/tourModel.js';
import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import {
  createOne,
  deleteOne,
  getAll,
  getOne,
  updateOne,
} from './handlerFactory.js';

//middleware for our first alias route (see tourRoutes as well) - use nullish coalescing operator to avoid trying to spread undefined.
export const aliasTopTours = (req, res, next) => {
  req.aliasQuery = {
    ...(req.query ?? {}),
    ...(req.aliasQuery ?? {}),
    limit: '5',
    sort: '-ratingsAverage,price',
    fields: 'name,price,ratingsAverage,summary,difficulty',
  };
  next();
};

//Implementing factory handler functions - this one is particularly handy because it allows all getAll controllers to use the APIFeatures for sorting, filtering, etc without having to implement all of that logic in each model's controller.
export const getAllTours = getAll(Tour);
export const updateTour = updateOne(Tour);
export const deleteTour = deleteOne(Tour);
//because of the virtual populate for reviews on the tour model we simply pass in the name of the virtual field as the second optional argument. As I am removing the population of guides from the pre-query hook in the tour model for performance reasons we can pass an array of populate options
export const getTourById = getOne(Tour, [
  { path: 'guides', select: '-__v -passwordChangedAt' },
  { path: 'reviews' },
]);

export const createTour = createOne(Tour);

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
};

export const getMonthlyPlan = async (req, res) => {
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
};

//get tours within a distance from a point
export const getToursWithin = async (req, res) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  //for the radius it requires a specific measurment in radians
  const radians = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    throw new AppError(
      'Please provide latlng in the correct format: lat,lng',
      400,
    );
  }

  const toursWithin = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radians] },
    },
  });

  // console.log(`distance: ${distance}, latlng: ${lat},${lng}, unit: ${unit}`);
  res.status(200).json({
    status: 'success',
    results: toursWithin.length,
    data: toursWithin,
  });
};

//get the distance away from a point for all tours
export const getDistances = async (req, res) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    throw new AppError(
      'Please provide latlng in the correct format: lat,lng',
      400,
    );
  }
  //$geoNear must always be the first stage in a geospatial aggregation pipeline
  //because we have 2 '2dSphere' indexes we have to set the 'key' to which one, in this case startLocation
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [+lng, +lat] },
        distanceField: 'distance',
        //now you can convert the meters that are returned as distance
        distanceMultiplier: unit === 'km' ? 0.001 : 0.000621371,
        key: 'startLocation',
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: distances,
  });
};
