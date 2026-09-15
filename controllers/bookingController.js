import Booking from '../models/bookingModel.js';
import Tour from '../models/tourModel.js';
import AppError from '../utils/appError.js';
// this is how we can import Stripe using ES Modules rather than the commonJS require() method that is used in the documentation
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const getCheckoutSession = async (req, res) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    throw new AppError('No tour found with that ID', 404);
  }
  // 2) Create checkout session
  // for testing we need to use live images for the products which we'll grab from Jonas' live demo site, however when we deploy we can swap to the ones in the public folder of our own site. To make this simple let's define the two paths here and then we can swap them out when we deploy
  const productionImagePath = `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`;
  const devImagePath = `https://www.natours.dev/img/tours/${tour.imageCover}`;

  //let's add in the all important date of the tour that's being booked as it's not included in the course and is a very important piece of information for the user to see in their Stripe checkout. We'll add it to the product description field as this is displayed in the checkout and is a good place for it. We'll also add the tour date to the product name, and to the booking model, so that it's clear which date they are booking. We'll just have it be the next available date or the first date in the startDates array for now.
  const today = new Date();
  const nextTourDate =
    tour.startDates.find((date) => new Date(date) > today) ||
    tour.startDates[0]; //if there are no future dates then just use the first date in the array
  const nextTourDateString = nextTourDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const nextTourDateISO = nextTourDate.toISOString(); //so we can keep it standardised when passing it through the meatdata field to the webhook and then into the booking model

  const session = await stripe.checkout.sessions.create({
    // before you would define payment_method_types as an array of strings, such as ['card'], but now it is recommended to leave this out and let stripe handle it with their 'dynamic payment methods' feature. This automatically offers the best payment methods based on customer location and so on whilst also allowing googlePay etc to be used if set up on their device. This is a new feature that was not possible when the ancient course was made in 2019.
    mode: 'payment',
    //in the course they added the tour and user ids as url params but instead we can use the metadata field and pass the session id instead which we can then retrieve and use to create the booking.
    success_url: `${req.protocol}://${req.get('host')}/?session_id={CHECKOUT_SESSION_ID}`, //homepage for now
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`, //back to the tour they were about to book
    customer_email: req.user.email, //this simply fills the email field in the Stripe checkout
    // client_reference_id: req.params.tourId, //OUTDATED - this is a custom field that we can use to store the tour ID for later use however it is not secure and is used in the course as a bit of a hack. There is now a metadata field that can be used for this purpose instead as it is returned in the webhook checkout.session.completed event and is more secure.
    metadata: {
      tour: tour.id,
      price: tour.price,
      tourStartDate: nextTourDateISO,
      user: req.user.id,
    },

    line_items: [
      {
        //unlike in the course you no longer put product name and price etc directly into the line_item but instead use the price_data object and include the product_data object within that
        price_data: {
          currency: 'gbp',
          unit_amount: tour.price * 100, //remember that Stripe uses the smallest currency amount (eg pence in pounds)
          product_data: {
            name: `${tour.name} Tour`,
            description: `${tour.summary} - Starting: ${nextTourDateString}`,
            images: [devImagePath],
          },
        },
        quantity: 1,
      },
    ],
  });
  // 3) Return the session url to be handled in stripe.js on the front end. Another option with the modern stripe integration is to use res.redirect(303, session.url) to directly go to the stripe checkout page however this does not allow for catching errors and popping up a notification, or to display a loading message and such. This is the best of both worlds as we simply return the session url rather than the whole session object which makes it more secure.
  res.status(200).json({
    status: 'success',
    sessionUrl: session.url,
  });
};

export const createBookingCheckout = async (req, res, next) => {
  //this is a temporary solution to create a booking when the user comes back from the Stripe checkout. This is not secure as anyone can make a GET request to this endpoint and create a booking without paying. We will implement a proper solution using Stripe webhooks later.
  const sessionId = req.query.session_id;
  if (!sessionId) {
    //as this is part of the middleware chain for our overview page route we don't throw an error but simply pass it onto the next stage where it's just a page of tours rather than creating a booking on the way through
    console.error('No session ID provided in query string');
    return next();
    // throw new AppError('No payment session ID provided', 400);
  }
  try {
    //stop reload/refreshing the page from creating a duplicate booking
    const existingBooking = await Booking.findOne({
      stripeSessionId: sessionId,
    });
    if (existingBooking) {
      console.error('Booking already exists for this session ID');
      return res.redirect(req.originalUrl.split('?')[0]);
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      console.error('No payment session found with that ID');
      return next();
      // throw new AppError('No payment session found with that ID', 404);
    }
    const { tour, price, tourStartDate, user } = session.metadata;
    if (!tour || !price || !tourStartDate || !user) {
      console.error('Missing required metadata in payment session');
      return next();
      // throw new AppError('Missing required metadata in payment session', 400);
    }
    await Booking.create({
      tour,
      user,
      price,
      tourStartDate,
      stripeSessionId: sessionId,
    });

    return res.redirect(req.originalUrl.split('?')[0]); //redirect to the same url without the query string
  } catch (error) {
    // Global error handling middleware will deal with any Stripe errors
    return next(error);
  }
};
