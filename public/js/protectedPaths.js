//injected into res.locals for use in the _header navigation and imported into logout for page redirect (ie go to / if in a restricted area of the site when logging out)
const protectedPaths = [
  'me',
  'my-reviews',
  'my-tours',
  'add-review',
  'edit-review',
];

export default protectedPaths;
