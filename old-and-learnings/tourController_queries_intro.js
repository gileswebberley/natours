//Now that we are developing Models with Mongoose we will import our first one here
import Tour from '../models/tourModel.js';

//to add queries to the find functionality you can either simply use the mongo way of adding a query object to the find method, eg Tour.find({difficulty: 'easy'}), or we can use the more powerful query string that mongoose provides which allows us to use greater than, less than, etc. For example if we wanted to find all tours that were more expensive than 500 we could do Tour.find({price: {$gt: 500}}) where $gt stands for greater than. To add these to the url query string you can write - instead of ?price=500 we could write ?price[$gt]=500, however this is mongoose specific so it would probably be best to keep it standard (without the $ at the beginning so in the tour controller proper we'll use a simple regEx and prepend the strings sent through in the query string so ?price[gte]=500 will become the query object price: {$gte: 500}). We can also chain these together so if we wanted to find all tours that were more expensive than 500 and had a difficulty of easy we could do Tour.find({price: {$gt: 500}, difficulty: 'easy'}). We could also use the mongoose query methods so the previous would be written as Tour.find().where('price').gt(500).where('difficulty').equals('easy').
// We can also use the query string to specify which fields we want to be returned in the response, for example if we only wanted the name and price of the tours we could do Tour.find().select('name price'). We can also use the query string to sort the results, for example if we wanted to sort by price in ascending order we could do Tour.find().sort('price') or if we wanted to sort by price in descending order we could do Tour.find().sort('-price'). We can also use the query string to limit the number of results returned, for example if we only wanted the first 5 results we could do Tour.find().limit(5). We can also use the query string to skip a certain number of results, for example if we wanted to skip the first 5 results and return the next 5 results we could do Tour.find().skip(5). This is useful for pagination. We can also use the query string to count the number of results that match a certain query, for example if we wanted to count the number of tours that were more expensive than 500 we could do Tour.find({price: {$gt: 500}}).countDocuments().
export const getAllTours = async (req, res) => {
  try {
    //because there may be some queries that we want to ignore, for example if we get to the point of paginating results we will not want to search our documents for a pageNumber as that is not part of the tour schema. To get around this for now we will make a copy of the req.query object (remember that if we simply did queryCopy = req.query then queryCopy would be a reference rather than a copy in JS!) so instead we'll use the spread operator to produce a shallow copy from which we can remove the unwanted parameters
    const filteredQuery = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    //forEach does not return a new array but instead just executes the provided function on each element of the array, in this case we are using it to delete the unwanted parameters from our queryCopy object
    excludedFields.forEach((el) => delete filteredQuery[el]);
    // Tour.find() actually returns a query object which as it stands is executed and returns a promise because we use await, however if we want to chain some of the available query methods to it (such as where(), gt(), etc) then we would want to save the query and then execute it seperately
    // const tours = await Tour.find(filteredQuery);
    let query = Tour.find(filteredQuery);
    //then execute it with await
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
