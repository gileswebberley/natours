import mongoose from 'mongoose';
import slugify from 'slugify';
//we've made a utility location file that contains a schema (not a model because these are sub-documents so we won't be trying Location.find() for example)and a factory function for creating the locations embedded in the tours
import { locationSchema } from '../utils/location.js';

// Any data sent as a Tour that is not in this schema will be ignored and not saved to the database
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      maxLength: [40, 'A tour name must be shorter than 41 characters'],
      minLength: [3, 'A tour name must be more than 3 characters'],
      unique: true,
      trim: true,
    },
    //created in the Document middleware
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty can only be set as easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A rating must be at least 1'],
      max: [5, 'A rating cannot be greater than 5'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //val is the value that is being created, remember that this keyword only works on creation not on update
          if (this) {
            return val < this.price;
          }
          //stop it crashing if we update with runValidators set to true
          return true;
        },
        // notice the use of the mongoose template string in the curly braces
        message: 'The discount of {VALUE} is more than the original price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startLocation: locationSchema,
    locations: [locationSchema],
    // guides: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    //   },
    // ],
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    //This is the schema-options object which we'll use to inject our virtual property into the results
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//so we could run 'near me' run queries, or maybe more specifically aggregation stages, on startLocation or locations we should index these fields accordingly. The aggregation would use something like $geoNear although because we'll have a few indexed we have to provide the key property like so -
// In your controller aggregation
// {
//   $geoNear: {
//     near: { type: 'Point', coordinates: [lng, lat] },
//     distanceField: 'distance',
//     key: 'startLocation' // <--- You must specify this if you have multiple geo-indexes
//   }
// }
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.index({ locations: '2dsphere' });

//As an example of how to create virtual properties....
tourSchema.virtual('durationInWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
});

tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  //   console.log(`start query time: ${this.start}`);
});

//In the post-query hook we have access to all of the documents that have been returned by the query - just a little lesson learnt - I implemented the next(new AppError) replacement for try-catch in getTourById and even when I was throwing an error this still ran and caused an error to be thrown so had to add optional chaining to docs.length to stop it from checking a null object for it's length property.
tourSchema.post(/^find/, function (docs) {
  const numDocs = docs === null ? 0 : docs?.length || 1;
  console.log(
    `The query took ${Date.now() - this.start} milliseconds to retrieve ${numDocs} documents`,
  );
});

//add a stage to the aggregate function that hides secret tours from the pipeline
tourSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
});

//This must be the last line
const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
