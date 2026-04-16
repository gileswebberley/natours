import mongoose from 'mongoose';

// Any data sent as a Tour that is not in this schema will be ignored and not saved to the database
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
});

//Next let's create the model based on this schema (notice the capitalisation of the Name, this is a standard convention)
const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
