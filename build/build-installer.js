const shell = require('shelljs');

shell.echo('##########################');
shell.echo('#    Building electron   #');
shell.echo('##########################');

if (!shell.test('-e', 'spring/target')) {
  shell.echo('Error: server is not built yet.');
  shell.exit(1)
}

shell.rm('-rf', 'dist');

const FIRST_ARGUMENT_INDEX = 2;
if (process.argv[FIRST_ARGUMENT_INDEX] === 'deploy') {
  if (shell.exec('electron-builder build --win --publish always').code !== 0) {
    shell.echo('Error: electron build and deploy failed');
    shell.exit(1)
  }
} else {
  if (shell.exec('electron-builder build --win --publish never').code !== 0) {
    shell.echo('Error: electron build failed');
    shell.exit(1)
  }
}