#!/usr/bin/env node

import fs from 'fs';
import { Command } from 'commander';
import simpleGit from 'simple-git';
import slugify from 'slugify';
import fastDiff from 'fast-diff';
import clipboardy from 'clipboardy';

async function main() {
    const command = new Command();
    const cwd = process.cwd();

    command
        .version('1.0.4')
        .description('Create a translation pull request yaml file')
        .option('-g, --git <value>', 'Path to git repository', cwd)
        .option('-f, --feature <value>', 'The feature branch name', 'develop')
        .option('-b, --base <value>', 'The base branch name on which the diff is made', 'master')
        .option('-o, --output <value>', 'The output yaml file name, default is the branch name')
        .option('-c, --clipboard', 'The output will be copied to the clipboard')
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
        const keys = part.match(/\+ +?".+?":/g)
            ?.map(line => line.match(/"(.+?)"/).pop())
            ?.filter(key => !(
                // The translation did not change
                part.match(new RegExp(`- +?"${key}":`)) &&
                fastDiff(
                    part.match(new RegExp(`\\+ *?"${key}" *?: *?"(.*?)"`))?.pop(),
                    part.match(new RegExp(`\\- *?"${key}" *?: *?"(.*?)"`))?.pop(),
                ).length === 1
            ));

        if (!path || !keys || !keys.length) {
            return content;
        }

        content.push(`- ${path}:`);
        keys.forEach(key => content.push(`  - ${key}`));

        return content;
    }, []).join('\n');

    if ('clipboard' in options) {
        await clipboardy.write(yaml);
        console.log('Copied to clipboard');
    } else {
        await fs.promises.writeFile(options.output, yaml, 'utf-8');
        console.log(`Created ${options.output}`);
    }
}

main();