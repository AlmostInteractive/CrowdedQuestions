const mysql = require('mysql');

function QuestionBox() {
    'use strict';

    // ----- Global constants and vars --------------------

    const _pool = mysql.createPool({
        host: process.env.mysql_host || 'localhost',
        user: process.env.mysql_user,
        password: process.env.mysql_password,
        database: process.env.mysql_database,
        connectionLimit: 10,
        debug: false
    });

    let _questionIds;
    let _currCard = 0;

    init();

    // ----- Public Functions --------------------

    function getRandomQuestions(amt) {
        if (!amt)
            amt = 1;

        return new Promise((resolve, reject) => {
            _pool.getConnection(function (err, con) {
                if (err) {
                    console.error('MySQL connection error:', err);
                    return reject(err);
                }

                con.on('error', function(err) {
                    console.error('MySQL connection error(2):', err);
                    return reject(err);
                });

                const sql = 'call Questions_Get(?)';
                const qs = [];

                for (let i = 0; i < amt; i++) {
                    const id = _questionIds[_currCard++];
                    con.query(sql, [id], function (err, results, fields) {
                        qs.push(results[0][0].text);

                        if (qs.length === amt) {
                            con.release();
                            if (amt === 1)
                                resolve(qs[0]);
                            else
                                resolve(qs);
                        }
                    });
                }
            });
        });
    }


    // ----- Private Functions --------------------

    function init() {
        const sql = 'call Questions_GetAllIds()';
        _pool.query(sql, function (err, results, fields) {
            if (err) {
                console.log('err', err);
                throw new Error(err);
            }

            _questionIds = results[0].map(r => r['id']);
            shuffle();

            // shuffle box every 10 minutes
            setInterval(shuffle, 10 * 60 * 1000);
        });
    }

    function shuffle() {
        for (let i = _questionIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [_questionIds[i], _questionIds[j]] = [_questionIds[j], _questionIds[i]];
        }

        _currCard = 0;
    }


    // ----- Interface --------------------

    const This = Object.freeze({
        getRandomQuestions: getRandomQuestions
    });
    return This;

}


module.exports = QuestionBox();