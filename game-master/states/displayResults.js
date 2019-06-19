const Comm = require('../comm');
const GameStates = require('./states');

function StateDisplayResults(Room) {
    'use strict';

    // ----- Global constants and vars --------------------

    const NEXT_ROUND_STARTS_IN = 15;


    // ----- Public Functions --------------------

    function enterState(prevState) {
        switch (prevState) {
            case GameStates.MAKE_GUESSES: {
                const users = Room.getUsers();

                const args = {
                    question: Room.getQuestionText(),
                    answers: Room.getAnswerStructs().map(struct => {
                        return {
                            answer: struct.answer,
                            player: users.get(struct.player).getName(),
                            guess: struct.guess === struct.player
                        };
                    })
                };

                Room.toRoom((user) => Comm.render(user, 'results', args));
                Room.toRoom((user) => Comm.rpc(user, 'startTimer', NEXT_ROUND_STARTS_IN));

                // remove all quit users
                const quitPlayers = Room.getQuitPlayers();
                quitPlayers.forEach(id => Room.removeUserFromGame(users.get(id)));
                quitPlayers.length = 0;

                // start new game in a while
                setTimeout(() => {
                    if (!Room.hasEnoughToPlay())
                        Room.changeState(GameStates.INITIAL_WAIT);
                    else
                        Room.changeState(GameStates.PICK_QUESTION);
                }, (NEXT_ROUND_STARTS_IN + 1) * 1000);

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
        Room.removeUserFromGame(user);
    }

    function handleUserEvent(user, event, data) {
        return false;
    }


    // ----- Private Functions --------------------


    // ----- Interface --------------------

    const This = Object.freeze({
        getState: () => GameStates.DISPLAY_CORRECT,

        enterState: enterState,
        leaveState: leaveState,
        userJoined: userJoined,
        userLeft: userLeft,
        handleUserEvent: handleUserEvent
    });
    return This;

}


module.exports = StateDisplayResults;