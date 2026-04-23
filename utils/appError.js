class AppError extends Error {
  constructor(message, statusCode) {
    //pass the message into the Error that we are inheriting from
    super(message);
    this.statusCode = statusCode;
    //as the status code will be in the 400s we can gather the status from that
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    //this will be checked against later when we are using this error class
    this.isOperational = true;

    //An error object also has a stack property which is the stack trace you generally see in the console. We do not want the call to this in there though cos this is not where the error occurred and so that is done with this
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
