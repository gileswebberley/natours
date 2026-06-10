import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as viewRouter } from './routes/viewRoutes.js';
import { router as tourRouter } from './routes/tourRoutes.js';
import { router as userRouter } from './routes/userRoutes.js';
import { router as reviewRouter } from './routes/reviewRoutes.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './controllers/errorController.js';
import { globalLimiter } from './utils/rateLimiters.js';
import helmet from 'helmet';
import sanitizer from 'perfect-express-sanitizer';
//replaced by perfect-express-sanitizer
// import ExpressMongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
//remember these are properties of the node.js wrapper function when using commonJS modules (ie require()) so we do not have access to them when we are using ES modules (import/export) so we have to create our own
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//export app for server.js to use
export const app = express();
//start building the front end with PUG just to get a finished project for now (remember npm i pug)
app.set('view engine', 'pug');
//this path.join method saves us from having to worry about how the paths are formed
app.set('views', path.join(__dirname, 'views'));
//I have spent a long time making the security features taught in the course work with Express 5 and we should be good now. REMEMBER to treat the req.query object as immutable in the rest of your controllers though as that is the expected behaviour in Express 5 (see the alias route in the tourControllers file for an example of this)

// for parsing queries with for example duration[gte]=5 we need to set the extended option to true, unlike in the course where it worked out of the box
app.set('query parser', 'extended');

//to make rate limiting function when deployed to a platform like Heroku (which is essentially a proxy) we must set this. Also note that this must come before the helmet middleware
app.set('trust proxy', 1);

//Security HTTP headers supplied by the helmet package. This has changed a lot since the course was developed so it is now neccessary to set the CSP (Content Security Policy) manually
// A common configuration for Natours for use with Leaflet and Google fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Allow connections (fetch, xhr, etc.) to unpkg
        connectSrc: ["'self'", 'https://unpkg.com'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'], //Allow Google fonts
        scriptSrc: ["'self'", 'https://unpkg.com'], // Allow Leaflet scripts
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://fonts.googleapis.com',
        ], // Allow inline styles & external CSS
        workerSrc: ["'self'", 'data:', 'blob:'], // Needed for Leaflet workers
        childSrc: ["'self'", 'blob:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org', // For standard OpenStreetMap
          'https://unpkg.com', // For default Leaflet market icons if used
        ],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

// make axios available at /js/axios
app.use(
  '/js/axios.js',
  express.static(path.join(__dirname, 'node_modules/axios/dist/esm/axios.js')),
);

//now let's set up our rate limiters in a seperate file
//add the global limit to our entire api route
app.use('/api', globalLimiter);

//this is a hack to allow us to carry on using the expressMongoSanitize package as it tries to mutate the req.query object which is now read-only.
app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});

//first we add this body-parser so that our controllers can access the body of a request as req.body (as seen in checkBody in the tourControllers file). We also set a maximum size to avoid Denial of Service attacks like Resource Exhaustion
app.use(express.json({ limit: '10kb' }));

//we also have to add in the body parser when using Express 5 as it is no longer included by default and will stop the app from crashing when we go on to use forms later
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//another change for Express 5 is that a cookie-parser is no longer included and so if you try to access the cookie like in the course with req.cookies.jwt it will throw an error. By adding signed:true to the cookie we could access it via req.signedCookies.jwt but this would require a secret and clash with helmet.
app.use(cookieParser());
//------------------------------------------------------------------------------------
//SO....after all that I've found that both of these can be replaced with the perfect-express-sanitizer package like so!!
app.use(
  sanitizer.clean({
    xss: true, // Removes malicious HTML/Script tags
    noSql: true, // Prevents MongoDB operator injection (like $gt)
    sql: false, // Set to false as you are using MongoDB
    noSqlLevel: 5, // Highest level of protection
    sanitizeKeys: true, // Also cleans the keys in your JSON objects
    // allowedKeys: ['email', 'password'], // Whitelist fields that need special characters - NO! this basically stops the sanitization from working on the very fields we especially need it!!
  }),
);
//now the body has been parsed we need to protect against NoSQL Query Injection (which is mind blowing) - these no longer work as they try to mutate the req.query object which is read-only in Express 5. To fix this we will have to add a hack where we 'unlock the query object'.
// app.use(ExpressMongoSanitize());

//and also protect against XSS (Cross Site Scripting) that might get past our model validation
// app.use(xss());
//------------------------------------------------------------------------------------

//finally protect against parameter pollution (eg sort=price&sort=duration) as the sort method expects a string and these parameters would be returned as an array and cause an error. All of the other params are fine so we add them to a whitelist. Be aware that if this comes across multiple sorts it will only use the last one!
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

app.use(express.static(path.join(__dirname, 'public')));

//just as an example of things we can do...
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//so I can hide buttons when we're on their page, eg /login should not have a login button
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

//get the pug stuff rendering
app.use('/', viewRouter);

// 'mount' our tour router which is now in its own file (in the routes folder) and all of it's handlers (which are known as controllers in the MVC pattern) are in the controllers folder
app.use('/api/v1/tours', tourRouter);
// now add in our users route
app.use('/api/v1/users', userRouter);
// add in our new reviews route
app.use('/api/v1/reviews', reviewRouter);
//wildcard routes in Express 5 can no longer be simply '*' but instead we use this (NOT '/:splat*' btw)...
app.all('/*splat', (req, res, next) => {
  next(new AppError(`${req.originalUrl} cannot be found on this server`, 404));
});

app.use(globalErrorHandler);
