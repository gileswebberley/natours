import mongoose from 'mongoose';
// we will be using 'parent-referencing' to avoid an enormous possible array from being embedded in the User model
const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a tour.'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a user.'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },
  //added this in as it seems essential to know what's being booked!!
  tourStartDate: {
    type: Date,
    required: [true, 'Booking must have a tour start date.'],
  },
  stripeSessionId: String, //saving this to avoid refresh issues with the hack version of the booking creation but it's also really useful to have it stored for referencing the payment in the Stripe dashboard
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

//now we need to populate the fields that are referencing other models so we can get the data that's required
bookingSchema.pre(/^find/, function () {
  //because I added the virtual property called photoUrl to my user (so I can deal with cloudinary or local image files) and virtual properties are always 'selected' as it were I will simply add the photo property that the virtual function relies on so it doesn't return '/img/users/undefined'. Also worth noting is that the booking object when using Booking.find() does include the _id and id fields by default!!
  this.populate('user', 'name email photo').populate('tour', 'name');
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
