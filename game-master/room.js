const Comm = require('./comm');
const User = require('./user');
const GameStates = require('./states/states');

function Room(ROOM_ID, GM_EVENT_HANDLER, IO) {
    'use strict';

    // ----- Global constants and vars --------------------


    const _users = new Map();
    //const _ipUserMap = new Map();
    const _activePlayers = [];
    const _waitingPlayers = [];
    const _quitPlayers = [];
    const _answerStructs = [];

    let _nextId = 1;
    let _state;
    let _questionText;
    let _guessed = 0;


    // ----- Public Functions --------------------

    function addUser(socket) {
        //const ip = socket.request.connection.remoteAddress;

        const user = new User(socket, _nextId++, roomEventHandler);
        _users.set(user.getId(), user);

        registerRPCs(user);

        // set game id
        Comm.rpc(user, 'setGameId', ROOM_ID);

        // Get user name
        user.requestName();
    }

    function toRoom(fnc, exceptId) {
        _activePlayers.forEach(id => {
            if (exceptId && id === exceptId)
                return;

            fnc(_users.get(id));
        });
    }

    function changeState(to) {
        // clear any notifications
        _activePlayers.forEach(id => {
            Comm.notify(_users.get(id), Comm.Notification.REMOVE);
        });

        let nextState;

        switch (to) {
            case GameStates.INITIAL_WAIT:
                nextState = require('./states/initialWait')(This);
                break;

            case GameStates.PICK_QUESTION:
                nextState = require('./states/pickQuestion')(This);
                break;

            case GameStates.WAIT_RESPONSES:
                nextState = require('./states/waitResponses')(This);
                break;

            case GameStates.MAKE_GUESSES:
                nextState = require('./states/makeGuesses')(This);
                break;

            case GameStates.DISPLAY_CORRECT:
                nextState = require('./states/displayResults')(This);
                break;

            default:
                throw new Error('Changing to unknown state: ' + to);
        }

        _state.leaveState(to);
        if (!nextState.enterState(_state.getState()))
            throw new Error('Failed to enter state: ' + _state.getState() + ' -> ' + to);

        _state = nextState;
    }

    function addPlayerToGame(user) {
        const userId = user.getId();
        const userName = user.getName();

        _activePlayers.push(userId);

        // Send user list to new player
        const nameMap = {};
        _activePlayers.forEach(id => { nameMap[id] = _users.get(id).getName(); });
        Comm.rpc(user, 'setPlayers', nameMap);

        // Send new player name to everyone else
        toRoom((user) => Comm.rpc(user, 'addPlayer', {id: userId, name: userName}), userId);
    }

    function removeUserFromGame(user) {
        const id = user.getId();

        let idx = _activePlayers.indexOf(id);
        if (idx >= 0) {
            _activePlayers.splice(idx, 1);
            toRoom((user) => Comm.rpc(user, 'removePlayer', id), id);
        }

        idx = _waitingPlayers.indexOf(id);
        if (idx >= 0)
            _waitingPlayers.splice(idx, 1);

        _users.delete(id);
    }

    function startNextRound() {
        // first user in array is "it"
        const it = _users.get(_activePlayers[0]);

        toRoom((user) => Comm.rpc(user, 'setIt', it.getId()));

        // send "it" 3 questions
        it.pickQuestion();

        // everyone else waits
        toRoom((user) => Comm.render(user, 'waitForPlayer', {it: it.getName()}), it.getId());
    }

    function addToWaitList(user) {
        _waitingPlayers.push(user.getId());
        Comm.render(user, 'waitToJoin');
    }

    function addWaitingPlayers() {
        // add all waiting users
        _waitingPlayers.forEach(id => addPlayerToGame(_users.get(id)));
        _waitingPlayers.length = 0;
    }


    // ----- Private Functions --------------------

    function registerRPCs(user) {
        const socket = user.getSocket();

        socket.on('disconnect', () => {
            console.log('user ' + user.getId() + ' ' + user.getName() + ' disconnected');

            // remove user differently for each state
            userLeft(user);

            if (_users.size === 0) {
                GM_EVENT_HANDLER(This, 'close');
            }
        });
    }

    function roomEventHandler(user, event, data) {
        // events we handle at the room level
        switch (event) {
            case 'joinGame':
                tryJoinGame(user);
                return;
        }

        // events we handle at the state level
        if (!_state.handleUserEvent(user, event, data))
            throw new Error('Unknown user event for state: ' + _state.getState() + ', ' + event + ': ' + data);
    }

    function tryJoinGame(user) {
        const userId = user.getId();
        let userName = user.getName();
        //console.log('tryToJoinGame', userId, userName, _state.getState());

        // verify name is unique
        let unique = true;
        let uniqueIter = 2;
        do {
            unique = true;
            _activePlayers.concat(_waitingPlayers).forEach(id => {
                const U = _users.get(id);
                if (U.getName().toLowerCase() === userName.toLowerCase())
                    unique = false;
            });

            if (!unique)
                userName = user.getName() + ' (' + uniqueIter++ + ')';
        } while (!unique);

        if (uniqueIter !== 2)
            user.setName(userName);

        _state.userJoined(user);
    }

    function userLeft(user) {
        console.log('User Left: ', user.getId(), user.getName());
        _state.userLeft(user);
    }


    // ----- Interface --------------------

    const This = Object.freeze({
        getId: () => ROOM_ID,
        getActivePlayers: () => _activePlayers,
        getQuitPlayers: () => _quitPlayers,
        getUsers: () => _users,
        getIt: () => _users.get(_activePlayers[0]),

        getQuestionText: () => _questionText,
        setQuestionText: (val) => { _questionText = val; },

        getAnswerStructs: () => _answerStructs,

        hasEnoughToPlay: () => _activePlayers.length >= 3,
        isOnWaitList: (user) => _waitingPlayers.indexOf(user.getId()) !== -1,

        addUser: addUser,
        changeState: changeState,
        addPlayerToGame: addPlayerToGame,
        removeUserFromGame: removeUserFromGame,
        startNextRound: startNextRound,
        toRoom: toRoom,
        addToWaitList: addToWaitList,
        addWaitingPlayers: addWaitingPlayers
    });

    (function constructor() {
        _state = require('./states/initialWait')(This);
    })();

    return This;

}


module.exports = Room;