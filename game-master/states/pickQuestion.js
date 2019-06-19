const Comm = require('../comm');
const GameStates = require('./states');

function StatePickQuestion(Room) {
    'use strict';

    // ----- Global constants and vars --------------------


    // ----- Public Functions --------------------

    function enterState(prevState) {
        switch (prevState) {
            case GameStates.INITIAL_WAIT:
                Room.startNextRound();
                return true;

            case GameStates.WAIT_RESPONSES:
            case GameStates.DISPLAY_CORRECT:
                Room.addWaitingPlayers();

                // cycle "it"
                const activePlayers = Room.getActivePlayers();
                activePlayers.push(activePlayers.shift());

                Room.startNextRound();
                return true;
        }

        return false;
    }

    function leaveState(nextState) {

    }

    function userJoined(user) {
        const it = Room.getIt();
        Comm.rpc(user, 'setIt', it.getId());
        Room.addPlayerToGame(user);
        Room.toRoom((user) => Comm.render(user, 'waitForPlayer', {it: it.getName()}), it.getId());
    }

    function userLeft(user) {
        // must check before removing
        const wasIt = Room.getIt().getId() === user.getId();

        Room.removeUserFromGame(user);

        // If It quit or we don't have enough, to back to wait
        if (wasIt || !Room.hasEnoughToPlay())
            Room.changeState(GameStates.INITIAL_WAIT);
    }

    function handleUserEvent(user, event, data) {
        switch (event) {
            case 'questionSelected': {
                // handle question being selected
                Room.setQuestionText(data);
                Room.changeState(GameStates.WAIT_RESPONSES);
                return true;
            }
        }

        return false;
    }


    // ----- Private Functions --------------------


    // ----- Interface --------------------

    const This = Object.freeze({
        getState: () => GameStates.PICK_QUESTION,

        enterState: enterState,
        leaveState: leaveState,
        userJoined: userJoined,
        userLeft: userLeft,
        handleUserEvent: handleUserEvent
    });
    return This;

}


module.exports = StatePickQuestion;