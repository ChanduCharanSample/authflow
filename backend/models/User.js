const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { hashPassword, isBcryptHash } = require('../utils/password');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long.'],
      maxlength: [80, 'Name must be at most 80 characters long.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Please enter a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      maxlength: [128, 'Password must be at most 128 characters long.'],
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    /**
     * Incremented after a password reset so previously issued JWTs are no
     * longer accepted, even if they have not expired yet.
     */
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Safety net: hash any plaintext password before it is saved, while avoiding a
// second hash when the service layer already supplied a bcrypt hash.
userSchema.pre('save', async function hashPasswordBeforeSave() {
  if (!this.isModified('password')) return;
  if (!isBcryptHash(this.password)) {
    this.password = await hashPassword(this.password);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
