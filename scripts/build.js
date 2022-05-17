const { execSync } = require("child_process");
const { chdir } = require("process");
const path = require('path');
const https = require('https')
const querystring = require('querystring');

const sendNotification = (message) => {

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: encodeURI(`/${process.env.BOT_TOCKEN}/sendMessage?chat_id=${process.env.NOTIFY_CHAT}&text=${message}`),
        method: 'GET'
      }
      
      const req = https.request(options, res => {
          console.log(`statusCode: ${res.statusCode}`)
        
          res.on('data', d => {
            process.stdout.write(d)
          })
        })
        
        req.on('error', error => {
          console.error(error)
        })
        
        req.end()
}


const run = (command) => {
console.log('RUN', command);
    const result = execSync(command);
    console.log('OUTPUT', result.toString('utf8'));
}

chdir(path.join(__dirname, '..'));

run('npm run grab');

run(`cp tickets_history.json client/tickets_history.json`)

chdir(path.join(__dirname, '..', 'client'));

run('npm i');

run('npm run build');

run('cp -r build/* /var/www/jira-report.boysthings.top/');

sendNotification(`Got new JIRA report`)