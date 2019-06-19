const Comm = require('../comm');
const GameStates = require('./states');

function StateMakeGuesses(Room) {
    'use strict';

    // ----- Global constants and vars --------------------

    let _guessed = 0;


    // ----- Public Functions --------------------

    function enterState(prevState) {
        switch (prevState) {
            case GameStates.WAIT_RESPONSES: {
                const it = Room.getIt();
                const activePlayers = Room.getActivePlayers();
                const users = Room.getUsers();
                const answerStructs = Room.getAnswerStructs();

                // get list of questions with random idxs
                _guessed = 0;
                answerStructs.length = 0;
                for (let i = 1; i < activePlayers.length; i++) {
                    const id = activePlayers[i];
                    answerStructs.push({
                        answer: users.get(id).getAnswer(),
                        player: id,
                        guess: undefined
                    });
                }

                for (let i = answerStructs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [answerStructs[i], answerStructs[j]] = [answerStructs[j], answerStructs[i]];
                }

                const answers = answerStructs.map(struct => struct.answer);
                // send answers to everyone
                Room.toRoom((user) => Comm.rpc(user, 'setAnswers', answers));

                // "it" guesses the answers
                it.guessAnswers(Room.getQuestionText());

                // everyone else watches
                Room.toRoom((user) => user.watchGuessing(it.getName(), Room.getQuestionText()), it.getId());

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
        //      revert to INITIAL_WAIT if necessary
        //      or start next round
        // else
        //      add to quit list

        if (Room.getIt().getId() === user.getId()) {
            Room.removeUserFromGame();

            if (!Room.hasEnoughToPlay())
                Room.changeState(GameStates.INITIAL_WAIT);
            else
                Room.changeState(GameStates.PICK_QUESTION);
            return;
        }

        if (Room.isOnWaitList(user))
            Room.removeUserFromGame(user);
        else
            Room.getQuitPlayers().push(user.getId());
    }

    function handleUserEvent(user, event, data) {
        switch (event) {
            case 'guessMade': {
                const id = user.getId();
                const answerStructs = Room.getAnswerStructs();

                Room.toRoom((user) => Comm.rpc(user, 'guessMade', data), id);
                answerStructs[data.answer].guess = data.player;
                if (++_guessed === answerStructs.length)
                    Room.changeState(GameStates.DISPLAY_CORRECT);

                return true;
            }
        }

        return false;
    }


    // ----- Private Functions --------------------


    // ----- Interface --------------------

    const This = Object.freeze({
        getState: () => GameStates.MAKE_GUESSES,

        enterState: enterState,
        leaveState: leaveState,
        userJoined: userJoined,
        userLeft: userLeft,
        handleUserEvent: handleUserEvent
    });
    return This;

}


module.exports = StateMakeGuesses;