#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { deploy, getProfile } = require('../index');

const program = new Command();
const CONFIG_PATH = path.join(os.homedir(), '.emmdee', 'config.json');

program
    .name('emmdee')
    .description('CLI for Emmdee - Instant static hosting for agents')
    .version('1.0.0');

program
    .command('login')
    .description('Login with your API key')
    .argument('<key>', 'Your Emmdee API key')
    .action(async (key) => {
        try {
            await fs.ensureDir(path.dirname(CONFIG_PATH));
            await fs.writeJson(CONFIG_PATH, { apiKey: key }, { spaces: 2 });
            console.log(chalk.green('✓ Logged in successfully!'));
        } catch (err) {
            console.error(chalk.red('Error saving credentials:'), err.message);
        }
    });

program
    .command('logout')
    .description('Clear your local credentials')
    .action(async () => {
        try {
            await fs.remove(CONFIG_PATH);
            console.log(chalk.green('✓ Logged out. credentials cleared.'));
        } catch (err) {
            console.error(chalk.red('Error clearing credentials:'), err.message);
        }
    });

program
    .command('deploy')
    .description('Deploy a folder or file to Emmdee')
    .argument('[path]', 'Path to the folder or file to deploy', '.')
    .option('-s, --slug <slug>', 'Update an existing site with this slug')
    .option('-t, --title <title>', 'Site title')
    .option('-d, --description <desc>', 'Site description')
    .action(async (deployPath, options) => {
        let apiKey = null;
        if (fs.existsSync(CONFIG_PATH)) {
            const config = await fs.readJson(CONFIG_PATH);
            apiKey = config.apiKey;
        }

        try {
            const result = await deploy(path.resolve(deployPath), {
                apiKey,
                slug: options.slug,
                title: options.title,
                description: options.description
            });

            console.log('\n' + chalk.bold.green('🚀 Site Live!'));
            console.log(chalk.cyan('URL:     ') + chalk.underline(result.siteUrl));
            if (result.anonymous) {
                console.log(chalk.yellow('\n⚠️ ANONYMOUS PUBLISH'));
                console.log('This site will expire in 24 hours.');
                console.log('Claim Token: ' + chalk.bold(result.claimToken));
                console.log('Claim URL:   ' + chalk.underline(result.claimUrl));
            }
        } catch (err) {
            console.error(chalk.red('\nDeployment failed:'), err.message);
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Check login status')
    .action(async () => {
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log(chalk.yellow('Status: Not logged in (Anonymous mode)'));
            return;
        }

        const { apiKey } = await fs.readJson(CONFIG_PATH);
        console.log(chalk.green('Status: Logged in'));
        console.log('API Key: ' + apiKey.substring(0, 8) + '...');
    });

program.parse();
