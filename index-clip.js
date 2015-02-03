var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    format = require('string-format'),
    readline = require('readline'),
    moment = require('moment'),
    copypaste = require('copy-paste'),
    linebyline = require('linebyline');

var outFile = path.join(__dirname, 'out.csv'),
    dataRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.+\s+.+\s+.+\s+.+\s+stampa/g,
    columnRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.*\s+(.*)\s+(.*)\s+(.*)\s+Descrizione: (.*) - Saldo Contabile: (.*) - Data Contabile: (.*) - Data Valuta: (.*)\s+/,
    csvRe = /(.*)\t(.*)\t"(.*)"\t"(.*)"\t(.*)\t(.*)\t"(.*)"/,
    dateFormatIng = 'DD/MM/YYYY',
    dateFormatCsv = 'DD/MM/YYYY',
    decimalSeparator = ',',
    // array holding all movements
    movements = [],
    // index of movement hashes
    movementIndex = {},
    csvHeader = '"Data contabile"\t"Data valuta"\t"Descrizione"\t"Causale"\t"Importo"\t"Saldo contabile"\n';

function parseClipboard(err, data) {
    var pageData = data.match(dataRe);
    if (pageData !== null) {
        var addedMovements = [];
        pageData.forEach(function extractFromRow(row) {
            var movement = parseIngMovement(row),
                hash = getMovementHash(movement);
            // add movement if not already stored
            if(!(hash in movementIndex)) {
                movements.push(movement);
                addedMovements.push(movement);
                movementIndex[hash] = true;
            }
        });
        console.info(format('Found {} entries -> Added {} new', pageData.length, addedMovements.length));
        addedMovements.forEach(function printMovement(movement) {
            console.info(format('\t{}: {}', movement.accountingDate.format(dateFormatIng), movement.action));
        });
    } else {
        console.info('No entries found in clipboard...');
    }
}

function parseIngMovement(row) {
    var data = row.match(columnRe),
        // TODO: looks like '.' is a thousand separator after all... get it managed 
        amount = (data[1] === 'ACCR. STIPENDIO-PENSIONE' || data[1] === 'ACCREDITO BONIFICO') ?
                 parseFloat(data[3].replace(',','.')) :
                 parseFloat(data[2].replace(',','.'));
    return {
        accountingDate: moment(data[6], dateFormatIng),
        valueDate: moment(data[7], dateFormatIng),
        description: data[4],
        action: data[1],
        // TODO: try to workout globalize.js for number editing
        amount: amount,
        balance: parseFloat(data[5].replace(',','.'))
    };
}

function parseCsvMovement(row) {
    var data = row.match(csvRe);
    return {
        accountingDate: moment(data[1], dateFormatCsv),
        valueDate: moment(data[2], dateFormatCsv),
        description: data[3],
        action: data[4],
        // TODO: try to workout globalize.js for number editing
        amount: parseFloat(data[5].replace(decimalSeparator, '.')),
        balance: parseFloat(data[6].replace(decimalSeparator, '.')),
        hash: data[7]
    };
}

function getMovementHash(movement) {
    return crypto.createHash('md5').update(JSON.stringify(movement)).digest('hex');
}

function getMovementCsv(movement) {
    var csvAccountingDate = movement.accountingDate.format(dateFormatCsv),
        csvValueDate = movement.valueDate.format(dateFormatCsv)
        csvAmount = movement.amount.toString().replace('.', decimalSeparator),
        csvBalance = movement.balance.toString().replace('.', decimalSeparator),
        csvDescription = sanitizeCsvString(movement.description),
        hash = getMovementHash(movement),
        csvTemplate = '{}\t{}\t"{}"\t"{}"\t{}\t{}\t"{}"\n';
    return format(csvTemplate, csvAccountingDate, csvValueDate, csvDescription, movement.action, csvAmount, csvBalance, hash);
}

function sanitizeCsvString(string) {
    var sanitized = string,
        pos = sanitized.lastIndexOf('"');
    while (pos != -1) {
        // if " is first character or single, double it
        if(pos === 0 || sanitized.charAt(pos - 1) === '"') {
            sanitized = sanitized.substring(0, pos) + '"' + sanitized.substring(pos);
        }
        pos = sanitized.lastIndexOf('"', pos - 1);
    }
    return sanitized;
}

function writeCsv(outPath) {
    fs.writeFileSync(outPath, csvHeader, { encoding: 'utf8' });
    // order movements by accounting date
    movements.sort(function compareMovements(movement, otherMovement) {
        var date = movement.accountingDate,
            otherDate = otherMovement.accountingDate;
        // don't touch anything if dates are equal
        if (date.isSame(otherDate)) {
            return 0;
        }
        return date.isBefore(otherDate) ? -1 : 1;
    });
    movements.forEach(function appendMovement(movement) {
        fs.appendFileSync(outPath, getMovementCsv(movement), { encoding: 'utf8' });
    });
}

function readCSV(inPath, callback) {
    var csv = linebyline(inPath);
        headerRead = false;
    csv.on('line', function parseLine(line) {
        // skip first line
        if (headerRead === false) {
            headerRead = true;
        } else {
            var movement = parseCsvMovement(line);
            movements.push(movement);
            movementIndex[movement.hash] = true;
        }
    });
    csv.on('error', callback);
    csv.on('end', callback);
}

function enableInput() {
    // detect clipboard data on 'Z' press
    var stdin = process.stdin;
    stdin.setRawMode( true );
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', function(key) {
        switch (key) {
            case 'v':
                copypaste.paste(parseClipboard);
                break;

            case 'd':
                writeCsv(outFile);
                console.info(format('{} movements written to {}', movements.length, outFile));
                break;

            case 'q':
                console.info('Quitting...');
                process.exit();
                break;
        }
    });
}

readCSV(outFile, enableInput);
