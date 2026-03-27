import { __dirname, __filename } from '../utils/pathHackForModules.js';

import fs from 'fs';

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
);

export const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

export const createTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  const newTour = Object.assign({ id: newId }, req.body);
  tours.push(newTour);
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
};

export const getTourById = (req, res) => {
  const thisTour = tours.find((el) => el.id === +req.params.id);
  if (!thisTour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour id invalid',
    });
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour: thisTour,
    },
  });
};
