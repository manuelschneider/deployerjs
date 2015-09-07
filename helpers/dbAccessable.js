#!/usr/bin/env node

var adminCreds = null;
if (typeof(process.argv[3]) === "string") {
    adminCreds = {
        "user": process.argv[3],
        "pw": process.argv[4]
    };
}
var migrator = new (require("simplemigration"))(
    JSON.parse(process.argv[2]),
    adminCreds
);

migrator.isAccessable(function (accessable) {
    if (accessable) {
        console.log("OK");
        process.exit(0);
    } else {
        migrator.createIfNotExists(function (err) {
            if (typeof(err) !== "undefined" && err !== null) {
                console.error(err);
                process.exit(1);
            }
            migrator.isAccessable(function (accessable) {
                if (accessable) {
                    console.log("OK");
                    process.exit(0);
                } else {
                    console.error("db is not accessable");
                    process.exit(1);
                }
            });
        });
    }
});