import mongoose from 'mongoose';
import validator from 'validator';

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
    validate: {
      validator: [
        validator.isEmail,
        'The email address is not considered valid',
      ],
      //   function (val) {
      //     const regexp =
      //       /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
      //     return regexp.test(val);
      //   },
      //   message: 'The email address is not considered valid',
    },
  },
  photo: {
    type: String,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password of at least 8 characters'],
    minLength: 8,
    unique: true,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide a password confirmation'],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'Your password does not match your password confirm',
    },
  },
});

const User = mongoose.model('User', userSchema);
export default User;
