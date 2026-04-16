import mongoose from 'mongoose';
import { app } from '../app.js';

console.log('the env variable is set to: ', app.get('env'));

//Now we're goimng to try to connect to the mongoDB database that we just created
const DB = process.env.DATABASE_URI.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then((connection) =>
    console.log('Connected to MongoDB', connection.connections),
  )
  .catch((err) => console.error('Error connecting to MongoDB:', err));

//Let's create our first mongoose schema
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

//ok so it's time to see if this works, let's create a new tour...
const testTour = new Tour({
  name: 'The Forest Hiker',
  rating: 4.7,
  price: 497,
});

//...and try to save it (please note that we were instructed to 'drop' ie delete the tours collection which deleted the natours db). This function is async and so returns a promise with the document that has just been created
testTour
  .save()
  .then((doc) => console.log(doc))
  .catch((err) => console.error('Error creating tour:', err));

// next create our port number as a varaible so we can find and change it later - We have now set this in our .env files
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
