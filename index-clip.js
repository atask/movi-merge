var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    format = require('string-format'),
    readline = require('readline'),
    moment = require('moment'),
    copypaste = require('copy-paste');

var baseDir = path.join(__dirname, 'res'),
    dataRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.+\s+.+\s+.+\s+.+\s+stampa/g,
    columnRe = /\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+.*\s+(.*)\s+(.*)\s+.*\s+Descrizione: (.*) - Saldo Contabile: (.*) - Data Contabile: (.*) - Data Valuta: (.*)\s+/,
    dateFormat = 'DD/MM/YYYY',
    // array holding all movements
    movements = [],
    // index of movement hashes
    movementIndex = {},
    header = ['DUMMY', 'Causale', 'Importo', 'descrizione', 'Saldo contabile', 'Data contabile', 'Data valuta'],
    csvTemplate = '{5},{6},"{3}","{1}",{2},{4}\n',
    pageCount, quarterCount, pageTotal, pageData, rowCount, rowTotal,
    rowData, accountingDate, valueDate, description, action, amount, balance;

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
        console.info(format('{} had no entries... Wrong format?', fileName));
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
        }
    };
}

// detect clipboard data on 'Z' press
var stdin = process.stdin;
stdin.setRawMode( true );
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function(key) {
    if (key === 'z') {
        copypaste.paste(parseClipboard);
    }
});

// detect when quitting with CTRL-C
if (process.platform === "win32") {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on('SIGNIT', function() {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function() {
    // wrap it up and exit
    console.info('Exiting...');
    watcher.close();
    process.exit();
});
