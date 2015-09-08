/**
 * Stub for Testdriver implementations. This is basically a helper for test-frameworks to run a deployer-js
 * appClass locally.
*/


(function() {
  var Testdriver;

  Testdriver = (function() {
    Testdriver.prototype._payload = null;

    Testdriver.prototype._tmpdirs = null;

    /**
     * create a new testdriver
     * @param  {dirname} payload   some directory with the payload-app structured as specified in the README.
    */


    function Testdriver(payload, logdir) {
      var buildId;
      if (logdir == null) {
        logdir = null;
      }
      this._payload = payload;
      if (this._payload.substring(this._payload.length - 1) !== "/") {
        this._payload += "/";
      }
      buildId = Math.round(Math.random() * 10000);
      if (logdir == null) {
        logdir = "/tmp/deployer.js_log_" + buildId;
      }
      this._tmpdirs = {
        app: "/tmp/deployer.js_app_" + buildId,
        conf: "/tmp/deployer.js_conf_" + buildId,
        data: "/tmp/deployer.js_data_" + buildId,
        tmp: "/tmp/deployer.js_tmp_" + buildId,
        log: logdir
      };
    }

    /**
     * do anything that might be required for setting up the scenery, eg starting a service, etc.
    */


    Testdriver.prototype.setUp = function() {
      var name, type, _ref;
      if (this._tmpdirs == null) {
        throw new Error("our tmpdirs are not available yet :|");
      }
      _ref = this._tmpdirs;
      for (type in _ref) {
        name = _ref[type];
        if (type === 'log') {
          continue;
        }
        if (require("fs").existsSync(name)) {
          throw new Error("something went wrong, tmpdir for " + type + " already exists! (" + name + ")");
        }
        require("fs").mkdirSync(name);
      }
      return true;
    };

    /**
     * do anything that might be required for tearing down the scenery, eg stopping a service, etc.
    */


    Testdriver.prototype.tearDown = function() {
      var name, type, _ref;
      if (this._tmpdirs == null) {
        return;
      }
      _ref = this._tmpdirs;
      for (type in _ref) {
        name = _ref[type];
        if (type === 'log') {
          continue;
        }
        if (require("fs").existsSync(name)) {
          require("wrench").rmdirSyncRecursive(name);
        }
      }
      if (require("fs").existsSync(this._tmpdirs.log)) {
        require("fs").unlinkSync(this._tmpdirs.log);
      }
      return true;
    };

    /**
     * acquiring information about how to use the app, this might be the path of an executable,
     * network-host and ports and so on.
     * @return {object}      an object specific to the appClass or 'null' if something went wrong and the
     *                       app cannot be used.
    */


    Testdriver.prototype.getInfo = function() {
      return {
        type: null,
        dirs: this._tmpdirs
      };
    };

    return Testdriver;

  })();

  module.exports = Testdriver;

}).call(this);

//# sourceMappingURL=../testdriver/Testdriver.js.map

/*! deployerjs - v0.0.0
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();