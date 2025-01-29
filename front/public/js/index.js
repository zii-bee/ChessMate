// Game Code retrieved from chess.js and chessboard.js documentation

let gameHasStarted = false;
let board = null;
const game = new Chess();
const $status = $('#status');
const $pgn = $('#pgn');
let gameOver = false;
let gameResign = '';
let gameCode = null;


function getsetBoard() {
    board.position(game.fen());
    updateStatus();
}

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over or spectator
    if (playerColor === 'spectator') return false;
    if (game.game_over()) return false;
    if (!gameHasStarted) return false;
    if (gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    const theMove = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    };
    // see if the move is legal
    const move = game.move(theMove);

    // illegal move
    if (move === null) return 'snapback';

    socket.emit('move', theMove);
    console.log(gameCode);

    socket.emit('updateGame', {
        code: gameCode,
        pgn: game.pgn(),
        result: getGameResult()
    });

    updateStatus();
}

function getGameResult() {
    if (game.in_checkmate()) {
        return game.turn() === 'b' ? 'white' : 'black';
    } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        return 'draw';
    }
    return 'undecided';
}

socket.on('newMove', (move) => {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    let moveColor = 'White';
    
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;
    }
    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position';
    }
    else if (gameResign !== '') {
        status = `Game over, ${gameResign} resigned.`;
    }
    else if (gameOver) {
        status = 'Opponent disconnected, you win!';
    }
    else if (!gameHasStarted) {
        status = 'Waiting for black to join';
    }
    // game still on
    else {
        status = `${moveColor} to move`;
        // check?
        if (game.in_check()) {
            status += `, ${moveColor} is in check`;
        }
    }

    $status.html(status);
    $pgn.html(game.pgn());
}

const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('myBoard', config);
if (playerColor === 'black') {
    board.flip();
}
if (playerColor === 'spectator') {
    getsetBoard();
}

updateStatus();

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', urlParams.get('code'));
}

socket.on('resign', (data) => {
    gameOver = true;
    gameResign = data.color;
    updateStatus();
});

socket.on('playerJoined', (data) => {
    if (playerColor === 'white') {
        document.getElementById('theOpponent').textContent = data.name;
    }
});

socket.on('startGame', () => {
    gameHasStarted = true;
    // document.getElementById('gameCodeText').classList.add('hidden');
    // document.getElementById('gameCodeDisplay').classList.add('hidden');
    updateStatus();
});

socket.on('gameOverDisconnect', () => {
    gameOver = true;
    
    updateStatus();
});

socket.on('gameCode', (code) => {
    console.log('gameCode', code);
    gameCode = code;
    if (playerColor === 'white') {
        document.getElementById('gameCodeText').textContent = code;
    }
});

socket.on('currentState', (data) => {
    const { pgn, status, result } = data;

    if (pgn && pgn.trim().length > 0) {
        game.reset();
        game.load_pgn(pgn);
        board.position(game.fen());
    }

    // update gameHasStarted if the game is already ongoing or completed
    if (status === 'in-progress' || status === 'completed' || status === 'terminated') {
        gameHasStarted = true;
    }

    updateStatus();
});

socket.on('spectatorsCount', function(count) {
    const info = document.getElementById('spectatorsInfo');
    const countElem = document.getElementById('spectatorsCount');

    if (count > 0) {
        info.style.display = 'block';
        countElem.textContent = count;
    } else {
        info.style.display = 'none';
    }
});

