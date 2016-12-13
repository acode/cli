const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;

module.exports = {

  run: (pkg, type, callback) => {

    callback = callback || function() {};

    const PATH = process.env.PATH; // cache path
    const BACKGROUND = type && type[0] === '+';
    let bgproc = [];

    let scripts = pkg && pkg.stdlib && pkg.stdlib.scripts && pkg.stdlib.scripts[type];

    if (!scripts) {
      return callback();
    }

    let npmPathCommand = spawnSync('npm', ['bin']);
    let npmPath = npmPathCommand.stdout.toString().trim();
    process.env.PATH = npmPath + ':' + process.env.PATH;

    let cmds = scripts instanceof Array ? scripts : [scripts];
    for (let i = 0; i < cmds.length; i++) {
      let cmd = cmds[i].split(' ');
      if (!cmd.length) {
        continue;
      }
      if (BACKGROUND) {
        let n = i;
        let command = spawn(cmd[0], cmd.slice(1), {stdio: [0, null, null]});
        command.stdout.on('data', data => {
          data = (data || '').toString();
          data = data.split('\n').map(d => `[${type}${n ? ' ' + n : ''}] ${d}`).join('\n');
          process.stdout.write(data + '\n');
        });
        bgproc.push(command);
      } else {
        let command = spawnSync(cmd[0], cmd.slice(1), {stdio: [0, 1, 2]});
        if (command.status !== 0) {
          process.env.PATH = PATH;
          return callback(new Error(`Error running "${type}" script (${i})`));
        }
      }
    }

    bgproc.length && process.on('exit', () => bgproc.forEach(proc => proc.kill()));

    process.env.PATH = PATH;
    return callback();

  }

};
