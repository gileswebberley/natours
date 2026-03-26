import express from 'express';
import fs from 'fs';
//because I am using modules for a course based on commonjs I have to add this snippet to allow use of __dirname
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// access express through our app variable which is standard starting point
const app = express();

// Express needs some middleware to be able to read the body of a request and parse it if it is of the Content-Type application/json. For this we USE the express.json() which is based on the 'body-parser' package.
app.use(express.json());

// next create our port number as a varaible so we can find and change it later
const port = 3000;
// now we can start our server listening to the port we defined above. The callback function will execute when the server starts
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
//-----------------------------------------------------------------------------
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
//-----------------------------------------------------------------------------
//Now we're going to start building the project api. Notice that the routes will have a version number for the apis, this is so if you want to change it later you can use a new version number so that the original doesn't suddenly stop working. This is a common practice in api design.

// as top level code is only run once when the server starts we'll grab the data here. We're using the File System module (fs) to read the json file and then parse it into a javascript object. This is a bit of a hack for now but we'll be using a database later on so it's not a big deal.
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`),
);

//tours is the first 'resource' we are going to deal with.
//we are going to send back the tours data that we read in above (as tours). We are also using the JSend method to wrap (or envelope) the data in a standard format. This is a common practice in api design and makes it easier for clients to parse the data. The JSend format has threemain properties - status (success, fail, or error), data (the data we are wrapping), and message (an optional message about the response). It is also good practice to include a results property which indicates how many items are in the data especially if it's an array of items
app.get('/api/v1/tours', (req, res) => {
  //this part is called the 'route handler'
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

//let's add a POST request so we can add new tours (see the comment about use(express.json()) as without it req.body will be undefined)
//Notice the status code of 201 which is the standard code for 'Created' and so works well for POST requests.
app.post('/api/v1/tours', (req, res) => {
  //we are using a file as our fake database for now. Remember that when we create a new object for storing in a real database we would not define an id as the db would do that for us.
  const newId = tours[tours.length - 1].id + 1;
  //object.assign allows us to create a new object by merging 2 or more objects together.
  const newTour = Object.assign({ id: newId }, req.body);
  //add it to the object we loaded at the top
  tours.push(newTour);
  //USE THE NON-SYNC VERSION OF WRITEFILE SO IT DOESN'T BLOCK THE EVENT LOOP
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      if (err) {
        res.status(500).json({
          status: 'error',
          message: 'Could not save the new tour',
        });
      }
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    },
  );
});
