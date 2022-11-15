async function main() {
    const fs = require('fs');
    const { Command } = require('commander');
    const simpleGit = require('simple-git');
    const slugify = require('slugify');
    const fastDiff = require('fast-diff');

    const command = new Command();
    const cwd = process.cwd();

    command
        .version('1.0.0')
        .description('Create a translation pull request yml file')
        .option('-g, --git  <value>', 'Path to git directory', cwd)
        .option('-b, --branch <value>', 'The branch name, default is develop', 'develop')
        .option('-b, --base-branch <value>', 'The base branch name, default is master', 'master')
        .option('-o, --output <value>', 'The output yml file name, default is the branch name')
        .parse(process.argv);

    const options = command.opts();

    if (!options.output) {
        options.output = `${cwd}/${slugify(options.branch)}.yml`;
    }

    const git = simpleGit({
        baseDir: options.git,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
    });

    await git.checkout(options.branch);
    const status = await git.status();

    if (status.current !== options.branch) {
        throw new Error(`Unable to checkout "${options.branch}" branch`);
    }

    const diff = await git.diff([options.baseBranch, '--', '*Messages_fr_FR.json']);
    const yml = diff.split('diff').reduce((content, part) => {
        const [, path] = part.match(/\+\+\+ b\/(.*?\/Messages_fr_FR.json)/) ?? [];
        if (!path) {
            return content;
        }
        content.push(`- ${path}:`);
        part.match(/\+ +?".+?":/g).forEach(addition => {
            const [, key] = addition.match(/\+ +?"(.+?)":/);
            if (part.match(new RegExp(`- +?"${key}":`))) {
                const additionDiff = fastDiff(
                    part.match(new RegExp(`\\+ +?"${key}": +?"(.*?)"`))[1],
                    part.match(new RegExp(`- +?"${key}": +?"(.*?)"`))[1],
                );
                if (additionDiff.length === 1) return;
            }
            content.push(`  - ${key}`);
        });
        return content;
    }, []).join('\n');
    
    console.log(`Created ${options.output}`);
    fs.writeFileSync(options.output, yml, 'utf-8');
}

main();