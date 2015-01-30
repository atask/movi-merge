var fs = require('fs'),
    path = require('path'),
    format = require('string-format');

var baseDir = path.join(__dirname, 'res'),
    outPath = path.join(baseDir, 'out.csv'),
    dataRe = /\d{2}\/\d{2}\/\d{4}\n\d{2}\/\d{2}\/\d{4}\n.*\n.*\n.*\n.*\n.*\n\nstampa/g,
    columnRe = /\d{2}\/\d{2}\/\d{4}\n\d{2}\/\d{2}\/\d{4}\n.*\n(.*)\n(.*)\n.*\nDescrizione: (.*) - Saldo Contabile: (.*) - Data Contabile: (.*) - Data Valuta: (.*)\n/,
    //header = ['Data contabile', 'Data valuta', 'Descrizione', 'Causale', 'Importo', 'Saldo contabile'],
    header = ['DUMMY', 'Causale', 'Importo', 'descrizione', 'Saldo contabile', 'Data contabile', 'Data valuta'],
    csvTemplate = '{5}${6}${3}${1}${2}${4}\n',
    pageCount, quarterCount, pageTotal, pageData, rowCount, rowTotal,
    rowData, accountingDate, valueDate, description, action, amount, balance;

// create the out file...
fs.writeFileSync(outPath, format.apply(null, [csvTemplate].concat(header)), { encoding: 'utf8' });
// for each quarter, do the magic...
for (quarterCount = 0; quarterCount < 4; quarterCount += 1) {
    // see how many pages we have to read
    var quarterDir = path.join(baseDir, 't' + (quarterCount + 1));
    pageTotal = fs.readdirSync(quarterDir).length;
    // get data from each page
    for (pageCount = 0; pageCount < pageTotal; pageCount += 1) {
        pagePath = path.join(quarterDir, (pageCount + 1) + '.txt');
        pageData = fs.readFileSync(pagePath, 'UTF-8');
        // get the data rows out... 
        pageData = pageData.match(dataRe);
        pageData.forEach(function extractFromRow(row) {
            rowData = row.match(columnRe);
            accountingDate = rowData[5];
            valueDate = rowData[6];
            description = rowData[3];
            action = rowData[1];
            amount = rowData[2];
            balance = rowData[4];
            console.log('row parsed');
            fs.appendFileSync(outPath, format.apply(null, [csvTemplate].concat(rowData)), { encoding: 'utf8' });
        });
    }
}
console.log('DONE!');
