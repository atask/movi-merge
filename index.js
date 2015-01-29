var fs = require('fs'),
    path = require('path'),
    format = require('string-format');

var baseDir = path.join(__dirname, 'res'),
    dataRe = /cphContenuto_grdMovimenti.Data = \[(.*)\];/,
    columnReTemplate = '{}=([^;]*);',
    fields = ['Data contabile', 'Data valuta', 'Descrizione', 'Causale', 'Importo', 'Saldo contabile'],
    fieldsRe,
    pageCount, quarterCount, pageTotal, pageData, rowCount, rowTotal,
    rowData, accountingDate, valueDate, description, action, amount, balance;


// generate all regexes
fieldsRe = fields.map(function createRe(field) {
    return new RegExp(format(columnReTemplate, field));
});

// for each quarter, do the magic...
for (quarterCount = 0; quarterCount < 4; quarterCount += 1) {
    // see how many pages we have to read
    var quarterDir = path.join(baseDir, 't' + (quarterCount + 1));
    pageTotal = fs.readdirSync(quarterDir).length;
    // get data from each page
    for (pageCount = 0; pageCount < pageTotal; pageCount += 1) {
        pagePath = path.join(quarterDir, 'Movimenti' + (pageCount + 1) + '.html');
        pageData = fs.readFileSync(pagePath, 'UTF-8');
        // get the data array out... hope eval doesn't brake anything
        pageData = pageData.match(dataRe)[1];
        pageData = eval('[' + pageData + ']');
        rowTotal = pageData.length;
        for (rowCount = 0; rowCount < rowTotal; rowCount += 1) {
             // eighth column has all the goodness
             rowData = pageData[rowCount][8];
             // add a semicolon so regex won't blow
             rowData = rowData.concat(';');
             // create a csv row
             var csvRow = '';
             fieldsRe.forEach(function extractData(regex) {
                 csvRow = csvRow.concat(format('"{}",', rowData.match(regex)[1]));
             });
             // clean '&#xx' symbols
             // append to csvfile
             console.log(csvRow);
        }
    }
}
