// app.js

import http from 'http';
import path from 'path';

import express from 'express';
import exphbs from 'express-handlebars';
import session from 'express-session';
import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';

import { Server } from 'socket.io';

import dotenv from 'dotenv';
dotenv.config();

import { myIo } from './server/sockets/io.js';
import { gameRoutes } from './server/routes/gameRoutes.js';
import * as auth from './server/auth/auth.js';
import './server/models/User.js';
import Game from'./server/models/Game.js';


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT;

server.listen(port);

const games = {};

myIo(io, games);

console.log(`Server listening on port ${port}`);

const Handlebars = exphbs.create({
  extname: '.html',
  partialsDir: path.join(process.cwd(), 'front', 'views', 'partials'),
  defaultLayout: 'layout',
  helpers: {}
});

const loginMessages = {"PASSWORDS DO NOT MATCH": 'Incorrect password', "USER NOT FOUND": 'User doesn\'t exist'};
const registrationMessages = {"USERNAME ALREADY EXISTS": "Username already exists", "USERNAME PASSWORD TOO SHORT": "Username or password is too short"};

mongoose.connect(process.env.DSN);

app.engine('html', Handlebars.engine); // Use Handlebars.engine for Express
app.set('view engine', 'html');
app.set('views', path.join(process.cwd(), 'front', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'front', 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DSN }),
  cookie:{maxAge:1000 * 60 * 60}
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use((req, res, next) => {
  console.log(req.path.toUpperCase(), req.body);
  console.log(`Games: ${games}`);
  console.log(games);
  next();
});

app.get('/', (req, res) => {
  res.render('index', {user: req.session.user});
});

app.get('/auth', (req, res) => {
  res.render('auth');
});

app.use('/game', gameRoutes(games));


app.get('/auth/login', (req, res) => {
  res.render('login');
});

app.post('/auth/login', async(req, res) => {
  try {
    const user = await auth.login(
      sanitize(req.body.username), 
      req.body.password
    );
    await auth.startAuthenticatedSession(req, user);
    res.redirect('/'); 
  } catch(err) {
    console.log(err);
    res.render('login', {message: loginMessages[err.message] ?? 'Login unsuccessful'}); 
  }
});

app.get('/auth/register', (req, res) => {
  res.render('register');
});

app.post('/auth/register', async (req, res) => {
  try {
    const newUser = await auth.register(
      sanitize(req.body.username), 
      sanitize(req.body.email), 
      req.body.password
    );
    await auth.startAuthenticatedSession(req, newUser);
    res.redirect('/'); 
  } catch(err) {
    console.log(err);
    res.render('register', {message: registrationMessages[err.message] ?? 'Registration error'}); 
  }
});

// google using passportjs
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.APPURL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await auth.googleSign(profile.id, profile);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth' }),
  async (req, res) => {
    try {
     
      await auth.startAuthenticatedSession(req, req.user);

      
      res.redirect('/');
    } catch (err) {
      console.error("Error starting authenticated session:", err);
      res.redirect('/');
    }
  }
);

app.get('/logout', async (req, res) => {
  try {
    await auth.endAuthenticatedSession(req);
    res.redirect('/');
  } catch (err) {
    console.error("Error ending session:", err);
    res.redirect('/'); // fallback redirect
  }
});

app.get('/history', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth');
  }

  const userId = req.session.user._id;
  const opponentName = req.query.opponent ? req.query.opponent.trim() : '';

  let playedGames = await Game.find({
    $or: [
      { whiteUser: userId },
      { blackUser: userId }
    ],
    // only completed or terminated games allowed here
    status: { $nin: ['waiting', 'in-progress'] } 
  })
  .populate('whiteUser blackUser')
  .sort({ createdAt: -1 })
  .lean();

  // filter by oppName results
  if (opponentName) {
    playedGames = playedGames.filter(g => {

      const userIsWhite = g.whiteUser._id.toString() === userId.toString();
      const opponentUser = userIsWhite ? g.blackUser : g.whiteUser;

      if (!opponentUser) return false;

      // check if opponent's username includes the search term (case-insensitive)
      return opponentUser.username.toLowerCase().includes(opponentName.toLowerCase());
    });
  }

  res.render('history', {
    games: playedGames,
    opponent: opponentName // pass the current search term back to the template for display
  });
});

app.use((req, res) => {
  res.status(404).render('404');
});