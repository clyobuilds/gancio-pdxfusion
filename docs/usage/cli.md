<!--# ---
# layout: default
# title: CLI
# permalink: /usage/cli
# nav_order: 2
# parent: Usage
# has_toc: true
# ----->

# CLI - Command Line Interface

## Using CLI
Gancio is distributed with an embedded CLI.  
To use the CLI you can execute it directly from the installation directory with `./gancio <your command>`.

<!--To use the CLI you need to specify the `config.json` configuration file via `--config <your_config.json>` flag; by default the CLI will look for one in the current directory, so if your current directory is /opt/gancio (having followed the [installation instructions](/install/debian)) there is no need to specify it.-->

### Using CLI with Docker installation
To use the CLI in a docker installation you can execute a shell inside the container with:
`docker exec <gancio_container_name> sh` and following the normal CLI usage or running commands with:

`docker exec <gancio_container_name> ./gancio <your command>`


## Users <badge>since 1.6.14</badge>
All users related sub-commands starts with `gancio users`.
Note that most of this actions could be done from administration panel (Admin > Users).

### Run db migration
`gancio migrate`

### List all users
To list all users use
`gancio users list`


### Create a new user

`gancio users create <username|email> [password] [role]`

`role` value could be `user` (default), `admin` or `editor`, you can also specify it using `--role` flag.  
To create an user with administrator privileges use the `--role` flag, e.g.  
`gancio users create admin@example.com --role admin`


### Remove a user
`gancio users remove <username|email>`


### Reset password
`gancio users reset-password <username|email>`


### Change role

To add administrator privileges to an user:
`gancio users set_role <username|email> admin`  

To remove administrator privileges from an user:
`gancio users set_role <username|email> user`

### Enable / disable users

To enable an user: `gancio users enable <email>`

To disable an user: `gancio users disable <email>`

## Settings <span class='label label-yellow'>since 1.24.0</span>
All settings related sub-commands starts with `gancio settings`.
Note that most of this actions could be done from administration panel.


### List all settings
To list all settings use
`gancio settings list`


### Get a specific setting value

`gancio settings get <setting>`



### Set a specific setting value
`gancio settings set <setting> <value>`

```bash
# enable moderation
➜ ./gancio settings set enable_moderation true
enable_report
Old value: false
New value: true

Note that a restart is needed to get the new setting
[settings] ℹ SET 'enable_report' -> 'true'

```



::: warning JSON
Note that settings are stored in JSON format, so your value will be parsed.
:::

::: warning Restart needed
A restart is needed after a setting is changed
:::

::: tip Rerefences
[#365](https://framagit.org/les/gancio/-/issues/365)  
[!188](https://framagit.org/les/gancio/-/merge_requests/188)
