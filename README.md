# cHessMate

## Overview

chessMate is a real-time chess web app that allows you to spectate games by joining said lobbies. It also keeps a log of the games you play against other players and you can access your personal history. Given the database and the way the application has been structured, the website is very scalable in terms of potential features that can be added to it (eg: ranking system, a set number of AI-powered (stockfish API) moves for each player to help in non-obvious/tricky situations to add another dimension to the strategic thinking).

### NetID: hm2957
### Name: Haad Mehboob

### Auth Form1
This is a collection of possible actions as an unauthenticated user. On this page, three options are selectable {Login, GoogleSign with Passport, Regiser}. {Pre-existing accounts to check Login -> (123412345, 123412345), (haadhaad1, haadhaad1)}
The Google sign only works with NYU Login right now. The current browser session needs to be logged in as NYU, and then the authentication goes through {avoiding paying for API Key [OAuth] because NYU org}.
The register form allows you to create an account. There are no particularly robust measures besides salting/hashing the password in the database. No email verification. {username.length >= 5 , password.length >= 7 suggested}

### Game Creation Form2
This is the main game creation/joining screen that is accessed via an authenticated session. Here, a player can either "Create Game", which generates a unique 4-letter code linked to the lobby, or "Join Game" by entering said code. The "Create Game" is defaulted to create the user as 'white' in the game (incentive for creating the game :p). The page also contains a "Spectate Game" section where you can enter the code for an existing game and it'll let you join the spectating session. When you join as a spectator, the players and spectators in the lobby can see a counter of "Spectator Count = n" given you're the n-th spectator, which is hidden in the absence of spectators. If a spectator joins the game later {moves have already been made}, the spectator will retrieve the Game object from the cloud which has a real-time update of the move sequence in PGN format. This string is used to set up the initial board with the Chessboard.js library so all parties viewing the game in a room are synchronized with the Atlas database. Once in a lobby, the spectator cannot interact with the pieces but only see them moving as players play their turns (as expected).

### History Search Form3
This form lets you search for a specific game based on the opponent's username, and filters the database displayed in "history".

### [filter_playedGames](https://github.com/zii-bee/ChessMate/blob/main/app.js#L207)
A HOF that retrieves playedGames for a user from a database and filters by the opponent name as per search string entered in the field.

### [Chess.js Constructor in index.js](https://github.com/zii-bee/ChessMate/blob/main/front/public/js/index.js#L5)
The constructor for the chess.js library's Chess instance.

### [Models Folder (Game.js, User.js)](https://github.com/zii-bee/ChessMate/blob/main/server/models)
Link to database models folder, containing User.js and Game.js.

## Optional Project Notes
- The application uses Socket.io for real-time game updates.
- The database is hosted on MongoDB Atlas.
- Google login requires the user’s browser session to be authenticated via NYU work Google account.
- The game auto-promotes a pawn to a queen for simplicity.


## Attributions

1. [Passport.js authentication docs](http://passportjs.org/docs) - Used for OAuth logic in `server/app.js`
2. [Chess.js](https://github.com/jhlywa/chess.js/blob/master/README.md) - Used to manage game logic/state.
3. [Chessboard.js](https://chessboardjs.com/docs) - Used to visualize the chessboard in `front/public/js/index.js`.

