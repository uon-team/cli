# @uon/cli
Command line tools for UON framework. Very primitive at the moment.

```shell
npm i -g @uon/cli
```


## Usage

### Create a new workspace and/or project
```shell
uon new <template> my-project
```

If the current working directory contains a uon.json file, a project will be added to the workspace, otherwise the command creates a new folder for the workspace.


### Build a project in a workspace
```shell
cd my-project
uon build <project-name> [--prod] [--watch]
```

You can build all projects in the workspace by passing '*' as the project name 

