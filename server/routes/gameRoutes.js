import express from 'express';
import { isAuthenticated } from '../auth/verifyauth.js';
import Game from '../models/Game.js';

export const gameRoutes = (games) => {
    const router = express.Router();

    router.use(isAuthenticated);

    router.get('/', (req, res) => {
        res.render('index');
    });
    
    router.post('/create', async (req, res) => {
        try {
            let code;
            let exists;
    
            // ensure the game code is unique
            do {
                code = Math.random().toString(36).substring(2, 6).toUpperCase();
                exists = await Game.findOne({ code });
            } while (exists);
    
            const newGame = new Game({
                code: code,
                whiteUser: req.session.user._id, // set the white user to the currently logged-in user
                status: 'waiting',
            });
    
            await newGame.save();
            games[code] = {};
    
            res.json({ code });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create game.' });
        }
    });

    router.get('/spectate', async (req, res) => {
        const gameCode = req.query.code;
        if (!gameCode) {
            return res.redirect('/');
        }
        
        const myLobby = await Game.findOne({ code: gameCode }).populate('whiteUser blackUser');
        if (!myLobby) {
            return res.redirect('/?error=invalidCode');
        }
    
        // no color assignment; just render game as a spectator.
        const whiteName = myLobby.whiteUser ? myLobby.whiteUser.username : 'N/A';
        const blackName = myLobby.blackUser ? myLobby.blackUser.username : 'N/A';
    
        res.render('game', {
            me: 'spectator',
            other: `White: ${whiteName}, Black: ${blackName}`,
            color: 'spectator', //indicative of spectator mode on client side
            isSpectator: true
        });
    });

    router.get('/white', async (req, res) => {
        const gameCode = req.query.code;

        if (!games[gameCode]) {
            return res.redirect('/');
        }

        const myLobby = await Game.findOne({code: gameCode}).populate('whiteUser blackUser');
        // whiteUser already set at creation time
        
        res.render('game', {
            me: myLobby.whiteUser.username, // use populated data
            other: myLobby.blackUser ? myLobby.blackUser.username : 'Joining...',
            color: 'white'
        });
    });

    router.get('/black', async (req, res) => {
        const gameCode = req.query.code;

        if (!games[gameCode]) {
            return res.redirect('/?error=invalidCode');
        }

        const myLobby = await Game.findOne({code: gameCode}).populate('whiteUser blackUser');
        if (!myLobby) {
            return res.redirect('/');
        }

        // if blackUser is already set, game is full
        if (myLobby.blackUser) {
            return res.redirect('/?error=gameFull');
        }

        myLobby.blackUser = req.session.user._id;
        await myLobby.save();
        await myLobby.populate('whiteUser blackUser');

        res.render('game', {
            me: myLobby.blackUser.username,
            other: myLobby.whiteUser.username,
            color: 'black'
        });
    });

    return router; 
};
