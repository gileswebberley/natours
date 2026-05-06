import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tourRouter } from './routes/tourRoutes.js';
import { router as userRouter } from './routes/userRoutes.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './controllers/errorController.js';
import { globalLimiter } from './utils/rateLimiters.js';
import helmet from 'helmet';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
// import rateLimit from 'express-rate-limit';
//remember these are properties of the node.js wrapper function when using commonJS modules (ie require()) so we do not have access to them when we are using ES modules (import/export) so we have to create our own
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//export app for server.js to use
export const app = express();

// for parsing queries with for example duration[gte]=5 we need to set the extended option to true, unlike in the course where it worked out of the box
app.set('query parser', 'extended');

//to make rate limiting function when deployed to a platform like Heroku (which is essentially a proxy) we must set this. Also note that this must come before the helmet middleware
app.set('trust proxy', 1);

//Security HTTP headers supplied by the helmet package. This has changed a lot since the course was developed so it is now neccessary to set the CSP (Content Security Policy) manually
// A common configuration for Natours with Mapbox/external fonts from Gemini
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        scriptSrc: ["'self'", 'https://*.mapbox.com'], // Allow Mapbox scripts
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"], // Allow inline styles & external CSS
        workerSrc: ["'self'", 'data:', 'blob:'], // Needed for Mapbox workers
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

//now let's set up our rate limiters in a seperate file
//add the global limit to our entire api route
app.use('/api', globalLimiter);

// middleware
//first we add this body-parser so that our controllers can access the body of a request as req.body (as seen in checkBody in the tourControllers file). We also set a maximum size to avoid Denial of Service attacks like Resource Exhaustion
app.use(express.json({ limit: '10kb' }));

//now the body has been parsed we need to protect against NoSQL Query Injection (which is mind blowing)
app.use(ExpressMongoSanitize());

//and also protect against XSS (Cross Site Scripting) that might get past our model validation
app.use(xss());

app.use(express.static(`${__dirname}/public`));

//just as an example of things we can do...
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);
// now add in our users route
app.use('/api/v1/users', userRouter);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`${req.originalUrl} cannot be found on this server`, 404));
});

app.use(globalErrorHandler);
