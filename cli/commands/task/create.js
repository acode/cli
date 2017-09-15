'use strict';

const lib = require('lib');
const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

const chalk = require('chalk');
const inquirer = require('inquirer');
const async = require('async');

const path = require('path');
const fs = require('fs');

const host = 'api.polybit.com';
const port = 443;


const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = ['0:00 UTC', '1:00 UTC', '3:00 UTC', '4:00 UTC', '5:00 UTC', '6:00 UTC',
'7:00 UTC', '8:00 UTC', '9:00 UTC', '10:00 UTC', '11:00 UTC', '12:00 UTC',
'13:00 UTC', '14:00 UTC', '15:00 UTC', '16:00 UTC', '17:00 UTC', '18:00 UTC',
'19:00 UTC', '20:00 UTC', '21:00 UTC', '22:00 UTC', '23:00 UTC'];

const convertPeriod = {
  'minute': 60,
  'hour': 3600,
  'day': 86400,
  'week': 604800
};

const convertFrequency = {
  'once': 1,
  'twice': 2,
  'three times': 3,
  'four times': 4,
  'five times': 5,
  'six times': 6,
  'ten times': 10,
  'twelve times': 12,
  'fifteen times': 15,
  'twenty times': 20,
  'thirty times': 30
};

function convertPeriodOffset(periodOffset, weeklyPeriodOffset) {

  let offset = 0;

  if (!periodOffset && !weeklyPeriodOffset) {
    return offset;
  }

  if (weeklyPeriodOffset) {
    offset += 86400 * days.indexOf(weeklyPeriodOffset);
  }

  if (hours.indexOf(periodOffset) !== -1) {
    offset += 3600 * hours.indexOf(periodOffset);
  } else {
    offset += 3600 * periodOffset;
  }

  return offset;

}

function getServiceDetails(service, function_name, version, callback) {

  let params = {
    name: service,
    include_private: true,
  }

  if (version === 'latest') {
    params.latest = true;
  } else {
    params.version = version;
  }

  let resource = new APIResource(host, port);

  resource.authorize(Credentials.read('ACCESS_TOKEN'));
  resource.request('/v1/services').index(params, (err, response) => {

    if (err) {
      return callback(err);
    }

    let selectedService = response.data[0];

    let details = {
      service_id: selectedService.id,
      function_name: function_name,
    };

    if (selectedService.definitions_json[function_name] === undefined) {
      return callback(new Error(`Could not find function ${function_name} in service ${service}`));
    }

    details['fArgs'] = selectedService.definitions_json[function_name].params;

    return callback(null, details);

  });

}

function getTokens(callback) {

  let resource = new APIResource(host, port);

  resource.authorize(Credentials.read('ACCESS_TOKEN'));
  resource.request('v1/dashboard/library_tokens').index({}, (err, response) => {

    if (err) {
      return callback(err);
    }

    if (!response.data.length) {
      return callback(new Error('You have no library tokens'));
    }

    let tokens = response.data.reduce((tokens, current) => {
      tokens.push(current.id.toString());
      return tokens;
    }, []);

    return callback(null, tokens);

  });

}

function generateQuestions(tokens, serviceDetails) {

  let questions = [];

  if (serviceDetails.fArgs) {
    questions = serviceDetails.fArgs.reduce((prompts, arg, index) => {
      prompts.push({
        name: arg.name,
        type: 'input',
        message: `Enter param for argument ${arg.name} (type ${arg.type})`,
        argument: true,
      });
      return prompts;
    }, []);
  }

  questions = questions.concat([{
    name: 'library_token_id',
    type: 'list',
    message: 'Pick a library token to use',
    choices: tokens
  }, {
    name: 'period',
    type: 'list',
    message: 'Run service every: ',
    choices: ['minute', 'hour', 'day', 'week']
  }, {
    name: 'frequency',
    type: 'list',
    message: (answers) => `How ofter per ${answers.period}`,
    choices: ['once'],
    when: (answers) => answers.period === 'minute'
  }, {
    name: 'frequency',
    type: 'list',
    message: (answers) => `How ofter per ${answers.period}`,
    choices: ['once', 'twice', 'three times', 'four times', 'five times',
              'six times', 'ten times', 'twelve times', 'fifteen times',
              'twenty times', 'thirty times'],
    when: (answers) => answers.period === 'hour'
  }, {
    name: 'frequency',
    type: 'list',
    message: (answers) => `How ofter per ${answers.period}`,
    choices: ['once', 'twice', 'three times', 'four times', 'six times', 'twelve times'],
    when: (answers) => answers.period === 'day'
  }, {
    name: 'frequency',
    type: 'list',
    message: (answers) => `How ofter per ${answers.period}`,
    choices: ['once'],
    when: (answers) => answers.period === 'week'
  }, {
    name: 'period_offset',
    type: 'input',
    message: 'Starting at minute',
    validate: (value, answers) => {
      let offset = Number(value);
      let maxOffset = convertPeriod[answers.period] / convertFrequency[answers.frequency] / 60;
      if (Number.isInteger(offset) && (offset >= 0 && offset < maxOffset)) {
        return true;
      }
      return `Please enter an integer between 0 - ${maxOffset - 1} inclusive`;
    },
    when: (answers) => answers.period === 'hour'
  }, {
    name: 'weekly_period_offset',
    type: 'list',
    message: 'Starting on',
    choices: days,
    when: (answers) => answers.period === 'week'
  }, {
    name: 'period_offset',
    type: 'list',
    message: 'Starting at',
    choices: (answers) => {
      let maxOffset = hours.length / convertFrequency[answers.frequency];
      return hours.slice(0, maxOffset);
    },
    when: (answers) => answers.period === 'day'
  }, {
    name: 'period_offset',
    type: 'list',
    message: 'Starting at',
    choices: hours,
    when: (answers) => answers.period === 'week'
  }, {
    name: 'taskName',
    type: 'input',
    message: 'Task name',
    //default: 'My Task',
  }]);

  return questions;

}

class TaskCreate extends Command {

  constructor() {

    super('task', 'create');

  }

  help() {

    return {
      description: 'Creates a Scheduled Task from a StdLib service',
      args: [
        'service',
        'function',
      ],
      flags: {
        v: 'Service version (default lastest release)'
      },
      vflags: {
        version: 'Service version (default lastest release)'
      }
    };

  }

  run(params, callback) {

    let service = params.args[0];
    let function_name = params.args[1] || '';
    let version = (params.flags.v || params.vflags.version || [])[0] || 'latest';

    if (!service) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a service name`);
      console.log();
      return callback(null);
    }

    async.parallel([
      getTokens,
      getServiceDetails.bind(null, service, function_name, version)
    ], (err, results) => {

      if (err) {
        return callback(err);
      }

      let tokens = results[0];
      let service = results[1];

      inquirer.prompt(generateQuestions(tokens, service), (answers) => {

        let kwargs = {};
        for (let answer in answers) {
          if (['taskName','library_token_id', 'period', 'frequency', 'period_offset', 'weekly_period_offset', 'service_id', 'function_name', 'kwargs'].indexOf(answer) === -1) {
            kwargs[answer] = answers[answer];
          }
        }

        let params = {
          name: answers.taskName,
          library_token_id: answers.library_token_id,
          service_id: service.service_id,
          function_name: service.function_name,
          frequency: convertFrequency[answers.frequency],
          period: convertPeriod[answers.period],
          period_offset: convertPeriodOffset(answers.period_offset, answers.weekly_period_offset),
          kwargs: kwargs,
        }

        let resource = new APIResource(host, port);

        resource.authorize(Credentials.read('ACCESS_TOKEN'));
        resource.request('/v1/scheduled_tasks').create({}, params, (err, response) => {

          if (err) {
            return callback(err);
          }

          console.log();
          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`Task ${chalk.bold(params.name)} created`);
          console.log();

          return callback(null);

        });

      });

    });

  }

}

module.exports = TaskCreate;
