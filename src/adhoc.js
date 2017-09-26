var os = require('os');
var dns = require('dns');
var fs = require('fs');
var args = require('yargs').argv;

var h = os.hostname();
console.log('UQDN: ' + h);

const dir = 'E:\\GIT\\odsp-next\\node_modules\\@ms\\onedrive-buildtools-binaries\\tab\\bin\\service\\logs';

const files = fs.readdirSync(dir);

const filepath = `${dir}\\TAB_a830edad9050849testss01_sharepoint_com_Health_2017_Sep_15_17_40_6.Chrome`;

var stat = fs.statSync(filepath);

var reg = /SPListPerf\s?result:(.*)<\/td>/;
var content = fs.readFileSync(filepath, 'utf8');
if (reg.test(content)) {
    var data = JSON.parse(content.match(reg)[1]);
}
dns.lookup(h, function (err, ip) {
    console.log('IP: ' + ip);
    dns.lookupService(ip, 0, function (err, hostname, service) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('FQDN: ' + hostname);
        console.log('Service: ' + service);
        console.log('fooArg: ' + args['fooArg']);
    });
});

function copy(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(oldPath);
        const writeStream = fs.createWriteStream(newPath);

        readStream.on('error', (err) => {
            reject(err);
        });
        writeStream.on('error', (err) => {
            reject(err);
        });
        readStream.on('close', () => {
            fs.unlink(oldPath, () => {
                resolve();
            });
        });
        readStream.pipe(writeStream);
    });
}

function move(oldPath, newPath) {
    return new Promise((resolve, reject) => {
      fs.rename(oldPath, newPath, function (err) {
        if (err) {
          if (err.code === 'EXDEV') {
            return copy(oldPath, newPath);
          } else {
            reject(err);
          }
          return;
        }
        resolve();
      });
    });
}
  
move("E:\\temp\\log\\msit.txt", "E:\\temp\\log\\uls\msit.txt").then(() => {
    console.log('copy done');
}).catch((error) => {
    console.log('copy fail');
});