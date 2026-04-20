import mongoose from 'mongoose';

// Any data sent as a Tour that is not in this schema will be ignored and not saved to the database
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
  },
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
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
  priceDiscount: Number,
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
});
// required takes an array where the first element is a boolean to say if it is required and the second is for the error message thrown if it is not provided
//unique 'is not a validator' but instead it marks this field as a unique index in the database, therefore you cannot have two with the same value for the field in the Collection
// Trim removes all whitespace from the beginning and end of a string
// Notice that we define the images field as an array of strings, this means we can have a varying amount of images connected to the tour and they will be stored as the string file path to the image we have stored. I think there is probably a way to do Blobs but we'll come to that later I believe
// In mongoose apparently Date.now() will create a timestamp when we produce a new document rather than it being Date.now the property which would mean it was set to the time I'm producing this schema. For Date fields mongoose will try to parse the value provided, so we could pass it the string "2025-10-5" for example and it would convert that into an actual Date object to store in the DB (if it can't it will throw an error)
// select is the same as it's method counterpart, namely you can set it to false so that it is never returned from the database - equivalent to query.select('-createdAt')

//Next let's create the model based on this schema (notice the capitalisation of the Name, this is a standard convention)
const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
