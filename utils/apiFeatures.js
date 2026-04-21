//All of these features in the getAllTours method makes them tightly coupled and not re-useable so we'll create a class with chainable methods. In the course query is sent as Tour.find() but I think it is more sensible to send the Tour model instead otherwise in filtering we would end up with Tour.find().find(filters) - after a bit of research, apparently mongoose will simply merge the two find() calls. I'll do it so you can optionally pass in a 'pre-filtered query' like Tour.find({price: $lte: 500}) - actually no, let's just stick with the course
class APIFeatures {
  // I also don't want a user to be able to set the query from outside so I'll make it read-only by setting a getter function for it
  #query;

  constructor(query, queryString) {
    //the query object for the model or the query object that has been passed in as the optional third argument
    this.#query = query;
    //and the query string is the stuff that comes after a ? eg ?price[lte]=500
    this.queryString = queryString;
  }

  // read-only query
  get query() {
    return this.#query;
  }

  //we'll copy from the getAllTours and adapt to make it work as expected, remembering to return this object at the end of each method to make them chainable

  filter() {
    // we want to filter out the non filtering query parameters so we make a copy and delete the unwanted
    let filteredQuery = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete filteredQuery[el]);
    //Advanced filtering (gt, gte, lt, lte)
    let queryStr = JSON.stringify(filteredQuery);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    filteredQuery = JSON.parse(queryStr);

    this.#query = this.#query.find(filteredQuery);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.#query = this.#query.sort(sortBy);
    } else {
      //set a default sort method - newest first
      this.#query = this.#query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const projectBy = this.queryString.fields.split(',').join(' ');
      this.#query = this.#query.select(projectBy);
    } else {
      // as default we will remove the __v field, we can also exclude fields in the schema
      this.#query = this.#query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; //if no page is set in the query we'll default to 1
    const limit = this.queryString.limit * 1 || 100; //if no limit is set in the query we'll default to 100
    const pageSkipper = (page - 1) * limit; //ie limit = 10 so page 1 = results 0-10, page 2 = 11-20 etc
    //if we'd gone down the path of passing the model in here and wanted to throw an error like we did in our original implementation within getAllTours then you should not only make this an async method but also use clone() so that it doesn't execute the query thats already been constructed if this were in the APIFeatures method eg await this.#query.clone().countDocuments()
    // if we're all good we'll add the functionality to the query object
    this.#query = this.#query.skip(pageSkipper).limit(limit);
    return this;
  }
}

export default APIFeatures;
