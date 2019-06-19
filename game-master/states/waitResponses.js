const Comm = require('../comm');
const GameStates = require('./states');

function StateWaitResponses(Room) {
    'use strict';

    // ----- Global constants and vars --------------------


    // ----- Public Functions --------------------

    function enterState(prevState) {
        switch (prevState) {
            case GameStates.PICK_QUESTION: {
                // first user in array is "it"
                const it = Room.getIt();

                // tell "it" to wait for the responses
                it.waitForResponses();

                // everyone else sees the question and reply form
                Room.toRoom((user) => user.answerQuestion(Room.getQuestionText()), it.getId());

                Room.toRoom((user) => Comm.rpc(user, 'markPlayerReady', it.getId()));

                // TODO: timeout after 180 seconds
                // changeState(GameState.MAKE_GUESSES);

                return true;
            }
        }

        return false;
    }

    function leaveState(nextState) {

    }

    function userJoined(user) {
        Room.addToWaitList(user);
    }

    function userLeft(user) {
        // if user is It
        //      start next round
        // else if not It
        //      if the user already submitted an answer, put it on the "to quit" list
        //      if not, remove the user and revert to INITIAL_WAIT if necessary


        if (Room.getIt().getId() === user.getId()) {
            if (!Room.hasEnoughToPlay())
                Room.changeState(GameStates.INITIAL_WAIT);
            else
                Room.changeState(GameStates.PICK_QUESTION);

            return;
        }

        if (Room.isOnWaitList(user)) {
            Room.removeUserFromGame(user);
        } else {
            if (user.hasAnswered()) {
                Room.getQuitPlayers().push(user.getId());
            } else {
                Room.removeUserFromGame(user);

                if (!Room.hasEnoughToPlay()) {
                    Room.changeState(GameStates.INITIAL_WAIT);
                } else {
                    if (everyoneHasAnswered())
                        Room.changeState(GameStates.MAKE_GUESSES);
                }
            }
        }
    }

    function handleUserEvent(user, event, data) {
        switch (event) {
            case 'questionAnswered': {
                // send status update to user
                const id = user.getId();
                Room.toRoom((user) => Comm.rpc(user, 'markPlayerReady', id));

                // if everyone has answered, move on
                if (everyoneHasAnswered())
                    Room.changeState(GameStates.MAKE_GUESSES);

                return true;
            }
        }

        return false;
    }


    // ----- Private Functions --------------------

    function everyoneHasAnswered() {
        const activePlayers = Room.getActivePlayers();
        const users = Room.getUsers();

        for (let i = 1; i < activePlayers.length; i++) {
            if (!users.get(activePlayers[i]).hasAnswered())
                return false;
        }
        return true;
    }


    // ----- Interface --------------------

    const This = Object.freeze({
        getState: () => GameStates.WAIT_RESPONSES,

        enterState: enterState,
        leaveState: leaveState,
        userJoined: userJoined,
        userLeft: userLeft,
        handleUserEvent: handleUserEvent
    });
    return This;

}


module.exports = StateWaitResponses;