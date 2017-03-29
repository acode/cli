const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;

module.exports = {

  run: (pkg, type, subtype, data, callback) => {

    callback = callback || function() {};
    data = data || {};
    data = typeof data === 'object' ? data : {};

    const PATH = process.env.PATH; // cache path
    const BACKGROUND = type && type[0] === '+';
    let bgproc = [];

    let allScripts = pkg && pkg.stdlib && pkg.stdlib.scripts;

    if (!allScripts) {
      return callback();
    }

    let baseScripts = allScripts[type];
    let specificScripts = subtype ? allScripts[`${type}:${subtype}`] : null;

    let scripts = specificScripts || baseScripts;

    if (!scripts) {
      return callback();
    }

    let npmPathCommand = spawnSync(
      /^win/.test(process.platform) ? 'npm.cmd' : 'npm',
      ['bin']
    );
    let npmPath = npmPathCommand.stdout.toString().trim();
    let pathVar = npmPath + ':' + process.env.PATH;
    let envVars = {
      PATH: pathVar,
      FORCE_COLOR: 1,
      SUBTYPE: subtype,
    };
    envVars = Object.keys(data).reduce((envVars, key) => {
      envVars['DATA_' + key] = data[key];
      return envVars;
    }, envVars);

    let cmds = scripts instanceof Array ? scripts : [scripts];
    for (let i = 0; i < cmds.length; i++) {
      let cmd = cmds[i].split(' ');
      if (!cmd.length) {
        continue;
      }
      if (BACKGROUND) {
        let n = i;
        let command = spawn(
          cmd[0],
          cmd.slice(1),
          {
            stdio: [0, null, null],
            env: envVars
          }
        );
        command.stdout.on('data', data => {
          data = (data || '').toString();
          data = data.split('\n').map(d => `[${type}${n ? ' ' + n : ''}] ${d}`).join('\n');
          process.stdout.write(data + '\n');
        });
        command.stderr.on('data', data => {
          data = (data || '').toString();
          data = data.split('\n').map(d => `[${type}${n ? ' ' + n : ''}] ${d}`).join('\n');
          process.stdout.write(data + '\n');
        });
        bgproc.push(command);
      } else {
        let command = spawn(
          cmd[0],
          cmd.slice(1),
          {
            stdio: [0, 1, 2],
            env: envVars
          }
        );
        command.on('exit', (code) => {
          process.env.PATH = PATH;
          if (code) {
            return callback(new Error(`Error running "${type}" script (${code})`));
          }
          return callback();
        });
        return;
      }
    }

    bgproc.length && process.on('exit', () => bgproc.forEach(proc => proc.kill()));

    process.env.PATH = PATH;
    return callback();

  }

};
