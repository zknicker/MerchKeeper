const bigXml = require("big-xml");
var https = require("https");
var fs = require("fs");
const unzipper = require("unzipper");

var download = function (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https
        .get(url, function (response) {
            response.pipe(file);
            file.on("finish", function () {
                file.close(cb); // close() is async, call cb after close completes.
            });
        })
        .on("error", function (err) {
            // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
        });
};

const task = 3;
const file = "apc220513";
const xmlFile = file + ".xml";

// 1. Download zip
if (task == 1) {
    const url = "https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/" + file + ".zip";
    download(url, "download.xml", (param) => {
        console.log(param);
    });
}

// 2. Unzip the file
if (task == 2) {
    fs.createReadStream("download.zip")
        .pipe(unzipper.Parse())
        .on("entry", function (entry) {
            const fileName = entry.path;
            const type = entry.type; // 'Directory' or 'File'
            const size = entry.vars.uncompressedSize; // There is also compressedSize;
            if (type == "File" && fileName === xmlFile) {
                console.log("Found expected archive file: " + xmlFile);
                entry.pipe(fs.createWriteStream(xmlFile));
            } else {
                console.log("This is not the file I am looking for: " + fileName);
                entry.autodrain();
            }
        });
}

// 3. Parse the file
if (task == 3) {
    const reader = bigXml.createReader(xmlFile, /^(case-file)$/, { gzip: false });

    let trademarks = [];

    reader.on("record", function (record) {
        try {
            // IS CLOTHING TRADEMARK
            let clothingTrademark = false;

            const classifications = record.children?.find((rec) => rec.tag == "classifications");
            const classification = classifications?.children?.find((rec) => rec.tag == "classification");
            const usCodes = classification?.children?.filter((rec) => rec.tag == "us-code" && rec.text == "025");
            if (usCodes && usCodes.length > 0) {
                clothingTrademark = true;
            }

            // SERIAL NUMBER
            let serialNumber = "";
            serialNumberTag = record.children?.find((rec) => rec.tag == "serial-number");
            serialNumber = serialNumberTag.text;

            // CASE FILE HEADERS
            let filingDate = "";
            let registrationDate = "";
            let statusCode = "";
            let statusDate = "";
            let markIdentification = "";
            let type = "";

            const caseFileHeader = record.children?.find((rec) => rec.tag == "case-file-header");
            caseFileHeader?.children?.forEach((rec) => {
                if (rec.tag == "filing-date") filingDate = rec.text;
                if (rec.tag == "status-code") statusCode = rec.text;
                if (rec.tag == "status-date") statusDate = rec.text;
                if (rec.tag == "mark-identification") markIdentification = rec.text;
                if (rec.tag == "mark-drawing-code") type = rec.text.substring(0, 1);
                if (rec.tag == "registration-date") registrationDate = rec.text;
            });

            if (clothingTrademark) {
                trademarks.push({
                    serialNumber: serialNumber,
                    registrationDate: registrationDate,
                    markIdentification: markIdentification,
                    type: type,
                    filingDate: filingDate,
                    statusCode: statusCode,
                    statusDate: statusDate,
                });
            }
        } catch (e) {
            console.log("ERROR", e);
        }
    });

    reader.on("end", function () {
        console.log(trademarks);
        console.log(roughSizeOfObject(trademarks));
    });

    reader.on("error", function (err) {
        console.log(err);
    });
}

function getMemory() {
    return Object.entries(process.memoryUsage()).reduce((carry, [key, value]) => {
        return `${carry}${key}:${Math.round((value / 1024 / 1024) * 100) / 100}MB;`;
    }, "");
}

function roughSizeOfObject(object) {
    var objectList = [];
    var stack = [object];
    var bytes = 0;

    while (stack.length) {
        var value = stack.pop();

        if (typeof value === "boolean") {
            bytes += 4;
        } else if (typeof value === "string") {
            bytes += value.length * 2;
        } else if (typeof value === "number") {
            bytes += 8;
        } else if (typeof value === "object" && objectList.indexOf(value) === -1) {
            objectList.push(value);

            for (var i in value) {
                stack.push(value[i]);
            }
        }
    }
    return bytes;
}
