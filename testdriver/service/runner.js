(function() {
  var dbConfig, info, netConfig, payload, runnerConf, syslog;

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

  runnerConf.logConfig.name = info.name;

  syslog = new (require("bunyan")).createLogger(runnerConf.logConfig);

  if (process.argv[2]) {
    payload[process.argv[2]](runnerConf.dirs, info, syslog, netConfig, dbConfig);
  } else {
    payload.run(runnerConf.dirs, info, syslog, netConfig, dbConfig);
  }

  process.on("SIGINT", function() {
    syslog.info("shutting down...");
    payload.stop();
    return process.exit();
  });

  process.on("SIGHUP", function() {
    syslog.info("shutting down...");
    payload.stop();
    return process.exit();
  });

  process.on("SIGTERM", function() {
    syslog.info("shutting down...");
    payload.stop();
    return process.exit();
  });

}).call(this);

//# sourceMappingURL=../../testdriver/service/runner.js.map

/*! deployerjs - v0.0.0
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();