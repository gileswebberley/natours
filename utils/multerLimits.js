//to secure against DoS attacks we'll limit multer instances to some sensible boundaries. When we call multer() we can pass in this limits object
export const multerLimits = {
  fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  files: 5, // Limit the number of files to 5 as we have a cover image and 3 other images for the tour, so 4 in total but we'll allow 5 just in case
  fields: 10, // Limit the number of non-file fields to 10
  fieldNameSize: 100, // Limit the size of field names to 100 bytes
  fieldNestingDepth: 5, // Limit the depth of nested objects to 5
  headerPairs: 2000, // Limit the number of header key-value pairs to 2000
};
