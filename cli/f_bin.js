#!/usr/bin/env node

var path = require('path');
var fs = require('fs');

var f = require('f');

var name = process.argv[2];
var argv = process.argv.slice(3).map(function(arg) {
  return arg.indexOf(' ') > -1 ? '"' + arg + '"' : arg;
});

if (fs.existsSync(path.join(process.cwd(), 'env.json'))) {
  process.env = require(path.join(process.cwd(), 'env.json')).dev || {};
} else {
  console.warn('Warning: no "env.json" detected');
  process.env = {};
}

// If period, use defaultFunction...
if (name === '.') {

  try {
    pkg = require(path.join(process.cwd(), 'package.json'));
  } catch (e) {
    throw new Error('Invalid package.json in this directory');
    return true;
  }

  if (!pkg.stdlib || !pkg.stdlib.defaultFunction) {
    throw new Error('No "defaultFunction" specified for service "' + pkg.name + '"');
    return true;
  }

  name = './' + pkg.stdlib.defaultFunction;

}

// If making a local call...
if (typeof name === 'string' && name[0] === '.') {

  if (name.substr(0, 2) !== './' || name.length <= 2) {
    throw new Error('Expecting path after "."');
    return true;
  }

  // Remove path
  name = name.substr(2);

  try {
    fnjson = require(path.join(process.cwd(), 'f', name, 'function.json'));
  } catch (e) {
    throw new Error('Invalid function.json in ' + path.join(process.cwd(), 'f', name));
    return true;
  }

  if (fnjson.name !== name) {
    throw new Error('Function name "' + name + '" does not match directory name "' + name + '"');
    return true;
  }

  try {
    fn = require(path.join(process.cwd(), 'f', name, 'index.js'));
  } catch (e) {
    console.error(e);
    throw new Error('No valid index.js in ' + path.join(process.cwd(), 'f', name));
    return true;
  }

  if (typeof fn !== 'function') {
    throw new Error('No valid function exported from ' + path.join(process.cwd(), 'f', name, 'index.js'));
    return true;
  }

  name = fn;

}

f(name, 'command')(argv.join(' '), function(err, response) {
  if (err) {
    return console.error(err);
  }
  console.log(response);
});
