import mongoose from 'mongoose';
import { app } from './app.js';

console.log('the env variable is set to: ', app.get('env'));

//Now we're goimng to try to connect to the mongoDB database that we just created
const DB = process.env.DATABASE_URI.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// next create our port number as a varaible so we can find and change it later - We have now set this in our .env files
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
