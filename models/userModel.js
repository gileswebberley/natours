import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { cryptoHash } from '../utils/utilFunctions.js';

//The schema defines the structure of documents (the 'blueprint') whilst the model creates the collection and provides the interface for working with those documents (like queries and updates)
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
  },
  //we are still working to make sure a user can't be hijacked by changing email and then requesting a forgot password token [TODO] make tokens select:false and double check whether we need to change our find() queries to include them for the password reset and email reset functionality
  pendingEmail: String,
  oldEmail: String,
  emailResetToken: {
    type: String,
    select: false,
  },
  emailResetExpires: Date,
  emailChangedAt: Date,
  emailRevertToken: {
    type: String,
    select: false,
  },
  emailRevertExpires: Date,
  photo: {
    type: String,
  },
  //add in authorisation with the role field - this should be done manually, at least for the first admin
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password of at least 8 characters'],
    minLength: 8,
    //just in case as bcrypt truncates anything longer than 72 chars
    maxLength: 72,
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
  //for the forgot password functionality
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: Date,
  //for delete user to not actually delete the user but instead hide it in find() queries (see the pre-query hook below)
  active: {
    type: Boolean,
    select: false,
    default: true,
  },
});

userSchema.pre('save', async function () {
  //first check to see if the password has been changed and if not simply early return
  if (!this.isModified('password')) return;
  //now we will hash the password with bcrypt - the 12 is the length of the random string used in hashing which is also refered to as the 'salt rounds'. Of course we are using the non sync method
  this.password = await bcrypt.hash(this.password, 12);
  //as this will execute after the validation we'll get rid of the confirmation - required just means it is required input
  this.passwordConfirm = undefined;
  //if this is a password reset ie it's not new (signing up) and it has PATCHed the password
  if (!this.isNew) {
    // no need for this as there is an early return  && this.isModified('password')
    //take away a second to handle jwt syncronisation
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  //remember that we do not call next in the modern version of mongoose
  //   next();
});

//add in the email change security measures that stop you from being able to forget password after an email change
userSchema.pre('save', function () {
  //so a user can change their password after they have used the revert to old email functionality we are going to set the emailChangedAt to undefined in the revertEmail controller
  if (
    !this.isNew &&
    this.isModified('email') &&
    !this.isModified('emailChangedAt')
  ) {
    this.emailChangedAt = Date.now();
  }
});

userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
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

//forgotten password functionality
userSchema.methods.createPasswordResetToken = function () {
  //create the token with the crypto library
  const resetToken = crypto.randomBytes(32).toString('hex');
  //now encrypt this before sending it to the database (should I be awaiting the digest cos it is documented as returning a promise :/) - apparently not
  this.passwordResetToken = cryptoHash(resetToken);

  //   console.log('encryptedResetToken', this.passwordResetToken);
  //we'll check against this to avoid reset being hammered
  this.passwordResetExpires = new Date(
    Date.now() + Number(process.env.RESET_PASSWORD_EXPIRES_IN),
  ); //10mins

  return resetToken;
};

//similar functionality if you want to change the email address for the user
userSchema.methods.createEmailResetToken = function () {
  //create the token with the crypto library
  const resetToken = crypto.randomBytes(32).toString('hex');
  //now encrypt this before sending it to the database (should I be awaiting the digest cos it is documented as returning a promise :/)
  this.emailResetToken = cryptoHash(resetToken);

  //   console.log('encryptedResetToken', this.passwordResetToken);
  //we'll check against this to avoid reset being hammered
  this.emailResetExpires = new Date(
    Date.now() + Number(process.env.RESET_PASSWORD_EXPIRES_IN),
  ); //10mins

  return resetToken;
};

userSchema.methods.createEmailRevertToken = function () {
  //create the token with the crypto library
  const revertToken = crypto.randomBytes(32).toString('hex');
  //now encrypt this before sending it to the database (should I be awaiting the digest cos it is documented as returning a promise :/)
  this.emailRevertToken = cryptoHash(revertToken);

  //   console.log('encryptedResetToken', this.passwordResetToken);
  //we'll check against this to avoid reset being hammered
  this.emailRevertExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); //48hrs

  return revertToken;
};

const User = mongoose.model('User', userSchema);
export default User;
