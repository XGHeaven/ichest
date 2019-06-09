# IChest

A command manager for your like chest.

## Install

```bash
npm install @ichest/cli -g
# or
yarn global add @ichest/cli
```

## Usage

```bash
# add command first
ic add c1 ~/a/b

ic c1 arg1 arg2
# is equal
~/a/b arg1 arg2

# address also support url
ic add c2 https://xxx.com/xxx.js
ic c2 arg1 arg2

# address support git repo as command group
# user/repo has test1.js/test2.js files
ic add https://github.com/user/rpo
ic test1.js arg
ic test2.js arg
```
