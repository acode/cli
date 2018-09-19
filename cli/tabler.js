const chalk = require('chalk');

function isDate (dt) {
  return dt instanceof Date ||
    dt.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}\w$/);
}

function zeroPad (n, l, s) {
  s = s === undefined ? '0' : s;
  n = n.toString();
  let delta = Math.max(0, l - n.length);
  return Array(delta + 1).join(s) + n;
}

function formatDate (dt) {
  dt = dt instanceof Date ? dt : new Date(dt);
  let months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov'.split(' ');
  let suffix = 'th st nd rd th th th th th th'.split(' ');
  let m = months[dt.getMonth()];
  let y = dt.getFullYear();
  let d = zeroPad(dt.getDate(), 2);
  let th = suffix[dt.getDate() % 10];
  let hh = zeroPad(dt.getHours(), 2);
  let mm = zeroPad(dt.getMinutes(), 2);
  let ss = zeroPad(dt.getSeconds(), 2);
  return `${m} ${d} ${y} ${hh}:${mm} UTC`;
}

module.exports = (fields, objects, consoleOutput, isOption) => {

  isOption = !!isOption;

  let sizes = fields.map(f => {
    let rowSizes = [f.length].concat(
      objects.map(o => {
        if (!o) {
          return 0;
        } else {
          let val = o[f];
          val = Array.isArray(val) ? val[0] : val;
          val = isDate(val) ? formatDate(val) : val;
          return val.toString().length;
        }
      })
    );
    return Math.max.apply(null, rowSizes);
  });

  let delims = {
    vertical: ['┬', '│', '┴'],
    horizontal: ['├', '─', '┤'],
    top: ['┌', '┐'],
    bottom: ['└', '┘'],
    cross: ['┼']
  };

  let headerFormat = h => h;

  if (consoleOutput) {
    for (key in delims) {
      delims[key] = delims[key].map(s => chalk.dim(s));
    }
    headerFormat = h => chalk.dim(h);
  }

  let result = [
    {
      name: delims.top[0] + fields.map((f, i) => Array(sizes[i] + 3).join(delims.horizontal[1])).join(delims.vertical[0]) + delims.top[1],
      value: null
    },
    {
      name: delims.vertical[1] + fields.map((f, i) => ' ' + headerFormat(f) + Array(sizes[i] - f.length + 1).join(' ') + ' ').join(delims.vertical[1]) + delims.vertical[1],
      value: null
    },
    {
      name: delims.horizontal[0] + fields.map((f, i) => Array(sizes[i] + 3).join(delims.horizontal[1])).join(delims.cross[0]) + delims.horizontal[2],
      value: null
    }
  ].concat(
    objects.map((o, i) => {
      if (!o) {
        return {
          name: delims.horizontal[0] + fields.map((f, i) => Array(sizes[i] + 3).join(delims.horizontal[1])).join(delims.cross[0]) + delims.horizontal[2],
          value: null
        };
      } else {
        return {
          name: delims.vertical[1] + fields.map((f, i) => {
            let val = o[f];
            let fmt = v => v;
            if (Array.isArray(val)) {
              fmt = val[1];
              val = val[0];
            }
            val = val.toString();
            val = isDate(val) ? formatDate(val) : val;
            return ' ' + fmt(val) + Array(sizes[i] - val.length + 1).join(' ') + ' '
          }).join(delims.vertical[1]) + delims.vertical[1],
          value: o
        }
      }
    }),
    {
      name: delims.bottom[0] + fields.map((f, i) => Array(sizes[i] + 3).join(delims.horizontal[1])).join(delims.vertical[2]) + delims.bottom[1],
      value: null
    }
  );

  return isOption ? result : result.map(r => r.name).join('\n');

};
