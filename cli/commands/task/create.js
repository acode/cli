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

class TaskCreate extends Command {

  constructor() {

    super('task', 'create');

  }

  help() {

    return {
      description: 'Create a Scheduled Task from a StdLib service',
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
    let f = params.args[1];
    let version = (params.flags.v || params.vflags.version || [])[0] || 'latest';

    if (!service) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a service name`);
      console.log();
      return callback(null);
    }

    if (!f) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a function name`);
      console.log();
      return callback(null);
    }

    async.waterfall([
      async.apply(getServiceDetails, service, f, version),
      getTokens,
      promptQuestions,
    ], (err, results) => {

      let resource = new APIResource(host, port);
      let args = {
        name: results.name,
        library_token_id: results.library_token_id,
        service_id: results.service_id,
        function_name: results.function_name,
        frequency: convertFrequency(results.frequency),
        period: convertPeriod(results.period),
        period_offset: convertPeriodOffset(results.period_offset, results.weekly_period_offset),
        kwargs: results.kwargs,
      }

      console.log(args);

      resource.authorize(Credentials.read('ACCESS_TOKEN'));      
      resource.request('/v1/scheduled_tasks').create(args, (err, response) => {
      
        if (err) {
          return callback(err);
        }
      
        console.log(response)
        return callback(null);
      
      });
    });

  }

}

function getServiceDetails(service, f, version, callback) {

  let params = {
    username: service.split('/')[0],
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

    if (!response.data.length) {
      return callback(new Error('Could not find service'));
    }

    let selectedService;
    if (version === 'latest') {
      selectedService = response.data[response.data.length - 1];
    } else {
      selectedService = response.data[0];
    }

    let details = {
      service_id: selectedService.id,
      function_name: f,
    };

    try {
      details['fArgs'] = selectedService.definitions_json[f].params;
    } catch (error) {
      throw new Error('Could not find function');
    }

    return callback(null, details);

  });

}

function getTokens(prev, callback) {

  let resource = new APIResource(host, port);

  resource.authorize(Credentials.read('ACCESS_TOKEN'));
  resource.request('v1/dashboard/library_tokens').index({}, (err, response) => {

    if (err) {
      return callback(err);
    }

    if (!response.data.length) {
      return callback(new Error('You have no library tokens'));
    }

    prev.tokens = response.data.reduce((toks, current) =>{
      toks.push(current.token);
      return toks;
    }, []);

    return callback(null, prev);

  });

}

function promptQuestions(prev, callback) {

  let questions = prev.fArgs.reduce((prompts, arg, index) => {
    prompts.push({
      name: arg.name,
      type: 'input',
      message: `Enter param for argument ${arg.name} (type ${arg.type})`,
      argument: true,
    });
    return prompts;
  }, []);

  questions = questions.concat([{
    name: 'library_token_id',
    type: 'list',
    message: 'Pick a library token to use',
    choices: prev.tokens
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
      let maxOffset = convertPeriod(answers.period) / convertFrequency(answers.frequency) / 60;
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
    choices: hours,
    when: (answers) => answers.period === 'day' || answers.period === 'week'
  }, {
    name: 'name',
    type: 'input',
    message: 'Task name',
  }]);

  inquirer.prompt(questions, function(answers){

    answers['service_id'] = prev['service_id'];
    answers['function_name'] = prev['function_name'];
    answers['kwargs'] = {};
    
    for (let answer in answers) {
      if (['name','library_token_id', 'period', 'frequency', 'period_offset', 'weekly_period_offset', 'service_id', 'function_name', 'kwargs'].indexOf(answer) === -1) {
        answers['kwargs'][answer] = answers[answer];
        delete answers[answer];
      }
    }

    return callback(null, answers);
    
  });

}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = ['0:00 UTC', '1:00 UTC', '3:00 UTC', '4:00 UTC', '5:00 UTC', '6:00 UTC',
'7:00 UTC', '8:00 UTC', '9:00 UTC', '10:00 UTC', '11:00 UTC', '12:00 UTC',
'13:00 UTC', '14:00 UTC', '15:00 UTC', '16:00 UTC', '17:00 UTC', '18:00 UTC',
'19:00 UTC', '20:00 UTC', '21:00 UTC', '22:00 UTC', '23:00 UTC'];

function convertPeriod(period) {
  
  if (period === 'minute') {
    return 60;
  }
  if (period === 'hour') {
    return 3600;
  }
  if (period === 'day') {
    return 86400;
  }
  if (period === 'week') {
    return 604800;
  }

}

function convertPeriodOffset(periodOffset, weeklyPeriodOffset) {
  
  let offset = 0;

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

function convertFrequency(frequency) {

  if (frequency === 'once') return 1;
  if (frequency === 'twice') return 2;
  if (frequency === 'three times') return 3;
  if (frequency === 'four times') return 4;
  if (frequency === 'five times') return 5;
  if (frequency === 'six times') return 6;
  if (frequency === 'ten times') return 10;
  if (frequency === 'twelve times') return 12;
  if (frequency === 'fifteen times') return 15;
  if (frequency === 'twenty times') return 20;
  if (frequency === 'thirty times') return 30;
  
}


module.exports = TaskCreate;
