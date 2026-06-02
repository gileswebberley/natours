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
//IMPORTANT GOTCHA - I had the usual /^find/ regExp in here before but it was stopping the post-query hook from triggering. This new regExp now only deals with read queries and so does not malform the query which was stopping the post-query hook from running.
reviewSchema.pre(/^find$|^findOne$/, function () {
  //hide the reviews that have not been disapproved due to illicit content then populate the reviews being careful to remove the userId from the results - no that stops the check which allows users to only update or delete their own reviews from working!
  this.find({ approved: { $ne: false } }).populate({
    path: 'user',
    select: 'name photo',
  });
});

//we are now doing the calculations for the ratingsAverage (and quantity) fields in the tours documents by using our first static model method which will utilise the aggregation pipeline and be called when a review is created (by the hooks below)
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
  //now let's put these stats into the tour document being careful that we have not deleted the last review that exists by using optional chaining and nullish coalescence
  await Tour.findByIdAndUpdate(tourId, {
    ratingsAverage: stats[0]?.avgRating ?? 4.5,
    ratingsQuantity: stats[0]?.numRatings ?? 0,
  });
};

//and then call this each time a review is saved (which might mean we have to change our handler factory update method?)
reviewSchema.post('save', async function () {
  //as explained in my notes we want to call a static method on a model that is instantiated below so we use a property of the document object to reach it instead, and we pass it the current tour that the review document being created refers to
  await this.constructor.calcRatingsAverage(this.tour);
});

//and of course we need to update these stats when a review is updated or deleted which we do by findByIdAndUpdate/findByIdAndDelete which under the hood rely on findOneAnd... The method shown in the course is actually now deprecated and so we simply use the post-query hook which gives us access to the document. REMEMBER you should have the returnDocument:'after' query option on the updating query
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (!doc || !doc.tour) {
    console.log('No document found in post-query review hook');
    return;
  }
  //and now in modern mongoose we can call our static method just like we did in our post-save hook but with this.model which is a property of the query object rather than 'this'
  // console.log(`calc avgs for ${doc.tour}`);
  await this.model.calcRatingsAverage(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
