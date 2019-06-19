const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

loadNodeEnv();

const indexRouter = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 86400000}));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;


function loadNodeEnv() {
    let env;
    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i].startsWith('NODE_ENV='))
            env = process.argv[i].slice('NODE_ENV='.length);
    }

    const filename = '.env' + (env ? ('.' + env) : '');
    const fullPath = path.join(__dirname, filename);
    console.log('Loading env file:', fullPath);

    require('dotenv').config({path: fullPath});
}