const Comm = require('./comm');
const Room = require('./room');
const QuestionBox = require('./questionBox');

'use strict';

// ----- Global constants and vars --------------------

const ID_LENGTH = 4;

const _rooms = new Map();
let _started = false;
let _io;
let _renderRoot = '';


// ----- Public Functions --------------------

function startup(io, renderRoot) {
    if (_started)
        throw Error('Game Master already started');

    _started = true;
    _io = io;
    _renderRoot = renderRoot;

    Comm.setRenderRoot(_renderRoot);

    /**
     * Socket.io event listener
     */

    io.on('connection', (socket) => {
        //console.log(socket.handshake.address);
        //console.log(socket.request.connection.remoteAddress);
        //console.log(socket.handshake.headers);
        userJoined(socket);
    });

}

function gameExists(id) {
    if (!_started)
        throw Error('Game Master not started');

    return _rooms.has(id);
}

function createRoom() {
    if (!_started)
        throw Error('Game Master not started');

    console.log('createRoom');
    const id = createRoomId();
    const r = new Room(id, gameMasterEventHandler, _io);
    _rooms.set(id, r);

    return id;
}

function getQuestion() {
    if (!_started)
        throw Error('Game Master not started');

    return QuestionBox.getRandomQuestions();
}


// ----- Private Functions --------------------

function createRoomId() {
    // valid characters
    const validGameIdChars = 'bcdfghjkprstvwxyz';

    let id;
    do {
        id = '';
        for (let i = 0; i < ID_LENGTH; i++)
            id += validGameIdChars[Math.floor(Math.random() * validGameIdChars.length)];
    } while (gameExists(id));

    return id;
}

function userJoined(socket) {
    const roomId = /([^\/]+$)/.exec(socket.handshake.headers.referer)[0].toLowerCase();
    if (!gameExists(roomId)) {
        const user = {getSocket: () => socket};
        Comm.notify(user, Comm.Notification.ERROR, 'Room not found or has already been closed');
        return;
    }

    const room = _rooms.get(roomId);
    room.addUser(socket);
}

function gameMasterEventHandler(room, event, data) {
    //console.log('REH:', roomId, event);
    switch (event) {
        case 'close':
            console.log('closing room ' + room.getId());
            _rooms.delete(room.getId());
            break;

        default:
            console.error('Unknown REH:', room.getId(), event);
    }
}


// ----- Interface --------------------

module.exports = {
    startup: startup,
    gameExists: gameExists,
    createRoom: createRoom,
    getQuestion: getQuestion
};
