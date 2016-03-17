if (!process.env.PORT) {
    process.env.PORT = 15454;
}

var mime = require('mime');
var formidable = require('formidable');
var http = require('http');
var fs = require('fs-extra');
var util = require('util');
var path = require('path');

var dataDir = "./data/";

var streznik = http.createServer(function(zahteva, odgovor) {
   console.log();
   console.log("zahteva: " + zahteva.url);
   
   if (zahteva.url == '/') {
       posredujOsnovnoStran(odgovor);
   } else if (zahteva.url == '/datoteke') { 
       console.log("datoteke");
       posredujSeznamDatotek(odgovor);
   } else if (zahteva.url.startsWith('/brisi')) { 
       console.log("brisi");
       izbrisiDatoteko(odgovor, dataDir + zahteva.url.replace("/brisi", ""));
   } else if (zahteva.url.startsWith('/prenesi')) {
       console.log("prenesi");
       posredujStaticnoVsebino(odgovor, dataDir + zahteva.url.replace("/prenesi", ""), "application/octet-stream");
   } else if (zahteva.url == "/nalozi") {
       console.log("nalozi");
       naloziDatoteko(zahteva, odgovor);
   } else if (zahteva.url.indexOf("/poglej") >= 0) {
       console.log("poglej");
       posredujStaticnoVsebino(odgovor, zahteva.url.replace("/poglej", "./data"), "");
   } else {
       console.log("ostalo");
       posredujStaticnoVsebino(odgovor, './public' + zahteva.url, "");
   }
});

streznik.listen(process.env.PORT, function(){
   console.log("Streznik je zagnan"); 
});

function izbrisiDatoteko(odgovor, datoteka){
    fs.unlink(datoteka, function(napaka){
       if(napaka){
           posredujNapako(odgovor, 404, "Datoteke ni bilo mogoče najti");
       } else {
            odgovor.writeHead(200, {'Content-Type': 'text/plain; charset="UTF-8"'});
            odgovor.write("Datoteka izbrisana");
            odgovor.end();
       }
    });
}


function posredujOsnovnoStran(odgovor) {
    posredujStaticnoVsebino(odgovor, './public/fribox.html', "");
}

function posredujStaticnoVsebino(odgovor, absolutnaPotDoDatoteke, mimeType) {
        console.log("pot:" + absolutnaPotDoDatoteke);
        fs.exists(absolutnaPotDoDatoteke, function(datotekaObstaja) {
            if (datotekaObstaja) {
                fs.readFile(absolutnaPotDoDatoteke, function(napaka, datotekaVsebina) {
                    if (napaka) {
                        posredujNapako(odgovor, 500, "Datoteke ni bilo mogoče najti");
                    } else {
                        posredujDatoteko(odgovor, absolutnaPotDoDatoteke, datotekaVsebina, mimeType);
                    }
                })
            } else {
                posredujNapako(odgovor, 404, "Datoteke ni bilo mogoče najti");
            }
        })
}

function posredujNapako(odgovor, stNapake, opis) {
    odgovor.writeHead(stNapake, {'Content-Type': 'text/plain; charset="UTF-8"'});
    odgovor.write("Napaka: " + stNapake + " " + opis);
    odgovor.end();
}


function posredujDatoteko(odgovor, datotekaPot, datotekaVsebina, mimeType) {
    if (mimeType == "") {
        odgovor.writeHead(200, {'Content-Type': mime.lookup(path.basename(datotekaPot))});    
    } else {
        odgovor.writeHead(200, {'Content-Type': mimeType});
    }
    
    odgovor.end(datotekaVsebina);
}

function posredujSeznamDatotek(odgovor) {
    odgovor.writeHead(200, {'Content-Type': 'application/json'});
    fs.readdir(dataDir, function(napaka, datoteke) {
        if (napaka) {
            //Posreduj napako
        } else {
            var rezultat = [];
            for (var i=0; i<datoteke.length; i++) {
                var datoteka = datoteke[i];
                var velikost = fs.statSync(dataDir+datoteka).size;    
                rezultat.push({datoteka: datoteka, velikost: velikost});
            }
            
            odgovor.write(JSON.stringify(rezultat));
            odgovor.end();      
        }
    })
}

function naloziDatoteko(zahteva, odgovor) {
    var form = new formidable.IncomingForm();
 
    form.parse(zahteva, function(napaka, polja, datoteke) {
        util.inspect({fields: polja, files: datoteke});
    });
 
    form.on('end', function(fields, files) {
        var zacasnaPot = this.openedFiles[0].path;
        var datoteka = this.openedFiles[0].name;
        fs.copy(zacasnaPot, dataDir + datoteka, function(napaka) {  
            if (napaka) {
                //Posreduj napako
            } else {
                posredujOsnovnoStran(odgovor);        
            }
        });
    });
}
