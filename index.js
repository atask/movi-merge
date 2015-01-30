var fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    chokidar = require('chokidar'),
    readline = require('readline');

var baseDir = path.join(__dirname, 'res'),
    dataRe = /\d{2}\/\d{2}\/\d{4}\n\d{2}\/\d{2}\/\d{4}\n.*\n.*\n.*\n.*\n.*\n\nstampa/g,
    columnRe = /\d{2}\/\d{2}\/\d{4}\n\d{2}\/\d{2}\/\d{4}\n.*\n(.*)\n(.*)\n.*\nDescrizione: (.*) - Saldo Contabile: (.*) - Data Contabile: (.*) - Data Valuta: (.*)\n/,
    //header = ['Data contabile', 'Data valuta', 'Descrizione', 'Causale', 'Importo', 'Saldo contabile'],
    header = ['DUMMY', 'Causale', 'Importo', 'descrizione', 'Saldo contabile', 'Data contabile', 'Data valuta'],
    csvTemplate = '{5}${6}${3}${1}${2}${4}\n',
    pageCount, quarterCount, pageTotal, pageData, rowCount, rowTotal,
    rowData, accountingDate, valueDate, description, action, amount, balance;

watcher = chokidar.watch(baseDir, {ignored: /\.csv$/});

watcher
    .on('ready', function() {console.info('Initial scan complete. Ready for changes.')})
    .on('add', convertFile)
    .on('change', convertFile);

function convertFile(filePath) {
    // create the out file...
    var fileName = path.basename(filePath),
        fileExt = path.extname(fileName),
        outFileName = path.basename(filePath, fileExt) + '.csv',
        outPath = path.join(baseDir, outFileName);
    // get the data rows out... 
    pageData = fs.readFileSync(filePath, 'UTF-8');
    pageData = pageData.match(dataRe);
    if (pageData !== null) {
        fs.writeFileSync(outPath, format.apply(null, [csvTemplate].concat(header)), { encoding: 'utf8' });
        pageData.forEach(function extractFromRow(row) {
            rowData = row.match(columnRe);
            fs.appendFileSync(outPath, format.apply(null, [csvTemplate].concat(rowData)), { encoding: 'utf8' });
        });
        console.info(format('Converted: {0} -> {1}', fileName, outFileName));
    } else {
        console.info(format('{} had no entries... Wrong format?', fileName));
    }
}

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
