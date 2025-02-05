import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import User from '../models/User.js';

const startAuthenticatedSession = (req, user) => {
  return new Promise((fulfill, reject) => {
    req.session.regenerate((err) => {
      if (!err) {
        req.session.user = user; 
        fulfill(user);
      } else {
        reject(err);
      }
    });
  });
};

const endAuthenticatedSession = req => {
  return new Promise((fulfill, reject) => {
    req.session.destroy(err => err ? reject(err) : fulfill(null));
  });
};


const register = async (username, email, password) => {

  if (username.length < 5 || password.length < 7) {
    throw { message: 'USERNAME PASSWORD TOO SHORT' };
  }
  // use await to wait until finding user in database is completed
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw { message: 'USERNAME ALREADY EXISTS' };
  }

  const salt = Date.now().toString();

  const combinedPassword = password + salt;

  const hashedPassword = bcrypt.hashSync(combinedPassword, 10);
  const user = new User({
    username,
    salt,
    email,
    password: hashedPassword,
  });
  await user.save();
  return user;
};

const login = async (username, password) => {

  const user = await User.findOne({ username });
  if (!user) {
    throw { message: "USER NOT FOUND" };
  }

  const combinedPassword = password + user.salt;

  const isPasswordMatch = bcrypt.compareSync(combinedPassword, user.password);
  
  if (!isPasswordMatch) {
    throw { message: "PASSWORDS DO NOT MATCH" };
  }

  return user;
};

const googleSign = async (profileId, profileData) => {
  // existence check
  let user = await User.findOne({ googleId: profileId });

  if (!user) {
    // if the user doesn't exist, create a new user with Google profile data
    user = new User({
      username: profileData.displayName, // dp name
      email: profileData.email,           // google email
      googleId: profileId,               // store Google ID
      profilePicture: profileData.picture, // store Google profile picture URL
    });

    // save the user in the database
    await user.save();
  }

  return user;
};

export {
  startAuthenticatedSession,
  endAuthenticatedSession,
  register,
  login,
  googleSign
};
