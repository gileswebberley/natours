import mongoose from 'mongoose';
import Tour from './tourModel.js';
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
  //hide the reviews that have not been disapproved due to illicit content then populate the reviews being careful to remove the userId from the results
  this.find({ approved: { $ne: false } }).populate({
    path: 'user',
    select: '-_id name photo',
  });
});

//we are now doing the calculations for the ratingsAverage (and quantity) fields in the tours documents by using our first static model method which will utilise the aggregation pipeline and be called when a review is created (by the pre-save hook below)
reviewSchema.statics.calcRatingsAverage = async function (tourId) {
  //'this' in a static schema method points to the model
  //remember that the aggregation pipeline is defined as an array of stage-objects and returns a Promise. Also remember that the fields are referenced via the string version of their names with the $ prefix
  const stats = await this.aggregate([
    //first find all reviews where the tour field is this tourId
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        numRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
    //I want to fix the avgRating to one decimal point - we can use an $addFields stage (which overwrites any variables declared without dropping other fields) and in there use the $round operator
    {
      $addFields: {
        avgRating: { $round: ['$avgRating', 1] },
      },
    },
  ]);
  console.log(stats);
  //now let's put these stats into the tour document
  await Tour.findByIdAndUpdate(tourId, {
    ratingsAverage: stats[0].avgRating,
    ratingsQuantity: stats[0].numRatings,
  });
};

//and then call this each time a review is saved (which might mean we have to change our handler factory update method?)
reviewSchema.post('save', async function () {
  //as explained in my notes we want to call a static method on a model that is instantiated below so we use a property of the document object to reach it instead, and we pass it the current tour that the review document being created refers to
  await this.constructor.calcRatingsAverage(this.tour);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
