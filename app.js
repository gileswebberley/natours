import express from 'express';
import fs from 'fs';

// access express through our app variable which is standard starting point
const app = express();
// next create our port number as a varaible so we can find and change it later
const port = 3000;

// now we can start our server listening to the port we defined above. The callback function will execute when the server starts
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//routing sets how a server responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, etc). Each route can have one or more handler functions, which are executed when the route is matched. The handler functions can perform any operations, including sending a response back to the client.
// let's set up a quick example route which we can test in Postman (by setting the url of a GET request to 127.0.0.1:3000 as that is the localhost ip address and the port we are listening to)
// app.get('/', (req, res) => {
// use the status func to send an ok status code of 200 and then a little message
//   res.status(200).send('Turn to the server-side Luke');
//if we want to send some json via the res(ponse) object we can use the json method INSTEAD of send. This method automagically sets the content-type to application/json and also converts the object we pass in to a json string
//   res
//     .status(200)
//     .json({ message: 'Turn to the server-side Luke', app: 'Natours' });
// });

//Now we're going to start building the project api. Notice that the routes will have a version number for the apis, this is so if you want to change it later you can use a new version number so that the original doesn't suddenly stop working. This is a common practice in api design.

// as top level code is only run once when the server starts we'll grab the data here

//tours is the first 'resource' we are going to deal with.
app.get('/api/v1/tours', (req, res) => {
  //this part is called the route handler
});
