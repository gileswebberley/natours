import fs from 'fs';
import mongoose from 'mongoose';
import { loadEnvFile } from 'node:process';
import Tour from '../../models/tourModel.js';

//This file is simply for getting some data into the DB so we have something to mess around with
// because we have used the --env-file=.env.development flag inside the Node script that is in our package.json we will use the Node equivalent for when we run this particular script from the terminal
loadEnvFile('../../.env.development');

// remember that when we try running this from the terminal we will have to be in the dev-data/data folder for this filepath to work - simply run a node process from there with node import-dev-data.js and it has all worked :)
const tours = JSON.parse(fs.readFileSync(`./tours-simple.json`, 'utf-8'));

async function importData() {
  try {
    //the create method can also take an array of objects as well as individual objects, it will then create a document for each of the objects
    await Tour.create(tours);
    console.log('Tours data upload success!');
    //and then force the process to exit once the data has been exported to the db so we don't have to do it manually from the terminal
    process.exit();
  } catch (error) {
    console.log(error);
  }
}

const DB = process.env.DATABASE_URI.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => {
    console.log('Connected to MongoDB...');
    // in the course we are introduced to using the command line to run this script with a flag that can be retrieved from the process object in Node. This would mean that we could simply add --import to the end of the command and then grab it using the process.argv array, however this may be for when the course was produced using commonJS modules rather than ES modules apparently. Instead I will simply call it when the connection is established like so.
    importData();
  })
  .catch((err) => console.error('Error connecting to MongoDB:', err));
