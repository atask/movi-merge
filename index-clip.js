var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    format = require('string-format'),
    readline = require('readline'),
    moment = require('moment'),
    copypaste = require('copy-paste');

var outFile = path.join(__dirname, 'out.csv'),
    dataRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.+\s+.+\s+.+\s+.+\s+stampa/g,
    columnRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.*\s+(.*)\s+(.*)\s+.*\s+Descrizione: (.*) - Saldo Contabile: (.*) - Data Contabile: (.*) - Data Valuta: (.*)\s+/,
    dateFormat = 'DD/MM/YYYY',
    // array holding all movements
    movements = [],
    // index of movement hashes
    movementIndex = {},
    csvHeader = '"Data contabile","Data valuta","Descrizione","Causale","Importo","Saldo contabile"\n';

function parseClipboard(err, data) {
    var pageData = data.match(dataRe);
    if (pageData !== null) {
        var addedMovements = [];
        pageData.forEach(function extractFromRow(row) {
            var movement = parseMovement(row.match(columnRe)),
                hash = movement.toHash();
            // add movement if not already stored
            if(!(hash in movementIndex)) {
                movements.push(movement);
                addedMovements.push(movement);
                movementIndex[hash] = true;
            }
        });
        console.info(format('Found {} entries -> Added {} new', pageData.length, addedMovements.length));
        addedMovements.forEach(function printMovement(movement) {
            console.info(format('\t{}: {}', movement.accountingDate.format(dateFormat), movement.action));
        });
    } else {
        console.info('No entries found in clipboard...');
    }
}

function parseMovement(reResult) {
    return {
        accountingDate: moment(reResult[5], dateFormat),
        valueDate: moment(reResult[6], dateFormat),
        description: reResult[3],
        action: reResult[1],
        // TODO: try and workout globalize.js for number editing
        amount: parseFloat(reResult[2].replace(',','.')),
        balance: parseFloat(reResult[4].replace(',','.')),

        toString: function() {
            return JSON.stringify(this);
        },

        toHash: function() {
            return crypto.createHash('md5').update(JSON.stringify(this)).digest('hex');
        },

        toCSV: function() {
            return format('{accountingDate},{valueDate},"{description}","{action}",{amount},{balance}\n', this);
        }
    };
}

function writeCsv(outPath) {
    fs.writeFileSync(outPath, csvHeader, { encoding: 'utf8' });
    movements.forEach(function appendMovement(movement) {
        fs.appendFileSync(outPath, movement.toCSV(), { encoding: 'utf8' });
    });
}

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
            console.info(format('{} movements written to {}', movements.length, outFile);

        case 'q':
            console.info('Quitting...');
            process.exit();
            break;
    }
});
