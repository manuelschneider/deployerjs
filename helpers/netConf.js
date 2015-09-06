#!/usr/bin/env nodejs

if (!process.argv[2]) {
    console.log("  usage: netConf.js path/to/net.conf --(privileged-ports|list-portnames|list-ssl|hostname\n");
    process.exit(0);
}

var config = require('cson').parseSync(require('fs').readFileSync(process.argv[2], 'utf-8'));

if (!config || config instanceof Error) {
    throw new Error("could not read net.conf", config);
}

if (process.argv[3] === "--privileged-ports") {
    for (var key in config.ports.tcp) {
        if (config.ports.tcp[key] <= 1024) {
            console.log(config.ports.tcp[key]);
        }
    }
    for (key in config.ports.udp) {
        if (config.ports.udp[key] <= 1024) {
            console.log(config.ports.udp[key]);
        }
    }
    process.exit(0);
} else if (process.argv[3] === "--list-portnames") {
    for (var key in config.ports.tcp) {
        console.log(config.ports.tcp[key] + "/tcp " + key);
    }
    for (key in config.ports.udp) {
        console.log(config.ports.udp[key] + "/udp " + key);
    }
    process.exit(0);
} else if (process.argv[3] === "--list-ssl") {
    for (var key in config.ssl) {
        console.log(key + ": " + config.ssl[key].ca + " " + config.ssl[key].key + " " + config.ssl[key].crt);
    }
    process.exit(0);
} else if (process.argv[3] === "--hostname") {
    console.log(config.hostname);
    process.exit(0);
}

process.exit(1);
