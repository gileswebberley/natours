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
  this.populate('user', 'name email').populate('tour', 'name');
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
