import AppError from '../utils/appError.js';

export default (err, req, res, next) => {
  //By specifying four params Express knows it's an error handling middleware
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    //check for some of the mongoose errors so we can send simple error messages to the user in production
    //first grab a copy of our err object incase we want to convert it into an AppError
    /*In JavaScript, the spread operator ({...err}) only copies enumerable own properties.
Mongoose (and standard JavaScript Error objects) typically define properties like name, message, and stack as non-enumerable. When you try to destructure or spread them, those properties are ignored, leaving you with an empty or incomplete object.*/
    let error = Object.create(
      Object.getPrototypeOf(err),
      Object.getOwnPropertyDescriptors(err),
    ); //{ ...err }; this does not include name!!
    //check if, for example, the id has been entered in an incompatible format
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // for the underlying Mongo error thrown for duplicate fields it does not have a name so we check against the code property
    if (error.code === 11000) error = handleDuplicateErrorDB(error);

    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    sendErrorProd(error, res);
  }
};

//we get an object with each validation error as a property of errors
function handleValidationErrorDB(err) {
  const errors = Object.values(err.errors).map((e) => e.message);
  const message = `Invalid input data: ${errors.join(' and ')}`;
  return new AppError(message, 400);
}

//convert CastError from mongoose into an AppError that isOperational
function handleCastErrorDB(err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
}

// the format of the error object for duplicate field errors has changed since the course and now has a property called keyValue and an index property that seems to relate to the position of this error within that keyValue object
function handleDuplicateErrorDB(err) {
  const keyVal = err['keyValue'];
  const keyValName = Object.keys(keyVal)[err.index];
  const keyValValue = Object.values(keyVal)[err.index];
  const message = `There is already a unique ${keyValName} with the value of ${keyValValue}, please use a different ${keyValName}`;
  //409 is the correct status code for duplicate resource or resource already exists
  return new AppError(message, 409);
}

//remember that function declarations are hoisted with the declaration body, unlike function expressions and arrow functions
function sendErrorDev(err, res) {
  //in dev so give all of the details for tracing the errors
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
}

//In our AppError class we add an isOperational property so we can check if it's one of 'our' errors, otherwise it is an unknown or programming error which we don't want to share with a production user
function sendErrorProd(err, res) {
  //in production just send a friendlier message
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('NON OPERATIONAL ERROR: ', err);
    res.status(500).json({
      status: 'fail',
      message: 'Unknown error occurred',
    });
  }
}
