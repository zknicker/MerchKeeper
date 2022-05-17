const bigXml = require("big-xml");

const reader = bigXml.createReader("./trademarktoday.xml", /^(case-file)$/, { gzip: false });

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

        // console.log({
        //     serialNumber: serialNumber,
        //     registrationDate: registrationDate,
        //     markIdentification: markIdentification,
        //     type: type,
        //     filingDate: filingDate,
        //     statusCode: statusCode,
        //     statusDate: statusDate,
        // });
    } catch (e) {
        console.log("ERROR", e);
    }
});

reader.on("end", function () {
    console.log("end", numClothingTrademarks);
});

reader.on("error", function (err) {
    console.log(err);
});

function getMemory() {
    return Object.entries(process.memoryUsage()).reduce((carry, [key, value]) => {
        return `${carry}${key}:${Math.round((value / 1024 / 1024) * 100) / 100}MB;`;
    }, "");
}
