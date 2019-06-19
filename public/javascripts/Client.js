/*global window*/
/*global document*/
/*global console*/
/*global google*/

var Game = Game || {};
Game.Client = (function ($) {
    'use strict';

    $(document).ready(function () {
        init();
    });


    // ----- Global constants and vars --------------------

    let _it;
    let _socket;
    let _players = new Map();
    let _answers;
    let _ansIdx;
    let _interval;

    // gross hack
    let _clickedButton;


    // ----- Public Functions --------------------

    function setGameId(id) {
        $('#gameIdValue').text(id);
    }

    function setIt(id) {
        _it = id;
    }

    function setPlayers(nameMap) {
        _players = new Map();
        Object.keys(nameMap).forEach(id => {
            _players.set(parseInt(id), nameMap[id]);
        });
        updateNames();
    }

    function addPlayer(data) {
        _players.set(parseInt(data.id), data.name);
        updateNames();
    }

    function removePlayer(id) {
        _players.delete(parseInt(id));
        updateNames();

        // in playing room?
        const table = $('#respondingPlayers');
        if (table.length > 0) {
            const pElem = $('#name_' + id);
            pElem.text(pElem.text() + ' - Left the game!');
        }
    }

    function setWaitingListEmpty() {
        const table = $('#respondingPlayers');
        table.empty();
        _players.forEach((name, id) => {
            if (id === _it)
                return;

            table.append('<tr><td><div id="marker_' + id + '" class="ready-up not-ready"></div></td><td id="name_' + id + '">' + name + '</td>');
        });
    }

    function markPlayerReady(id) {
        $('#marker_' + id).removeClass('not-ready').addClass('ready');
    }

    function setAnswers(answers) {
        _answers = answers;
        _ansIdx = 0;
    }

    function startGuessing() {
        $('#answer').text('"' + _answers[_ansIdx] + '"');

        $('#skip').click(e => {
            e.preventDefault();
            showNextAnswer();
        });

        _players.forEach((name, id) => {
            if (id === _it)
                return;

            const btn = $('<button id="' + id + '" class="choice">' + name + '</button>').click(e => {
                e.preventDefault();
                $(e.target).remove();

                // send event to server
                _socket.emit('makeGuess', {player: id, answer: _ansIdx});
                _answers[_ansIdx] = undefined;

                showNextAnswer();
            });
            $('#playerButtons').append(btn);
        });
    }

    function guessMade(data) {
        const playerId = data.player;
        const answerIdx = data.answer;
        // show guess in a list
        const cont = $('#guesses');
        const A = _answers[answerIdx];
        const name = _players.get(playerId);

        cont.append('<div class="guess">' + name + ' said "' + A + '"</div>');
    }

    function startTimer(seconds) {
        $('#timer').removeClass('hidden');
        $('#secondsLeft').text(seconds);

        _interval = setInterval(() => {
            $('#secondsLeft').text(--seconds);
            if (seconds <= 1)
                stopTimer();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(_interval);
        _interval = undefined;
    }


    // ----- Private Functions --------------------

    function init() {
        _socket = io();

        _socket.on('render', function (html) {
            $('#game').html(html);

            stopTimer();

            const responseForm = $('#response');
            if (responseForm.length > 0) {
                responseForm.submit(sendFormResponse);
            }

            _clickedButton = undefined;

            $(':button').click(function () {
                _clickedButton = this;
            });
        });

        _socket.on('notify', function (notification) {
            const div = $('#notification');
            div.removeClass('show');

            switch (notification.type) {
                case 1:
                    div.removeClass();
                    div.addClass('n_info');
                    break;
                case 2:
                    div.removeClass();
                    div.addClass('n_warning');
                    break;
                case 3:
                    div.removeClass();
                    div.addClass('n_error');
                    break;
                default:
                    return;
            }

            div.addClass('show');
            div.html(notification.message);
        });

        _socket.on('rpc', function (data) {
            Game.Client[data.fnc](data.args);
        });
    }

    function sendFormResponse(e) {
        e.preventDefault();
        const data = getFormData(e);

        _socket.emit('response', data);
        return false;
    }

    function getFormData(e) {
        const form = $(e.target);
        const unindexed_array = form.serializeArray();

        // if a button was used to submit the form, include the id:value of the button
        if (_clickedButton && _clickedButton.name && _clickedButton.value)
            unindexed_array.push({name: _clickedButton.name, value: _clickedButton.value});

        const indexed_array = {};

        $.map(unindexed_array, function (n, i) {
            indexed_array[n['name']] = n['value'];
        });

        return indexed_array;
    }

    function updateNames() {
        // in waiting room?
        const list = $('#playersInRoom');
        if (list.length > 0) {
            list.empty();
            _players.forEach((name, id) => {
                list.append('<li>' + name + '</li>');
            });

            if (_players.size < 3) {
                $('#start').addClass('hidden');
                $('#minimumRequired').removeClass('hidden');
            } else {
                $('#start').removeClass('hidden');
                $('#minimumRequired').addClass('hidden');
            }
        }
    }

    function showNextAnswer() {
        for (let i = 0; i < _answers.length; i++) {
            _ansIdx = (_ansIdx + 1) % _answers.length;
            if (_answers[_ansIdx] !== undefined) {
                $('#answer').text('"' + _answers[_ansIdx] + '"');
                break;
            }
        }
    }


    // ----- Interface --------------------

    return {
        setGameId: setGameId,
        setIt: setIt,
        setPlayers: setPlayers,
        addPlayer: addPlayer,
        removePlayer: removePlayer,

        setWaitingListEmpty: setWaitingListEmpty,
        markPlayerReady: markPlayerReady,
        setAnswers: setAnswers,
        startGuessing: startGuessing,
        guessMade: guessMade,
        startTimer: startTimer,
        stopTimer: stopTimer
    };

})(jQuery);