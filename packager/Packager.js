(function() {
  var Packager;

  Packager = (function() {
    Packager.prototype.payload = null;

    Packager.prototype.appClass = null;

    Packager.prototype.deploymentInfo = null;

    function Packager(payload, appClass, deploymentInfo) {
      this.payload = payload;
      this.appClass = appClass;
      this.deploymentInfo = deploymentInfo;
    }

    Packager.prototype["package"] = function(done, changelog) {
      return done(new Error("not yet implemented"));
    };

    return Packager;

  })();

  module.exports = Packager;

}).call(this);

//# sourceMappingURL=../packager/Packager.js.map

/*! deployerjs - v0.0.0
* https://github.com/manuelschneider/deployerjs
* Copyright (c) 2015 Manuel Schneider; All rights reserved. */require('source-map-support').install();