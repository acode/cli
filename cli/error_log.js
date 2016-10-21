const chalk = require('chalk');

module.exports = (err) => {

  console.log();
  err.message && console.log(`${chalk.bold.red('Error: ')}${err.message}`);
  err.details && Object.keys(err.details).forEach(k => {
    let details = err.details[k];
    details = details instanceof Array ? details : [details];
    console.log(`  ${chalk.bold(k)}`);
    details.forEach(d => console.log(`    - ${d}`))
  });
  console.log();

};
