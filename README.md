Translation-yml
=

Create a translation push request yml file

## Installation  


Using `npm`
```
npm install -g ovh-translation-yml
```

Using `yarn`
```
yarn global add ovh-translation-yml
```

## Usage

Go into your current git repository
```
ovh-translation-yml -f feat/my-feature-branch
```
Or use the `-g` `--git` option
```
ovh-translation-yml -f feat/my-feature-branch -g path/to/git/repository
```

## Options

### -f --feature

The name of the feature branch where all the  Messages_fr_FR.json files are created or modified. Default is `develop`

### -b --base

The name of the base branch on which the `git diff` command is made. Default is `master`

### -g --git

The path to the git repository. Default is the current working directory

### -o --output

The output path / filename of the yml


