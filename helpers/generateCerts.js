#!/usr/bin/env nodejs

if (!process.argv[2]) {
    console.log("  usage: netConf.js path/to/net.conf\n");
    process.exit(0);
}

var config = require('cson').parseSync(require('fs').readFileSync(process.argv[2], 'utf-8'));

if (!config || config instanceof Error) {
    throw new Error("could not read net.conf", config);
}

for (var key in config.ssl) {
    if (typeof(config.ssl[key].crt) === "string" && config.ssl[key].crt !== "" &&
    !require('fs').existsSync(config.ssl[key].crt)) {
        if (config.ssl[key].ca !== null) {
            console.log("cannot create a self-signed certificate with ca: " + key + "\n");
            continue;
        }
        console.log("generating self-signed cert '" + key + "'");
        var cert = null;
        if (key === "default") {
            cert = require("selfsigned").generate([{"name": "commonName", "value": config.hostname}]);
        } else {
            cert = require("selfsigned").generate([{"name": "commonName", "value": key}]);
        }
        require("fs").writeFileSync(config.ssl[key].crt, cert.cert, "utf-8");
        require("fs").writeFileSync(config.ssl[key].key, cert.private, "utf-8");
    }
}