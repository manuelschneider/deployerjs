(function() {
  var dbConfig, info, netConfig, payload, runnerConf;

  process.on('uncaughtException', function(err) {
    console.error("ERROR: ", err.stack);
    return process.exit(1);
  });

  runnerConf = JSON.parse(require("fs").readFileSync(__dirname + "/runnerConf.json", "utf-8"));

  payload = require("./lib/index");

  netConfig = null;

  if (require("fs").existsSync(runnerConf.dirs.conf + "net.conf")) {
    netConfig = require("cson").parseSync(require("fs").readFileSync(runnerConf.dirs.conf + "net.conf", "utf-8"));
  }

  dbConfig = null;

  if (require("fs").existsSync(runnerConf.dirs.conf + "db.conf")) {
    dbConfig = require("cson").parseSync(require("fs").readFileSync(runnerConf.dirs.conf + "db.conf", "utf-8"));
  }

  info = JSON.parse(require("fs").readFileSync(__dirname + "/package.json"));

  if (process.argv[2]) {
    payload[process.argv[2]](runnerConf.dirs, info, netConfig, dbConfig);
  } else {
    payload.run(runnerConf.dirs, info, netConfig, dbConfig);
  }

}).call(this);

//# sourceMappingURL=../../testdriver/command/cronRunner.js.map

/*! deployerjs - v0.0.0 - 2015-09-07
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();