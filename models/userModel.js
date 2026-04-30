import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

//5 fields name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'A user must provide an email address'],
    lowercase: true,
    unique: true,
    trim: true,
    validate: [validator.isEmail, 'The email address is not considered valid'],
    //   function (val) {
    //     const regexp =
    //       /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    //     return regexp.test(val);
    //   },
    //   message: 'The email address is not considered valid',
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password of at least 8 characters'],
    minLength: 8,
    //just in case as bcrypt truncates anything longer than 72 chars
    maxLength: 72,
    // unique: true,
    //let's make sure that we don't share the password in our responses
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide a password confirmation'],
    validate: {
      //Remember this keyword only works on save/create
      validator: function (val) {
        return val === this.password;
      },
      message: 'Your password does not match your password confirm',
    },
  },
  //just for our final step in the protect middleware function
  passwordChangedAt: Date,
});

userSchema.pre('save', async function () {
  //first check to see if the password has been changed and if not simply early return
  if (!this.isModified('password')) return;
  //now we will hash the password with bcrypt - the 12 is the length of the random string used in hashing which is also refered to as the 'salt rounds'. Of course we are using the non sync method
  this.password = await bcrypt.hash(this.password, 12);
  //as this will execute after the validation we'll get rid of the confirmation - required just means it is required input
  this.passwordConfirm = undefined;
  //take away a second to handle jwt syncronisation
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  //remember that we do not call next in the modern version of mongoose
  //   next();
});

//for checking passwords we are going to create our first 'instance method'. These are available on the user documents and so the this keyword relates to the current document
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  //because we have password select: false we cannot use this.password which is why userPassword must be sent in as an argument. Using the bcrypt package we can automagically check the non hashed candidatePassword against the hashed password stored in the DB
  return await bcrypt.compare(candidatePassword, userPassword);
};

//final check in the protect middleware
userSchema.methods.changedPasswordAfterJwtIssue = function (JWTTimestamp) {
  //the jwt timestamp is given in seconds whereas the mongoose uses the JS Date object
  if (this.passwordChangedAt) {
    //so the user has changed their password since signing up
    const dateTime = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return JWTTimestamp < dateTime;
  }
  //if we do not have a passwordChangedAt field we cannot check so return false - ie it hasn't changed
  return false;
};

const User = mongoose.model('User', userSchema);
export default User;
