const archiver = require('archiver');
const fs = require('fs');
const readlineSync = require('readline-sync');
const path = require('path');
const { parse } = require('jsonc-parser');

// Read and parse the mod.config file
const modConfigPath = 'mod.config';
const modConfigContent = fs.readFileSync(modConfigPath, 'utf8');
const modConfig = parse(modConfigContent);

// Read and parse the module.json file
const moduleJsonPath = path.join(modConfig.distPath, 'module.json');
const moduleJson = parse(fs.readFileSync(moduleJsonPath, 'utf8'));

// Read and parse the package.json file
const packageJsonPath = modConfig.packageJsonPath;
const packageJson = parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Get the current module ID from module.json
const moduleId = moduleJson.id;
console.log(`Module ID: ${moduleId}`);

// Get the current version from module.json
const currentVersion = moduleJson.version;
console.log(`Current version: ${currentVersion}`);

// Prompt the user for the new version number and release notes
const newVersion = readlineSync.question('Enter the new version number for the zip file (Ex: 1.0.1): ').trim();
const releaseNotes = readlineSync.question('Enter the release notes (if provided, will update the README.md file): ').trim();
console.log(`Input received - Version: ${newVersion}...`);
console.log(`Release received - Release Notes: ${releaseNotes}`);

// Update the version number in module.json
const updatedModuleJson = JSON.stringify(moduleJson, null, 2).replace(new RegExp(currentVersion, 'g'), newVersion);
fs.writeFileSync(moduleJsonPath, updatedModuleJson);
console.log(`module.json updated successfully!`);

// Update the version number in package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log(`package.json updated successfully!`);

const outputDir = modConfig.releasesPath + `/v${newVersion}`;
const zipFileName = `${moduleId}-v${newVersion}.zip`;

// Check if directory exists. If not, create it.
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });  // recursive ensures any nested directories are created
}

// Copy the updated module.json to the zip_releases folder
const updatedModuleJsonPath = path.join(outputDir, 'module.json');
fs.copyFileSync(moduleJsonPath, updatedModuleJsonPath);
console.log(`Updated module.json copied to ${updatedModuleJsonPath}`);

// Create a new output stream for the zip file
const output = fs.createWriteStream(`${outputDir}/${zipFileName}`);
const archive = archiver('zip');

// Pipe the output stream to the archive
archive.pipe(output);

// Append the entire "dist" folder to the archive
archive.directory(modConfig.distPath, false);

// Finalize the archive and close the output stream
archive.finalize();

// Listen for the "close" event to know when the archive has been created
output.on('close', () => {
  console.log(`./${outputDir}/${zipFileName} created successfully!`);

  // Update the README.md file with the release notes (if provided)
  if (releaseNotes !== '') {
    const readmePath = modConfig.readmePath;
    fs.appendFileSync(readmePath, `\n\n#### v${newVersion}\n${releaseNotes}`);
    console.log(`${readmePath} updated successfully with release notes!`);
  }
});

// Listen for archive errors
archive.on('error', (err) => {
  throw err;
});
