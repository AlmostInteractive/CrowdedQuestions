const Comm = require('./comm');
const QuestionBox = require('./questionBox');

function User(SOCKET, ID, ROOM_EVENT_HANDLER) {
    'use strict';

    // ----- Global constants and vars --------------------

    const Notification = Object.freeze({
        REMOVE: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    });

    let _name;
    let _questionOptions;
    let _answer;


    // ----- Public Functions --------------------

    function requestName() {
        Comm.render(This, 'requestName', {responseType: 'submitName'}, requestNameCallback);
    }

    function pickQuestion() {
        const args = {
            responseType: 'pickQuestion',
            questions: {}
        };

        QuestionBox.getRandomQuestions(3).then(Qs => {
            _questionOptions = Qs;
            let i = 0;
            Qs.forEach(Q => args.questions[i++] = Q);
            Comm.render(This, 'pickQuestion', args, pickQuestionCallback);
        });
    }

    function waitForResponses() {
        _answer = undefined;

        Comm.render(This, 'waitForResponses');
        Comm.rpc(This, 'setWaitingListEmpty');
    }

    function answerQuestion(Q) {
        _answer = undefined;

        const args = {
            responseType: 'answerQuestion',
            question: Q
        };

        Comm.render(This, 'answerQuestion', args, answerQuestionCallback);
        Comm.rpc(This, 'setWaitingListEmpty');
    }

    function guessAnswers(Q) {
        Comm.render(This, 'guessAnswers', {question: Q});
        Comm.rpc(This, 'startGuessing');

        SOCKET.on('makeGuess', data => {
            // communicate to room to alert other users
            ROOM_EVENT_HANDLER(This, 'guessMade', data);
        });
    }

    function watchGuessing(itName, Q) {
        Comm.render(This, 'watchGuessing', {guesser: itName, question: Q});
    }


    // ----- Private Functions --------------------

    function requestNameCallback(data) {
        if (data['response-type'] === 'submitName') {
            _name = data.name.trim().replace(/\s+/, ' ').toUpperCase();
            if (_name.length < 1 || _name.length > 16) {
                Comm.notify(This, Notification.ERROR, 'Invalid name');
                return false;
            }
            Comm.notify(This, Notification.REMOVE);

            // join game in progress
            ROOM_EVENT_HANDLER(This, 'joinGame');
            return true;
        }

        return false;
    }

    function pickQuestionCallback(data) {
        if (data['response-type'] === 'pickQuestion') {
            const idx = parseInt(data.choice);
            const Q = _questionOptions[idx];
            _questionOptions = undefined;

            ROOM_EVENT_HANDLER(This, 'questionSelected', Q);
            return true;
        }

        return false;
    }

    function answerQuestionCallback(data) {
        if (data['response-type'] === 'answerQuestion') {
            _answer = data.answer.trim().replace(/\s+/, ' ');
            if (_answer.length < 1) {
                Comm.notify(This, Notification.ERROR, 'Invalid response');
                return false;
            }
            Comm.notify(This, Notification.INFO, 'Answer submitted!');

            ROOM_EVENT_HANDLER(This, 'questionAnswered');
            return true;
        }

        return false;
    }


    // ----- Interface --------------------

    const This = Object.freeze({
        getSocket: () => SOCKET,
        getId: () => ID,
        getName: () => _name,
        setName: (name) => _name = name,
        hasAnswered: () => !!_answer,
        getAnswer: () => _answer,

        requestName: requestName,
        pickQuestion: pickQuestion,
        waitForResponses: waitForResponses,
        answerQuestion: answerQuestion,
        guessAnswers: guessAnswers,
        watchGuessing: watchGuessing
    });
    return This;

}


module.exports = User;