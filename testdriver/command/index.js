(function() {
  var CommandDriver, Testdriver,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Testdriver = require(__dirname + "/../Testdriver");

  CommandDriver = (function(_super) {
    __extends(CommandDriver, _super);

    CommandDriver.prototype._netConfig = null;

    CommandDriver.prototype._dbConfig = null;

    CommandDriver.prototype._generatedCertConfigs = null;

    CommandDriver.prototype._license = null;

    function CommandDriver(payload, logdir) {
      if (logdir == null) {
        logdir = null;
      }
      CommandDriver.__super__.constructor.call(this, payload, logdir);
    }

    CommandDriver.prototype.setUp = function() {
      var cert, config, configuredPort, file, name, payloadContents, proto, requiredPorts, res, runnerConf, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      this._license = null;
      CommandDriver.__super__.setUp.call(this);
      if (!require("fs").existsSync(this._payload + "lib")) {
        throw new Error("your payload contains no lib/!");
      }
      require("wrench").copyDirSyncRecursive(this._payload + "lib", this._tmpdirs.app + "/lib");
      if (!require("fs").existsSync(this._payload + "conf")) {
        throw new Error("your payload contains no conf/!");
      }
      require("wrench").copyDirSyncRecursive(this._payload + "conf", this._tmpdirs.conf, {
        forceDelete: true
      });
      if (!require("fs").existsSync(this._payload + "package.json")) {
        throw new Error("your payload contains no package.json!");
      }
      require("fs").writeFileSync(this._tmpdirs.app + "/package.json", require("fs").readFileSync(this._payload + "package.json"));
      payloadContents = require("fs").readdirSync(this._payload);
      for (_i = 0, _len = payloadContents.length; _i < _len; _i++) {
        file = payloadContents[_i];
        if (file.substring(0, 7) === "LICENSE") {
          this._license = file;
          break;
        }
      }
      if (this._license == null) {
        throw new Error("your payload contains no LICENSE*!");
      }
      require("fs").writeFileSync(this._tmpdirs.app + ("/" + this._license), require("fs").readFileSync(this._payload + this._license));
      res = require("execSync").run("cd " + (this._shellquote(this._tmpdirs.app)) + " && npm install --production");
      if (res !== 0) {
        throw new Error("could not install npm deps!");
      }
      require("fs").writeFileSync(this._tmpdirs.app + "/index.js", "#!/usr/bin/env node\n" + require("fs").readFileSync(__dirname + "/runner.js"));
      require("fs").chmodSync(this._tmpdirs.app + "/index.js", '0777');
      require("fs").writeFileSync(this._tmpdirs.app + "/runner.js.map", require("fs").readFileSync(__dirname + "/runner.js.map"));
      require("fs").writeFileSync(this._tmpdirs.app + "/cronRunner.js", require("fs").readFileSync(__dirname + "/cronRunner.js"));
      require("fs").writeFileSync(this._tmpdirs.app + "/cronRunner.js.map", require("fs").readFileSync(__dirname + "/cronRunner.js.map"));
      runnerConf = JSON.stringify({
        dirs: {
          conf: this._tmpdirs.conf + "/",
          tmp: this._tmpdirs.tmp + "/"
        }
      });
      require("fs").writeFileSync(this._tmpdirs.app + "/runnerConf.json", runnerConf);
      if (require("fs").existsSync(this._tmpdirs.conf + "/net.conf")) {
        this._netConfig = require("cson").parseSync(require("fs").readFileSync(this._tmpdirs.conf + "/net.conf", "utf-8"));
        _ref = ['udp', 'tcp'];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          proto = _ref[_j];
          if (((_ref1 = this._netConfig.ports) != null ? _ref1[proto] : void 0) != null) {
            requiredPorts = [];
            _ref2 = this._netConfig.ports[proto];
            for (name in _ref2) {
              configuredPort = _ref2[name];
              if (configuredPort <= 1024) {
                configuredPort = 8000;
              }
              while (true) {
                res = require("execSync").run("test $(netstat -tuln                                       | grep " + (this._shellquote(proto)) + " | grep " + (this._shellquote(configuredPort)) + "                                       | wc -l)                                -eq 0");
                if (res === 0) {
                  this._netConfig.ports[proto][name] = configuredPort;
                  requiredPorts.push(configuredPort);
                  break;
                }
                configuredPort++;
                while (__indexOf.call(requiredPorts, configuredPort) >= 0) {
                  configuredPort++;
                }
              }
            }
          }
        }
        if (this._generatedCertConfigs != null) {
          _ref3 = this._generatedCertConfigs;
          for (cert in _ref3) {
            config = _ref3[cert];
            this._netConfig.ssl[cert] = config;
          }
        }
        require("fs").writeFileSync(this._tmpdirs.conf + "/net.conf", require("cson").stringifySync(this._netConfig), "utf-8");
      }
      if (require("fs").existsSync(this._tmpdirs.conf + "/db.conf")) {
        this._dbConfig = require("cson").parseSync(require("fs").readFileSync(this._tmpdirs.conf + "/db.conf", "utf-8"));
        require("wrench").copyDirSyncRecursive(this._payload + "dbMigrations", this._tmpdirs.app + "/dbMigrations");
        res = require("execSync").run(("cd " + this._tmpdirs.app + " &&") + (" " + __dirname + "/../../helpers/updateDb.js '" + (JSON.stringify(this._dbConfig)) + "'"));
        if (res !== 0) {
          throw new Error("could not prepare db!");
        }
      }
      return true;
    };

    CommandDriver.prototype.getInfo = function() {
      var info;
      info = CommandDriver.__super__.getInfo.call(this);
      info.type = "command";
      info.executable = this._tmpdirs.app + "/index.js";
      info.db = this._dbConfig;
      info.net = this._netConfig;
      info.license = this._tmpdirs.app + "/" + this._license;
      return info;
    };

    CommandDriver.prototype.getSslCertsToGenerate = function() {
      var content, name, netConfig, toGenerate, _ref;
      toGenerate = [];
      if (require("fs").existsSync(this._payload + "conf/net.conf")) {
        netConfig = require("cson").parseSync(require("fs").readFileSync(this._payload + "conf/net.conf", "utf-8"));
        if (netConfig.ssl != null) {
          _ref = netConfig.ssl;
          for (name in _ref) {
            content = _ref[name];
            if (content.crt == null) {
              toGenerate.push(name);
            }
          }
        }
      }
      return toGenerate;
    };

    CommandDriver.prototype.getConfiguredHostname = function() {
      var netConfig;
      if (require("fs").existsSync(this._payload + "conf/net.conf")) {
        netConfig = require("cson").parseSync(require("fs").readFileSync(this._payload + "conf/net.conf", "utf-8"));
        if (netConfig.hostname != null) {
          return netConfig.hostname;
        }
      }
      return "localhost";
    };

    CommandDriver.prototype.setGeneratedSslCertConfigs = function(certs) {
      return this._generatedCertConfigs = certs;
    };

    CommandDriver.prototype._shellquote = function(toquote) {
      return require("shell-quote").quote([toquote]);
    };

    return CommandDriver;

  })(Testdriver);

  module.exports = CommandDriver;

}).call(this);

//# sourceMappingURL=../../testdriver/command/index.js.map

/*! deployerjs - v0.0.0 - 2015-09-07
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();