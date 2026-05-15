import mongoose from 'mongoose';

// import { app } from './app.js';// so the uncaught exceptions handler works with the app module we will dynamically import it instead

process.on('uncaughtException', (err) => {
  console.error(
    `UNCAUGHT EXCEPTION: ${err.name} - ${err.message} - ${err.stack} : shutting down....`,
  );
  process.exit(1); //Exit with failure code so that Heroku knows to restart
});

//don't return this from the async function but rather have it at the top level of the module
let server = null;

//see the notes about this and how it relates to uncaught exceptions
async function startServer() {
  //Now we're goimng to try to connect to the mongoDB database that we just created
  try {
    const DB = process.env.DATABASE_URI.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD,
    );
    await mongoose.connect(DB);
    console.log('Connected to MongoDB...');
    //we're trying to index the locations but only startLocation is registering on Compass

    //dynamically import the app
    const { app } = await import('./app.js');
    console.log('the env variable is set to: ', app.get('env'));
    // next create our port number as a varaible so we can find and change it later - We have now set this in our .env files
    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
      console.log(`App running on port ${port}...`);
    });
  } catch (error) {
    console.error('ERROR: Failed during start up :( - ', error);
    //if it's failed during start up then we have big problems so force the app to crash so it can be restarted
    process.exit(1);
  }
}

//this is now even more important as node will immediately crash if there's an unhandled exception, this allows us to close gracefully. Remember that process.on() is the way to deal with events in Node.js
process.on('unhandledRejection', (err) => {
  console.error(
    `UNHANDLED REJECTION: ${err.name} - ${err.message} - ${err.stack}: shutting down....`,
  );
  //close down the server first
  if (server) {
    server.close(() => {
      //then kill the process
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

//Now we've got our exception and rejection handlers there for the whole application, including in app.js, we'll try to dynamically import it and do all of the start up routine
startServer();
