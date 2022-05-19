const { execSync } = require("child_process");
const { chdir } = require("process");
const path = require('path');

const run = (command) => {
console.log('RUN', command);
    const result = execSync(command);
    console.log('OUTPUT', result.toString('utf8'));
}

chdir(path.join(__dirname, '..'));

run('npm run grab');

run(`cp tickets_history.json client/src/tickets_history.json`)

chdir(path.join(__dirname, '..', 'client'));

run('npm i');

run('npm run build');

run('cp -r build/* /var/www/jira-report.boysthings.top/');

chdir(path.join(__dirname, '..'));

if (execSync('git status --porcelain').toString('utf8').trim().length > 0) {

    run('git add tickets_history.json client/src/tickets_history.json');

    run(`git commit -m"Jira grab for ${new Date().toLocaleDateString()}"`);

    run('git push');
} else {
    console.log('No changes. Nothing to push')
}
   