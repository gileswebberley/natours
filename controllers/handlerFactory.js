import APIFeatures from '../utils/apiFeatures.js';
import AppError from '../utils/appError.js';
import { rollbackCloudinaryUploads } from '../utils/cloudinaryUtils.js';
//The idea is to create some factory functions to do the basic CRUD operations on any model so that we can stick to the DRY principle (Don't Repeat Yourself). The returned functions have access to the Model argument through the closure property of Javascript functions :)

//Remember that if you have non-generic steps in your controllers you can simply factor those out into a seperate piece of middleware and then pass the relevant route through that first

//No point adding a createOne function as they are quite specific to each model - user creation is with sign-up, review creation requires checks for user/tour id and also casting them to ObjectIds, and so the only plain one is for creating a tour and that's only a couple of lines anyway. Actually we'll add an admin only createUser controller so we'll do the createOne function after all.
export const createOne = (Model) => async (req, res) => {
  try {
    const document = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        document,
      },
    });
  } catch (err) {
    //if creating a Tour fails we may have already uploaded images so we'll check for the rollback array and if it's in the req object we'll use our rollback function from cloudinaryUtils
    if (req.cloudinaryRollbackUrls) {
      rollbackCloudinaryUploads(req.cloudinaryRollbackUrls);
    }
    throw err;
  }
};

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

//we have created a virtual populate on our tour model for the reviews that are associated to a tour so we can simply call populate() with the name of the virtual field if populateOptions has been passed in - this allows us to use the same getOne function for both tours and users (which don't have any virtual populates) and also to populate the reviews for a tour without having to create a seperate getTourById function that has the populate() method on it. I have added guides to the populate options for getTourById as well due to the pre-query hook version of doing it is extremely inefficient
export const getOne = (Model, populateOptions) => async (req, res) => {
  const query = Model.findById(req.params.id);
  if (populateOptions) query.populate(populateOptions);
  const document = await query;
  if (!document) {
    throw new AppError(
      `No ${Model.modelName.toLowerCase()} can be found with id: ${req.params.id}`,
      400,
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      document,
    },
  });
};

//only used for tours at the moment!
export const updateOne = (Model) => async (req, res) => {
  let document;
  try {
    document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (err) {
    if (req.cloudinaryRollbackUrls) {
      rollbackCloudinaryUploads(req.cloudinaryRollbackUrls);
    }
    throw err;
  }

  if (!document) {
    //if updating a Tour fails we may have already uploaded images so we'll check for the rollback array and if it's in the req object we'll use our rollback function from cloudinaryUtils
    if (req.cloudinaryRollbackUrls) {
      rollbackCloudinaryUploads(req.cloudinaryRollbackUrls);
    }
    throw new AppError(
      `Failed to update ${Model.modelName.toLowerCase()} with id ${req.params.id}`,
      400,
    );
  }
  if (req.replacedImagesToDelete && req.replacedImagesToDelete.length > 0) {
    //clear up the old tour images from the cloud
    rollbackCloudinaryUploads(req.replacedImagesToDelete);
  }
  res.status(200).json({
    status: 'success',
    data: {
      document,
    },
  });
};

//careful with this one as it cannot be undone
export const deleteOne = (Model) => async (req, res) => {
  //let's now just check if the document exists once rather than having so many 'trips to the database'
  const doc = await Model.findById(req.params.id);
  if (!doc)
    throw new AppError(
      `No ${Model.modelName.toLowerCase()} found to be deleted with id: ${req.params.id}`,
      404,
    );
  //now we've got images on cloudinary we'll ahve to clear them up as well as simply delete the user or tour - notice these functions have access to the req object as it forms a Closure given it's scope
  const clearUserImage = () => {
    if (doc.photo && doc.photo.startsWith('http')) {
      rollbackCloudinaryUploads([doc.photo]);
    }
  };

  const clearTourImages = () => {
    const URLsToClear = [];
    if (doc.imageCover && doc.imageCover.startsWith('http'))
      URLsToClear.push(doc.imageCover);
    if (doc.images && doc.images.length > 0) {
      doc.images.forEach((img) => {
        if (img.startsWith('http')) URLsToClear.push(img);
      });
    }
    // Sends all tour image assets to the cloud destruction bucket at once
    rollbackCloudinaryUploads(URLsToClear);
  };

  switch (Model.modelName.toLowerCase()) {
    case 'tour':
      clearTourImages();
      break;

    case 'user':
      clearUserImage();
      break;

    default:
      break;
  }
  await doc.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null,
  });
};
