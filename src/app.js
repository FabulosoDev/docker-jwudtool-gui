const express = require('express');
const morgan = require('morgan');
const mustache_express = require('mustache-express');
const path = require('path');
const fs = require('fs');
const filesize = require('filesize');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const PORT = 7878;
const STATIC_FILES_PATH = process.env.DATA_DIRECTORY ?? './data';
const COMMON_KEY = process.env.COMMON_KEY ?? '12345678901234567890123456789012';
const PUID = process.env.PUID ?? '1000';
const PGID = process.env.PGID ?? '100';

const app = express();

app.use('/css', express.static(path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free/css')));
app.use('/webfonts', express.static(path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free/webfonts')));
app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/jquery/dist')));

app.use('/css', express.static(path.join(__dirname, '/views/css')));

app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));

app.engine('html', mustache_express());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.get('/', function (req, res) {
  var dirs = flatten_games();
  res.render('index', {"dirs": dirs});
});
app.post('/compress', function(req, res) {
  jwudtool(req.body.filepath, '-compress', res);
});
app.post('/decompress', function(req, res) {
  jwudtool(req.body.filepath, '-decompress', res);
});
app.post('/extract', function(req, res) {
  jwudtool(req.body.filepath, '-extract all', res);
});
app.post('/decrypt', function(req, res) {
  jcdecrypt2(req.body.filepath, res);
});

app.listen(PORT, function () {
  console.log(`JWUDTool GUI listening on port ${PORT} serving files from ${STATIC_FILES_PATH}`);
});

function flatten_games() {
  const games = get_games();
  var flattend = [];
  Object.keys(games).forEach(function(root) {
    flattend.push({id: crypto.randomUUID(), root:root, games: games[root]})
  });
  return flattend;
}

function contains_title_tik(filepath) {
  let files = fs.readdirSync(filepath);
  return files.indexOf('title.tik') !== -1;
}

function get_games() {
  const walkSync = function(dir, filelist) {
    const files = fs.readdirSync(dir);
    files.forEach(function(file) {
      filepath = dir + '/' + file;
      const stat = fs.statSync(filepath);
      if (stat.isDirectory() && !contains_title_tik(filepath)) {
        filelist = walkSync(filepath, filelist);
      } else {
        let dirname = path.dirname(filepath).replace(STATIC_FILES_PATH + '/', '')
        let root = dirname.split("/", 1)[0];
        if (!filelist[root]) {
          filelist[root] = [];
        }
        filelist[root].push({
          filepath: filepath,
          cmd_extract: (path.extname(file).toLowerCase() === '.wud' || path.extname(file).toLowerCase() === '.wux'),
          cmd_compress: (path.extname(file).toLowerCase() === '.wud'),
          cmd_decompress: (path.extname(file).toLowerCase() === '.wux'),
          cmd_decrypt: (fs.statSync(filepath).isDirectory()),
          dir: dirname.replace(root + '/', ''),
          name: path.basename(filepath),
          size: filesize(stat.size)
        });
      }
    });
    return filelist;
  };
  return walkSync(STATIC_FILES_PATH, {});
}

async function jwudtool(filepath, command, res) {
  const jwudtool = `java -jar /jwudtool/JWUDTool-0.7.jar -commonKey ${COMMON_KEY} -in ${filepath} ${command}`;
  res.write(jwudtool);
  console.log(jwudtool);
  
  const jwudtoolProcess = spawn(jwudtool, {
    detached: true,
    shell: true,
    stdout: 'inherit',
    stderr: 'inherit'
  });
  jwudtoolProcess.stdout.on('data', function(data) {
    console.log(Buffer.from(data).toString());
  });
  jwudtoolProcess.stderr.on('data', function(data) {
    console.log(Buffer.from(data).toString());
  });
  jwudtoolProcess.on('close', function (code) {
    exec(`chown -R ${parseInt(PUID)}:${parseInt(PGID)} ${path.dirname(filepath)}`);
    console.log('Close: child process closed with code ' + code);
  });
}

async function jcdecrypt2(filepath, res) {
  const jcdecrypt2 = `java -jar /jcdecrypt2/jcdecrypt2.jar ${COMMON_KEY} ${filepath}`;
  res.write(jcdecrypt2);
  console.log(jcdecrypt2);
  
  const jcdecrypt2Process = spawn(jcdecrypt2, {
    detached: true,
    shell: true,
    stdout: 'inherit',
    stderr: 'inherit'
  });
  jcdecrypt2Process.stdout.on('data', function(data) {
    console.log(Buffer.from(data).toString());
  });
  jcdecrypt2Process.stderr.on('data', function(data) {
    console.log(Buffer.from(data).toString());
  });
  jcdecrypt2Process.on('close', function (code) {
    exec(`chown -R ${parseInt(PUID)}:${parseInt(PGID)} ${path.dirname(filepath)}`);
    console.log('Close: child process closed with code ' + code);
  });
}