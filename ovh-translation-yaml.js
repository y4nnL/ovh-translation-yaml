#!/usr/bin/env node

async function main() {
    const fs = require('fs');
    const { Command } = require('commander');
    const simpleGit = require('simple-git');
    const slugify = require('slugify');
    const fastDiff = require('fast-diff');

    const command = new Command();
    const cwd = process.cwd();

    command
        .version('1.0.3')
        .description('Create a translation pull request yaml file')
        .option('-g, --git <value>', 'Path to git repository', cwd)
        .option('-f, --feature <value>', 'The feature branch name', 'develop')
        .option('-b, --base <value>', 'The base branch name on which the diff is made', 'master')
        .option('-o, --output <value>', 'The output yaml file name, default is the branch name')
        .parse(process.argv);

    const options = command.opts();

    if (!options.output) {
        options.output = `${cwd}/${slugify(options.feature)}.yaml`;
    }

    const git = simpleGit({
        baseDir: options.git,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
    });

    await git.checkout(options.feature);
    const status = await git.status();

    if (status.current !== options.feature) {
        throw new Error(`Unable to checkout "${options.feature}" branch`);
    }

    const diff = await git.diff([options.base, '-U0', '--', '*Messages_fr_FR.json']);

    const yaml = diff.split('diff').reduce((content, part) => {
        const [, path] = part.match(/\+\+\+ b\/(.*?\/Messages_fr_FR.json)/) ?? [];
        const additions = part.match(/\+ +?".+?":/g);

        if (!path || !additions) {
            return content;
        }

        content.push(`- ${path}:`);

        additions.forEach(addition => {
            const [, key] = addition.match(/\+ *?"(.+?)" *?:/);

            // The translation did not change
            if (
                part.match(new RegExp(`- +?"${key}":`)) &&
                fastDiff(
                    part.match(new RegExp(`\\+ *?"${key}" *?: *?"(.*?)"`))?.pop(),
                    part.match(new RegExp(`\\- *?"${key}" *?: *?"(.*?)"`))?.pop(),
                ).length === 1
            ) return;

            content.push(`  - ${key}`);
        });

        return content;
    }, []).join('\n');
    
    await fs.promises.writeFile(options.output, yaml, 'utf-8');
    console.log(`Created ${options.output}`);
}

main();