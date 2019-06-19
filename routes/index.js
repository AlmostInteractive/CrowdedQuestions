const express = require('express');
const router = express.Router();
const GM = require('../game-master');


/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', {title: 'Play Crowded Questions'});
});

router.get('/local', (req, res, next) => {
    GM.getQuestion().then(Q => {
        res.render('local', {title: 'Local | Play Crowded Questions', question: Q});
    });
});

router.get('/next', (req, res, next) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0 max-age=0');
    GM.getQuestion().then(Q => {
        res.status(200).send(Q)
    }).catch((err) => {
        res.status(500).send(err)
    });
});

router.get('/online', (req, res, next) => {
    res.render('multi', {title: 'Multi | Play Crowded Questions'});
});

router.get('/host', (req, res, next) => {
    const roomId = GM.createRoom();
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0 max-age=0');
    res.redirect(307, '/game/' + roomId);
});

router.get('/game', (req, res, next) => {
    res.render('join', {title: 'Join | Play Crowded Questions'});
});

router.post('/game', (req, res, next) => {
    const gameId = req.body.gameId.trim().toLowerCase();
    const regex = /[a-z]{4}/gi;

    if (!regex.test(gameId)) {
        res.render('join', {title: 'Join | Play Crowded Questions', error: 'Invalid game id'});
        return;
    }

    res.redirect('/game/' + gameId);
});

router.get('/game/:gameId', (req, res, next) => {
    const gameId = req.params.gameId.toLowerCase();
    console.log('join game', gameId);
    const regex = /[a-z]{4}/g;
    if (!gameId || !regex.test(gameId)) {
        res.render('join', {title: 'Join | Play Crowded Questions', error: 'Invalid game id'});
        return;
    }

    if (!GM.gameExists(gameId)) {
        res.render('join', {title: 'Join | Play Crowded Questions', error: 'Unknown game id'});
        return;
    }

    res.render('game', {title: 'Multi | Play Crowded Questions'});
});

module.exports = router;
