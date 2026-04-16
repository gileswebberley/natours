import mongoose from 'mongoose';
import { app } from '../app.js';

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

//Express sets the env varaible to 'development' by default when we run the server with nodemon, but if we were to run it with node it would be set to 'production' by default. We can also set it ourselves to whatever we want by setting the env variable in our terminal before running the server (eg export NODE_ENV=development on mac or set NODE_ENV=development on windows). This is really useful because we can have different settings for development and production (eg different database connection strings, different logging levels, etc) and we can use this env variable to determine which settings to use.
console.log('the env variable is set to: ', app.get('env'));
//or you can see all of the environment variables set by Node by logging the env object of the proccess global object
// console.log('Node has set the environment variables: ', process.env);
// in the course they use the dotenv package but this is no longer needed in Node 20+ as we can use the built in support by using the --env-file flag when we start the server. We can also use the --watch flag which allows for us to get rid of our nodemon dependency as well. See the dev script in package.json for how I'll use those flags.

// next create our port number as a varaible so we can find and change it later - We have now set this in our .env files
const port = process.env.PORT; //this means that if we have a PORT env variable set (eg in .env.production) then we will use that, otherwise we will use 3000 as the default port for development
// now we can start our server listening to the port we defined above. The callback function will execute when the server starts
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
