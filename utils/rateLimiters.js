import rateLimit from 'express-rate-limit';

// const createLimitMessage = (msg) => ({
//   status: 'fail',
//   message: msg,
// });

//general suggested 100 per 15 minutes
export const globalLimiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  statusCode: 429,
  message: {
    status: 'fail',
    message: 'Too many requests, please try again later',
  },
});
//sensitive route limit 5 per 30 minutes - as this is a piece of middleware we can simply add it to our sensitive routes just like the protect() that we built earlier
export const authLimiter = rateLimit({
  max: 5,
  windowMs: 30 * 60 * 1000,
  statusCode: 429,
  message: {
    status: 'fail',
    message:
      'Too many attempts to update sensitive data, for security this is very limited',
  },
});
//to stop bots from mass-registration make the signup very limited 3 per hour (at 10 for testing)
export const signupLimiter = rateLimit({
  max: 10,
  windowMs: 60 * 60 * 1000,
  statusCode: 429,
  message: {
    status: 'fail',
    message:
      'You are trying to signup far too many times, for security this is very limited',
  },
});
//just in case people make a typo or something whilst trying to login give them a bit more
export const loginLimiter = rateLimit({
  max: 10,
  windowMs: 30 * 60 * 1000,
  statusCode: 429,
  message: {
    status: 'fail',
    message:
      'Too many attempts to update sensitive data, for security this is very limited',
  },
});
