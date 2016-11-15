'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const chalk = require('chalk');
const inquirer = require('inquirer');

let formatDigits = (num, figs) => {

  num = (parseInt(Math.max(num, 0)) || 0).toString();
  let zeroes = Math.max(figs - num.length, 0);
  return `${Array(zeroes + 1).join('0')}${num}`;

};

let formatDate = function(str) {

  let date = new Date(str);
  let months = 'January February March April May June July August September October November December'.split(' ');
  let ends = ['th', 'st', 'nd', 'rd', 'th'];

  let y = chalk.bold(date.getFullYear());
  let m = chalk.bold(months[date.getMonth()]);
  let d = chalk.bold(date.getDate());
  let e = chalk.bold(ends[d] || 'th');
  let hh = chalk.bold(formatDigits(date.getHours(), 2));
  let mm = chalk.bold(formatDigits(date.getMinutes(), 2));
  let ss = chalk.bold(formatDigits(date.getSeconds(), 2));
  let ms = chalk.bold(formatDigits(date.valueOf() % 1000, 3));

  return `${m} ${d}${e}, ${y} at ${hh}:${mm}:${ss}.${ms}`;

};

class UserCommand extends Command {

  constructor() {

    super('user');

  }

  help() {

    return {
      description: 'Retrieves (and sets) current user information',
      flags: {
        s: '<key> <value> Sets a specified key-value pair'
      },
      vflags: {
        set: '<key> <value> Sets a specified key-value pair',
        'new-password': 'Sets a new password via a prompt',
        'reset-password': '<email> Sends a password reset request for the specified e-mail address'
      }
    };

  }

  run(params, callback) {

    let host = 'api.polybit.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    // If resetting password
    if (params.vflags['reset-password']) {
      let resetEmail = params.vflags['reset-password'][0];
      return resource.request('v1/password_reset_requests').create({}, {email: resetEmail}, (err, response) => {

        if (err) {
          return callback(err);
        }

        console.log('Password reset e-mail sent. Check the inbox for ' + resetEmail + ' for more details.');
        return callback(null);

      });
    }

    if (params.vflags['new-password']) {
      return inquirer.prompt(
        [
          {
            name: 'old_password',
            type: 'password',
            default: '',
            message: 'Old Password'
          },
          {
            name: 'password',
            type: 'password',
            default: '',
            message: 'New Password'
          },
          {
            name: 'repeat_password',
            type: 'password',
            default: '',
            message: 'Repeat Password'
          }
        ],
        (promptResult) => {

          resource.request('v1/users').index({me: true}, (err, response) => {

            if (err) {
              return callback(err);
            }

            let user = response.data[0];
            if (!user) {
              return callback(new Error('We couldn\'t retrieve your user data. Try again shortly.'));
            }

            resource.request('v1/users').update(user.id, {}, promptResult, (err, response) => {

              if (err) {
                return callback(err);
              }

              let user = response.data[0];
              if (!user) {
                return callback(new Error('We couldn\'t change your password. Try again shortly.'));
              }

              return callback(null, 'Password changed successfully.');

            });

          });

        }
      );
    }

    let set = params.vflags.set || params.flags.s || [];
    let update = null;

    if (set.length) {
      update = {};
      update[set[0]] = set.slice(1).join(' ');
      if (update.password) {
        return callback(new Error('Please use --new-password to set your password'));
      }
    }

    let fnComplete = (user, callback) => {

      var len = 20;
      Object.keys(user).forEach(function(k) {
        var alen = Math.max(1, len - k.length + 1);
        console.log(k + ': ' + Array(alen).join(' ') + user[k]);
      });

      console.log();
      callback(null);

    };

    resource.request('v1/users').index({me: true}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let user = response.data[0];
      if (!user) {
        return callback(new Error('We couldn\'t retrieve your user data. Try again shortly.'));
      }

      if (!update) {
        return fnComplete(user, callback);
      }

      resource.request('v1/users').update(user.id, {}, update, (err, response) => {

        if (err) {
          return callback(err);
        }

        let user = response.data[0];
        if (!user) {
          return callback(new Error('We couldn\'t set your user data. Try again shortly.'));
        }

        fnComplete(user, callback);

      });

    });

  }

}

module.exports = UserCommand;
