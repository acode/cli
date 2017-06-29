/**
 * Use lib to call other functions from StdLib's registry, available at
 * (https://stdlib.com/search). For example, try lib.utils.reflect(callback) or
 * lib.utils.sms(toNumber, message, callback).
 */
const lib = require('lib');

/**
* A basic Hello World function
* @param {string} name Who you're saying hello to
* @returns {string}
*/
module.exports = (name = 'world', context, callback) => {

  callback(null, `hello ${name}`);

};
