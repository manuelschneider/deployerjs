(function() {
  var CommandDriver, ServiceDriver,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CommandDriver = require(__dirname + "/../command/index");

  ServiceDriver = (function(_super) {
    __extends(ServiceDriver, _super);

    ServiceDriver.prototype._child = null;

    function ServiceDriver(payload, logdir) {
      if (logdir == null) {
        logdir = null;
      }
      ServiceDriver.__super__.constructor.call(this, payload, logdir);
    }

    ServiceDriver.prototype.setUp = function() {
      var res, runnerConf;
      ServiceDriver.__super__.setUp.call(this);
      require("fs").writeFileSync(this._tmpdirs.app + "/index.js", require("fs").readFileSync(__dirname + "/runner.js"));
      require("fs").writeFileSync(this._tmpdirs.app + "/runner.js.map", require("fs").readFileSync(__dirname + "/runner.js.map"));
      runnerConf = JSON.parse(require("fs").readFileSync(this._tmpdirs.app + "/runnerConf.json", "utf-8"));
      runnerConf.dirs.log = this._tmpdirs.log;
      runnerConf.dirs.data = this._tmpdirs.data + "/";
      runnerConf.logConfig = {
        src: true,
        streams: [
          {
            level: 'debug',
            path: runnerConf.dirs.log
          }
        ]
      };
      require("fs").writeFileSync(this._tmpdirs.app + "/runnerConf.json", JSON.stringify(runnerConf));
      res = require("execSync").run("cd " + (require("shell-quote").quote([this._tmpdirs.app])) + "            && npm install 'git+https://github.com/manuelschneider/node-bunyan.git#master' --production");
      if (res !== 0) {
        throw new Error("could not install bunyan via npm!");
      }
      this._child = require("child_process").fork("" + this._tmpdirs.app + "/index.js", {
        detached: true
      });
      this._child.unref();
      return true;
    };

    ServiceDriver.prototype.tearDown = function() {
      if (this._child != null) {
        this._child.kill();
      }
      return ServiceDriver.__super__.tearDown.call(this);
    };

    ServiceDriver.prototype.getInfo = function() {
      var info;
      info = ServiceDriver.__super__.getInfo.call(this);
      info.type = "service";
      info.debugLog = this._tmpdirs.log;
      return info;
    };

    return ServiceDriver;

  })(CommandDriver);

  module.exports = ServiceDriver;

}).call(this);

//# sourceMappingURL=../../testdriver/service/index.js.map

/*! deployerjs - v0.0.0 - 2015-09-07
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();