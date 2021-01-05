
const http = require('http');
const https = require('https');

const uuid = require('uuid');
const Pusher = require('pusher-js');

class Registry {

  constructor (host, port, accessToken) {
    this.host = host;
    this.port = parseInt(port) || 0;
    this.accessToken = accessToken;
    this.http = this.port === 443 ? https : http;
    this.pusher = new Pusher('676bca06a7eb744a334f', {
      cluster: 'us3',
      forceTLS: true
    });
  }

  request (action, params, body, completeCallback, progressCallback) {

    let pusher = this.pusher;

    let completed = false;
    let callback = function () {
      completed = true;
      completeCallback.apply(this, arguments);
    };

    let performAction = function () {

      let uriString = Object.keys(params)
        .filter(function (key) {
          return params[key] !== undefined && params[key] !== null;
        })
        .map(function (key) {
          let value = params[key];
          value = typeof value === 'object'
            ? JSON.stringify(value)
            : value;
          return [encodeURIComponent(key), encodeURIComponent(value)].join('=');
        })
        .join('&');

      let req = this.http.request(
        {
          hostname: this.host,
          port: this.port,
          path: '/' + action + '?' + uriString,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Length': body ? body.byteLength : 0
          }
        },
        res => {
          let buffers = [];
          res.on('data', chunk => buffers.push(chunk));
          res.on('end', () => {
            let buffer = Buffer.concat(buffers);
            let text = buffer.toString();
            let json;
            let error;
            try {
              json = JSON.parse(text);
            } catch (e) {
              error = new Error('Could not ' + action + ', invalid response: "' + text +'"');
            }
            if (res.statusCode !== 200) {
              return callback(
                error
                  ? new Error(text)
                  : new Error(
                      json && json.error
                        ? json.error.message
                        : text
                    )
              );
            } else {
              return callback(null, json || buffer);
            }
          });
        }
      );
      req.on('error', error => {
        return callback(new Error('Could not ' + action + ' project: HTTP request failed'));
      })
      req.end(body)

    }.bind(this);

    if (progressCallback) {
      let lastIndex = 0;
      let messages = [];
      let channelId = uuid.v4();
      let channelName = 'registry@' + channelId;
      params.channel = channelId;
      let channel = pusher.subscribe(channelName);
      channel.bind('announce', function (data) {
        while (messages.length < data.index + 1) {
          messages.push(null);
        }
        messages[data.index] = data;
        let emptyIndex = messages.indexOf(null);
        emptyIndex = emptyIndex === -1
          ? messages.length
          : emptyIndex;
        if (!completed) {
          messages.slice(lastIndex, emptyIndex).forEach(function (data) {
            progressCallback(data);
          });
          lastIndex = emptyIndex;
        }
      });
      let active = false;
      setTimeout(function () {
        if (!active) {
          performAction();
          active = true;
        }
      }, 500);
      channel.bind('pusher:subscription_succeeded', function() {
        if (!active) {
          performAction();
          active = true;
        }
      });
    } else {
      performAction();
    }

  }

}

module.exports = Registry;
