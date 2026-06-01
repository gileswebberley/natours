import mongoose from 'mongoose';
//we are using parent referencing to avoid an enourmous possible array from being embedded in the Tour model
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have a review text'],
    },
    rating: {
      type: Number,
      min: [1, 'A rating must be at least 1'],
      max: [5, 'A rating can only be a maximum of 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user.'],
    },
    //I might add an approved field to allow an admin to hide reviews that are inappropriate so they won't be deleted but wouldn't be available to the public
    approved: {
      type: Boolean,
      default: true,
    },
  },
  {
    //This is the schema-options object which we'll use to inject our virtual property into the results
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//we're creating a populate middleware for the user field in the reviews, however we'll not add in the tour as we are going to make it so that the tour document has a virtual populate for it's reviews and we'll only have them attached to a tour when we get a single tour by id.
reviewSchema.pre(/^find/, function () {
  //hide the reviews that have not been disapproved due to illicit content
  this.find({ approved: { $ne: false } }).populate({
    path: 'user',
    select: 'name photo',
  });
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
