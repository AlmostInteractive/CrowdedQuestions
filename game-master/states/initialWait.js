const Comm = require('../comm');
const GameStates = require('./states');

function StateInitialWait(Room) {
    'use strict';

    // ----- Global constants and vars --------------------


    // ----- Public Functions --------------------

    function enterState(prevState) {
        switch (prevState) {
            case GameStates.WAIT_RESPONSES:
            case GameStates.PICK_QUESTION:
            case GameStates.MAKE_GUESSES:
            case GameStates.DISPLAY_CORRECT:
                Room.addWaitingPlayers();

                // Show waiting room to all players
                const status = {
                    responseType: 'startGame',
                    roomId: Room.getId()
                };
                Room.toRoom((user) => Comm.render(user, 'initialWait', status, startButtonCallback));

                // Send user list to all players
                const nameMap = {};
                const users = Room.getUsers();
                Room.getActivePlayers().forEach(id => { nameMap[id] = users.get(id).getName(); });
                Room.toRoom((user) => Comm.rpc(user, 'setPlayers', nameMap));

                return true;
        }

        return false;
    }

    function leaveState(nextState) {
        const users = Room.getUsers();
        Room.getActivePlayers().forEach(id => Comm.removeListener(users.get(id), startButtonCallback));
    }

    function userJoined(user) {
        // Show waiting room to new player

        const status = {
            responseType: 'startGame',
            roomId: Room.getId()
        };
        Comm.render(user, 'initialWait', status, startButtonCallback);

        Room.addPlayerToGame(user);
    }

    function userLeft(user) {
        Room.removeUserFromGame(user);
    }

    function handleUserEvent(user, event, data) {
        return false;
    }


    // ----- Private Functions --------------------

    function startButtonCallback(data) {
        if (data['response-type'] === 'startGame') {
            Room.changeState(GameStates.PICK_QUESTION);
            return true;
        }

        return false;
    }


    // ----- Interface --------------------

    const This = Object.freeze({
        getState: () => GameStates.INITIAL_WAIT,

        enterState: enterState,
        leaveState: leaveState,
        userJoined: userJoined,
        userLeft: userLeft,
        handleUserEvent: handleUserEvent
    });
    return This;

}


module.exports = StateInitialWait;