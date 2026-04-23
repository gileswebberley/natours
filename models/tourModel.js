import mongoose from 'mongoose';
import slugify from 'slugify';

// Any data sent as a Tour that is not in this schema will be ignored and not saved to the database
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      //validators
      required: [true, 'A tour must have a name'],
      maxLength: [40, 'A tour name must be shorter than 41 characters'],
      minLength: [3, 'A tour name must be more than 3 characters'],
      //not actual validators
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
      //we can use an enum to set possible values
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty can only be set as easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //validators to set the range
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
          //the function must return a boolean as to whether it has been passed
          if (this) {
            //check that the discount isn't more than the original price
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
// required takes an array where the first element is a boolean to say if it is required and the second is for the error message thrown if it is not provided
//unique 'is not a validator' but instead it marks this field as a unique index in the database, therefore you cannot have two with the same value for the field in the Collection
// Trim removes all whitespace from the beginning and end of a string
// Notice that we define the images field as an array of strings, this means we can have a varying amount of images connected to the tour and they will be stored as the string file path to the image we have stored. I think there is probably a way to do Blobs but we'll come to that later I believe
// In mongoose apparently Date.now() will create a timestamp when we produce a new document rather than it being Date.now the property which would mean it was set to the time I'm producing this schema. For Date fields mongoose will try to parse the value provided, so we could pass it the string "2025-10-5" for example and it would convert that into an actual Date object to store in the DB (if it can't it will throw an error)
// select is the same as it's method counterpart, namely you can set it to false so that it is never returned from the database - equivalent to query.select('-createdAt')
// min and max can also be used to validate dates apparently

//As an example of how to create virtual properties....
tourSchema.virtual('durationInWeeks').get(function () {
  return this.duration / 7;
});

//As an example of a Document middleware that executes before ONLY .save() and .create() method calls. Note that this refers to the document that is being saved/created. We are going to create a field called slug and so we have to add that to the schema for it to persist
tourSchema.pre('save', function () {
  //we'll create a slug based on the name and converted to lowercase, first check whether the name has changed to avoid recreating the slug every time any field changes
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
  //just like in Express we call the next() function to pass through the middleware pipeline - UPDATED - this is now automatic in modern mongoose
  //   next();
});

//Just for reference here's a post-document hook that logs the just saved document
// tourSchema.post('save', function (doc) {
//   console.log('The document we just saved to the DB was: ', doc);
// });

// For QUERY MIDDLEWARE - the this keyword now points to the query object. Like when we used the 'save hook' we will attach these to the 'find' hook, however that will only run on find() not on findById() or findOne() for example so you can actually pass a regEx in instead of the hook name. Here we want these to run on any query that starts with find. We've added a secretTour property to our schema and this will filter them out so they are not returned in the results
tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });
  //now to measure the request time we'll try to add a start property to the query object (although I don't think it'll work because it's now immutable - NO, I was thinking of the Express req.query object which is completely different to the mongoose query object which is not frozen and is commonly used to pass information through the query middleware pipeline!)
  this.start = Date.now();
  console.log(`start query time: ${this.start}`);
});

//In the post-query hook we have access to all of the documents that have been returned by the query
tourSchema.post(/^find/, function (docs) {
  console.log(
    `The query took ${Date.now() - this.start} milliseconds to retrieve ${docs.length} documents`,
  );
});

//AGGREGATION MIDDLEWARE - in here the this keyword points to the aggregate method itself. When we worked with aggregation we learnt how to build the 'pipeline' which is an array of objects (stages). As with the query hook above we want to exclude our secret tours from our aggregation functions so we simply add an extra $match stage to our pipeline array
tourSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
});

//Next let's create the model based on this schema (notice the capitalisation of the Name, this is a standard convention). This must come after the virtuals and hooks are defined
const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
