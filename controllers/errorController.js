export default (err, req, res, next) => {
  //By specifying four params Express knows it's an error handling middleware
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  //remember that message is whatever you pass as an argument to the Error constructor
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
