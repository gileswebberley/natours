//This is here so that I don't manually embed all of the locations like in the course and so if I need to make changes down the line I will only have to do it here
import mongoose from 'mongoose';
//This is an example of the structure of a GeoJSON point
export const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      required: [true, 'A location must have coordinates'],
    },
    address: String,
    description: String,
    //the day field is to denote which day of the trip we visit this location
    day: Number,
  },
  //if we didn't want/need these to have an id we could add the option object {_id:false} as the second argument
  //   { _id: false },
);

//Now we'll create a factory function so that we can create them with a simple call and also ensures that the structure is always correct.
export const createLocation = (
  lng,
  lat,
  description = '',
  address = '',
  day = 0,
) => {
  return {
    type: 'Point',
    coordinates: [lng, lat],
    address,
    description,
    day,
  };
};
