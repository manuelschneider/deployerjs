(function() {
  var instance, _generateCert, _getGeneratedCertConfigs, _reset, _saveState;

  instance = null;

  _saveState = function(instance) {
    var cacheFile, state, _ref;
    cacheFile = "/tmp/deployerjs-grunt.state." + (instance._testdriver._payload.replace(/\//g, "_"));
    state = {
      dirs: instance._testdriver._tmpdirs,
      child: null,
      generatedCertConfigs: instance._testdriver._generatedCertConfigs
    };
    if (((_ref = instance._testdriver._child) != null ? _ref.pid : void 0) != null) {
      state.child = instance._testdriver._child.pid;
    }
    return require("fs").writeFileSync(cacheFile, JSON.stringify(state), "utf-8");
  };

  _reset = function(payload, dontRemoveLog) {
    var cacheFile, childActive, name, state, type, _ref;
    if (dontRemoveLog == null) {
      dontRemoveLog = false;
    }
    cacheFile = "/tmp/deployerjs-grunt.state." + (payload.replace(/\//g, "_"));
    if (require("fs").existsSync(cacheFile)) {
      state = JSON.parse(require('fs').readFileSync(cacheFile, "utf-8"));
      _ref = state.dirs;
      for (type in _ref) {
        name = _ref[type];
        if (type === 'log') {
          continue;
        }
        if (require("fs").existsSync(name)) {
          require("wrench").rmdirSyncRecursive(name);
        }
      }
      if (require("fs").existsSync(state.dirs.log) && !dontRemoveLog) {
        require("fs").unlinkSync(state.dirs.log);
      }
      if (state.child != null) {
        childActive = require("fs").existsSync("/proc/" + state.child) && (require("fs").readlinkSync("/proc/" + state.child + "/exe") === require("fs").readlinkSync("/proc/self/exe"));
        if (childActive) {
          process.kill(state.child);
        }
      }
      if (require("fs").existsSync(cacheFile)) {
        require("fs").unlinkSync(cacheFile);
      }
      return state.generatedCertConfigs;
    }
    return {};
  };

  _getGeneratedCertConfigs = function(payload) {
    var cacheFile, state;
    cacheFile = "/tmp/deployerjs-grunt.state." + (payload.replace(/\//g, "_"));
    if (require("fs").existsSync(cacheFile)) {
      state = JSON.parse(require('fs').readFileSync(cacheFile, "utf-8"));
      return state.generatedCertConfigs;
    }
    return {};
  };

  _generateCert = function(hostname) {
    var cert, e, name;
    name = Math.round(Math.random() * 10000);
    try {
      cert = require("selfsigned").generate([
        {
          name: "commonName",
          value: hostname
        }
      ]);
    } catch (_error) {
      e = _error;
      console.error("certificate error", e);
    }
    require("fs").writeFileSync("/tmp/deployerjs.ssl__generated_crt." + name, cert.cert, "utf-8");
    require("fs").writeFileSync("/tmp/deployerjs.ssl__generated_key." + name, cert["private"], "utf-8");
    return {
      key: "/tmp/deployerjs.ssl__generated_key." + name,
      crt: "/tmp/deployerjs.ssl__generated_crt." + name
    };
  };

  module.exports = function(grunt) {
    return grunt.registerTask("deploy", "deploy your app locally with deployer.js, valid args are setUp|tearDown; infos will be " + "written to .deployerjs.info.json", function(todo) {
      var cert, certname, generatedCertConfigs, options, toGenerate, _i, _len;
      options = this.options({
        payload: null,
        appClass: "command",
        logdir: null,
        cmdlink: null
      });
      if (options.payload == null) {
        throw new Error("deploy: invalid payload! (" + options + ")");
      }
      generatedCertConfigs = _getGeneratedCertConfigs(process.cwd() + "/" + options.payload);
      if (instance == null) {
        generatedCertConfigs = _reset(process.cwd() + "/" + options.payload, options.logdir != null);
        instance = new (require(__dirname + "/../Deployer"))(process.cwd() + "/" + options.payload, options.appClass, options.logdir, options.cmdlink);
      }
      toGenerate = instance._testdriver.getSslCertsToGenerate(instance._testdriver.getConfiguredHostname());
      for (_i = 0, _len = toGenerate.length; _i < _len; _i++) {
        cert = toGenerate[_i];
        if (generatedCertConfigs[cert] == null) {
          certname = cert;
          if (certname === 'default') {
            certname = instance._testdriver.getConfiguredHostname();
          }
          generatedCertConfigs[cert] = _generateCert(certname);
        }
      }
      instance._testdriver.setGeneratedSslCertConfigs(generatedCertConfigs);
      switch (todo) {
        case "setUp":
          instance.setUp();
          require("fs").writeFileSync(".deployerjs.info.json", JSON.stringify(instance.getInfo()), "utf-8");
          break;
        case "tearDown":
          instance.tearDown();
          if (require("fs").existsSync(".deployerjs.info.json")) {
            require("fs").unlinkSync(".deployerjs.info.json");
          }
      }
      return _saveState(instance);
    });
  };

}).call(this);

//# sourceMappingURL=../tasks/deploy.js.map

/*! deployerjs - v0.0.0
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();