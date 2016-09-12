'use strict';
const http = require('http');
const https = require('https');
const config = require('config');

let host = config.get('host');
let port = config.get('port');

module.exports = {
  f: (name) => {

    return function f(data, callback) {

      data = data || {};

      if (typeof data === 'string') {
        data = new Buffer(data);
      } else {
        let args = (data.args || []).map(v => JSON.stringify(v));
        let flags = Object.keys(data.flags || {}).reduce((arr, key) => {
          arr.push(`-${key}`);
          data.flags[key] = data.flags[key] instanceof Array ? data.flags[key] : [data.flags[key]];
          return arr.concat(data.flags[key].map(v => JSON.stringify(v)));
        }, []);
        let vflags = Object.keys(data.vflags || {}).reduce((arr, key) => {
          arr.push(`--${key}`);
          data.vflags[key] = data.vflags[key] instanceof Array ? data.vflags[key] : [data.vflags[key]];
          return arr.concat(data.vflags[key].map(v => JSON.stringify(v)));
        }, []);
        data = new Buffer(args.concat(flags, vflags).join(' '));
      }

      let req = [http, https][(port === 443) | 0].request({
        host: host,
        method: 'POST',
        port: port,
        path: '/' + name
      }, function (res) {

        var buffers = [];
        res.on('data', function (chunk) { buffers.push(chunk); });
        res.on('end', function () {

          let response = Buffer.concat(buffers);
          let contentType = res.headers['content-type'];

          if (contentType === 'application/json') {
            response = response.toString();
            try {
              response = JSON.parse(response);
            } catch(e) {
              response = null;
            }
          } else if (contentType.match(/^text\/.*$/i)) {
            response = response.toString();
          }

          if (((res.statusCode / 100) | 0) !== 2) {
            return callback(new Error(response));
          } else {
            return callback(null, response);
          }

        });

      });

      req.on('error', callback);
      req.write(data);
      req.end();

    };

  }
};
