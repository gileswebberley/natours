import Tour from '../models/tourModel.js';
import APIFeatures from '../utils/apiFeatures.js';

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
  try {
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
      message: err.message,
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
      returnDocument: 'after',
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

export const getTourStats = async (req, res) => {
  try {
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

    res.status(200).json({
      status: 'success',
      results: stats.length,
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err,
    });
  }
};

export const getMonthlyPlan = async (req, res) => {
  try {
    // get the year param and convert to a number
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

    res.status(200).json({
      status: 'success',
      results: plan.length,
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err,
    });
  }
};
