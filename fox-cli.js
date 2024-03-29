#!/usr/bin/env node

var ejs = require('ejs')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var program = require('commander')
var readline = require('readline')
var sortedObject = require('sorted-object')

var MODE_0666 = parseInt('0666', 8)
var MODE_0755 = parseInt('0755', 8)

var _exit = process.exit
var pkg = require('./package.json')

var version = pkg.version

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit

// CLI

around(program, 'optionMissingArgument', function (fn, args) {
  program.outputHelp()
  fn.apply(this, args)
  return {args: [], unknown: []}
})

before(program, 'outputHelp', function () {
  // track if help was shown for unknown option
  this._helpShown = true
})

before(program, 'unknownOption', function () {
  // allow unknown options if help was shown, to prevent trailing error
  this._allowUnknownOption = this._helpShown

  // show help if not yet shown
  if (!this._helpShown) {
    program.outputHelp()
  }
})

program
  .name('fox')
  .version(version, '    --version')
  .usage('[options] [dir]')
  .option('    --git', 'add .gitignore')
  .option('-f, --force', 'force on non-empty directory')
  .parse(process.argv)

if (!exit.exited) {
  main()
}

/**
 * Install an around function; AOP.
 */
function around (obj, method, fn) {
  var old = obj[method]

  obj[method] = function () {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) args[i] = arguments[i]
    return fn.call(this, old, args)
  }
}

/**
 * Install a before function; AOP.
 */
function before (obj, method, fn) {
  var old = obj[method]

  obj[method] = function () {
    fn.call(this)
    old.apply(this, arguments)
  }
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */
function confirm (msg, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question(msg, function (input) {
    rl.close()
    callback(/^y|yes|ok|true$/i.test(input))
  })
}

/**
 * Copy file from template directory.
 */
function copyTemplate (from, to) {
  from = path.join(__dirname, 'templates', from)
  write(to, fs.readFileSync(from, 'utf-8'))
}

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */
function createApplication (name, path) {
  var wait = 5

  console.log()

  function complete () {
    if (--wait) return
    var prompt = launchedFromCmd() ? '>' : '$'

    console.log()
    console.log('   install dependencies:')
    console.log('     %s cd %s && npm install', prompt, path)
    console.log()
    console.log('   run the app:')

    if (launchedFromCmd()) {
      console.log('     %s SET DEBUG=%s:* & npm start', prompt, name)
    } else {
      console.log('     %s DEBUG=%s:* npm start', prompt, name)
    }

    console.log()
  }

  // JavaScript
  var app = loadTemplate('app.js')

  // App modules
  app.locals.modules = Object.create(null)
  app.locals.uses = []

  mkdir(path, function () {
    copyTemplate('env', path + '/.env')

    mkdir(path + '/models', function () {
      copyTemplate('models/User.js', path + '/models/User.js')
      complete()
    })

    mkdir(path + '/routes', function () {
      copyTemplate('routes/index.js', path + '/routes/index.js')
      copyTemplate('routes/users.js', path + '/routes/users.js')
      complete()
    })

    // package.json
    var pkg = {
      name: name,
      version: '0.1.0',
      private: true,
      scripts: {
        start: 'babel-node ./app.js',
      },
      dependencies: {
        'fox': '0.1.0-alpha.8',
        'core-decorators': '^0.20.0',
      },
      devDependencies: {
        'babel-node': '^6.5.3',
      },
    }

    // sort dependencies like npm(1)
    pkg.dependencies = sortedObject(pkg.dependencies)
    pkg.devDependencies = sortedObject(pkg.devDependencies)

    // write files
    write(path + '/package.json', JSON.stringify(pkg, null, 2) + '\n')
    write(path + '/app.js', app.render())

    if (program.git) {
      copyTemplate('gitignore', path + '/.gitignore')
    }

    complete()
  })
}

/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */
function createAppName (pathName) {
  return path.basename(pathName)
    .replace(/[^A-Za-z0-9.()!~*'-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase()
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */
function emptyDirectory (path, fn) {
  fs.readdir(path, function (err, files) {
    if (err && err.code !== 'ENOENT') throw err
    fn(!files || !files.length)
  })
}

/**
 * Graceful exit for async STDIO
 */
function exit (code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done () {
    if (!(draining--)) _exit(code)
  }

  var draining = 0
  var streams = [process.stdout, process.stderr]

  exit.exited = true

  streams.forEach(function (stream) {
    // submit empty write request and wait for completion
    draining += 1
    stream.write('', done)
  })

  done()
}

/**
 * Determine if launched from cmd.exe
 */
function launchedFromCmd () {
  return process.platform === 'win32' &&
    process.env._ === undefined
}

/**
 * Load template file.
 */
function loadTemplate (name) {
  var contents = fs.readFileSync(path.join(__dirname, 'templates', (name + '.ejs')), 'utf-8')
  var locals = Object.create(null)

  function render () {
    return ejs.render(contents, locals)
  }

  return {
    locals: locals,
    render: render,
  }
}

/**
 * Main program.
 */
function main () {
  // Path
  var destinationPath = program.args.shift() || '.'

  // App name
  var appName = createAppName(path.resolve(destinationPath)) || 'hello-world'

  // Generate application
  emptyDirectory(destinationPath, function (empty) {
    if (empty || program.force) {
      createApplication(appName, destinationPath)
    } else {
      confirm('destination is not empty, continue? [y/N] ', function (ok) {
        if (ok) {
          process.stdin.destroy()
          createApplication(appName, destinationPath)
        } else {
          console.error('aborting')
          exit(1)
        }
      })
    }
  })
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
function mkdir (path, fn) {
  mkdirp(path, MODE_0755, function (err) {
    if (err) throw err
    console.log('   \x1b[36mcreate\x1b[0m : ' + path)
    fn && fn()
  })
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */
function write (path, str, mode) {
  fs.writeFileSync(path, str, {mode: mode || MODE_0666})
  console.log('   \x1b[36mcreate\x1b[0m : ' + path)
}
