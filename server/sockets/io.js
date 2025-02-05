import Game from "../models/Game.js";

export const myIo = (io, games) => {
    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;
        let isSpectator = false;

        socket.on('move', function(move) {
            if (!isSpectator && currentCode) {
                io.to(currentCode).emit('newMove', move);
            }   
        });

        socket.on('updateGame', async (data) => {
            const { pgn, result } = data;
            const game = await Game.findOne({ code: currentCode });
            if (!game) {
                return socket.emit('error', 'Game not found');
            }
        
            game.pgn = pgn;
            game.gameResult = result;
            if (result !== 'undecided') {
                game.status = 'completed';
            }
        
            await game.save();
        });

        socket.on('spectateGame', async (code) => {
            currentCode = code;
            if (!games[currentCode]) {
                return socket.emit('error', 'Game not found');
            }
            else{
                games[currentCode].spectators = 0;
            }

            // retrieve 
            const gameDoc = await Game.findOne({ code: currentCode });
            if (!gameDoc) {
                socket.emit('error', 'Game not found');
                return;
            }

            isSpectator = true;
            socket.join(currentCode);
            games[currentCode].spectators++;

            socket.emit('currentState', {
                pgn: gameDoc.pgn || '',
                status: gameDoc.status,
                result: gameDoc.gameResult
            });
            
            io.to(currentCode).emit('spectatorsCount', games[currentCode].spectators);
        
            // use latest pgn and status to sync the spectator with the gamewith curr game state
            
        });

        socket.on('joinGame', async function(data) {
            currentCode = data;
            console.log('joining game', currentCode);
        
            // If games[currentCode] is missing or not an object, initialize it.
            if (!games[currentCode] || typeof games[currentCode] !== 'object') {
                games[currentCode] = { whiteUser: '', blackUser: '', spectators: 0 };
            }
        
            const game = await Game.findOne({ code: currentCode }).populate('whiteUser blackUser');
        
            if (!game) {
                return socket.emit('error', 'Game not found');
            }
        
            socket.join(currentCode);
            io.to(currentCode).emit('gameCode', currentCode);
        
            if (game.whiteUser && game.blackUser && game.status === 'in-progress' && games[currentCode].spectators === 0) {
                io.to(currentCode).emit('playerJoined', {
                    playerColor: 'black',
                    name: game.blackUser.username,
                    code: currentCode,
                    opp: game.whiteUser.username
                });
            }
        
            if (game.whiteUser && game.blackUser && game.status === 'waiting' && games[currentCode].spectators === 0) {
                game.status = 'in-progress';
                await game.save();
                io.to(currentCode).emit('startGame');
                io.to(currentCode).emit('playerJoined', {
                    playerColor: 'black',
                    name: game.blackUser.username,
                    code: currentCode,
                    opp: game.whiteUser.username
                });
            }
            
            console.log(games[currentCode]);
            console.log(currentCode);
            io.to(currentCode).emit('spectatorsCount', games[currentCode].spectators);
        });

        socket.on('resign', async function(data) {
            if (currentCode && !isSpectator) {
                const game = await Game.findOne({ code: currentCode });

                if (game && game.status === 'in-progress') {
                    game.status = 'completed';
                    game.gameResult = data.color === 'white' ? 'black' : 'white';
                    await game.save();

                    io.to(currentCode).emit('resign', data);
                }
            }
        });

        socket.on('disconnect', async function() {
            // disconnect as a spectator
            if (currentCode && isSpectator) {
                if (games[currentCode]) {
                    games[currentCode].spectators = Math.max(0, (games[currentCode].spectators || 1) - 1);
                    io.to(currentCode).emit('spectatorsCount', games[currentCode].spectators);
                }
            }

            // if a player disconnects mid-game
            if (currentCode && !isSpectator) {
                const game = await Game.findOne({ code: currentCode });
                if (game && game.status === 'in-progress') {
                    game.status = 'terminated';
                    await game.save();
                }
                io.to(currentCode).emit('gameOverDisconnect');
                // delete games[currentCode];
            }
        });
    });
};
