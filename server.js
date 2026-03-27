import { app } from './app.js';

// next create our port number as a varaible so we can find and change it later
const port = 3000;
// now we can start our server listening to the port we defined above. The callback function will execute when the server starts
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
