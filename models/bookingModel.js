import mongoose from 'mongoose';
// we will be using 'parent-referencing' to avoid an enormous possible array from being embedded in the User model
const bookingSchema = new mongoose.Schema(
  {
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
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//now we need to populate the fields that are referencing other models so we can get the data that's required
bookingSchema.pre(/^find/, function () {
  //because I added the virtual property called photoUrl to my user (so I can deal with cloudinary or local image files) and virtual properties are always 'selected' as it were I will simply add the photo property that the virtual function relies on so it doesn't return '/img/users/undefined'. Also worth noting is that the booking object when using Booking.find() does include the _id and id fields by default!!
  this.populate('user', 'name email photo').populate('tour', 'name');
});

//try the alternative method for getting the tour details for each of the bookings following the method used for reviews in the tourModel
bookingSchema.virtual('tourDetails', {
  ref: 'Tour',
  foreignField: '_id',
  localField: 'tour',
  //so without this next line the virtual populate produces an array with a single object inside it. This was breaking the my bookings page as each tour was inside an array rather than just the tour object itself, this little line has fixed it. Gemini said "In Mongoose, virtual populates default to returning an array of documents because a virtual relationship is designed to handle one-to-many relationships by default. Since Mongoose does not know ahead of time if your foreign field is unique, it assumes there could be multiple matching documents"
  justOne: true,
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
