import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
//The idea is to create some factory functions to do the basic CRUD operations on any model so that we can stick to the DRY principle (Don't Repeat Yourself). The returned functions have access to the Model argument through the closure property of Javascript functions :)

//Remember that if you have non-generic steps in your controllers you can simply factor those out into a seperate piece of middleware and then pass the relevant route through that first

//Works for tours, users, and reviews as it stands
export const getAll = (Model) => async (req, res) => {
  //check if we have been through an alias route and change all references to req.query to this variable instead
  const queryParams = req.aliasQuery || req.query;
  //We are creating a search filter for the possibilty of this being a nested route (eg for reviews that come through the tour route) and adding it to the req object
  const filter = req.getAllFilter || {};
  //use our new features class - simply pass in the initial query object and the query string
  const features = new APIFeatures(Model.find(filter), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // now we can finally execute our query
  const document = await features.query;
  //Not really an error so just return no results
  // if (document.length === 0) {
  //   return next(new AppError('No document found', 404));
  // }
  res.status(200).json({
    status: 'success',
    results: document.length,
    data: {
      document,
    },
  });
};

export const updateOne = (Model) => async (req, res) => {
  const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!document)
    throw new AppError(
      `Failed to update ${Model.modelName.toLowerCase()} with id ${req.params.id}`,
      400,
    );
  res.status(200).json({
    status: 'success',
    data: {
      document,
    },
  });
};

//careful with this one as it cannot be undone
export const deleteOne = (Model) => async (req, res) => {
  const document = await Model.findByIdAndDelete(req.params.id);

  if (!document)
    throw new AppError(
      `No ${Model.modelName.toLowerCase()} found to be deleted with id: ${req.params.id}`,
      404,
    );

  res.status(204).send();
};
