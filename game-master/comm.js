const jade = require('jade');
const path = require('path');

function Comm() {
    'use strict';

    // ----- Global constants and vars --------------------

    const Notification = Object.freeze({
        REMOVE: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    });

    const _cbLambdaMap = new Map();

    let _renderRoot = '';


    // ----- Public Functions --------------------

    function setRenderRoot(renderRoot) {
        _renderRoot = renderRoot;
    }

    function render(user, template, args, cb) {
        const jadeFile = path.join(_renderRoot, template + '.jade');
        const render = jade.compileFile(jadeFile);
        const html = render(args);

        if (cb) {
            const lambda = (data) => {
                if (!cb(data))
                    user.getSocket().once('response', lambda);
                else
                    _cbLambdaMap.delete(user);
            };
            user.getSocket().once('response', lambda);

            _cbLambdaMap.set(user, lambda);
        }

        user.getSocket().emit('render', html);
    }

    function notify(user, type, msg) {
        user.getSocket().emit('notify', {type: type, message: msg});
    }

    function rpc(user, functionName, data) {
        user.getSocket().emit('rpc', {fnc: functionName, args: data});
    }

    function removeListener(user, cb) {
        if (_cbLambdaMap.has(user)) {
            user.getSocket().removeListener('response', _cbLambdaMap.get(user));
            _cbLambdaMap.delete(user);
        }
    }


    // ----- Private Functions --------------------


    // ----- Interface --------------------

    return {
        Notification: Notification,

        setRenderRoot: setRenderRoot,
        render: render,
        notify: notify,
        rpc: rpc,
        removeListener: removeListener
    };

}


module.exports = Comm();