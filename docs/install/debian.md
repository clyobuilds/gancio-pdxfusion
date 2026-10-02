# Debian installation

You will need node.js (>= 20) to install Gancio.

1. Install Node.js
```bash
sudo apt-get install -y curl
sudo curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

::: tip Other node.js installation methods
You can install node.js also using the default debian package
or with something like [NVM](https://github.com/nvm-sh/nvm).
This last method is recommended if you have multiple node.js services running on your server so you can use different versions of node.js for each service in case of compatibility issues.
:::

1. Create a user to run gancio from
```bash
sudo adduser --group --system --shell /bin/false --home /opt/gancio gancio
```

1. Install Gancio
```bash
sudo npm --global add https://gancio.org/beta.tgz
```

<!-- #### Choose you database (sqlite, postgresql, mariadb, mysql)
1. Setup using postgreSQL __(optional)__
```bash
sudo apt-get install postgresql
# Create the database
su postgres -c psql
postgres=# create database gancio;
postgres=# create user gancio with encrypted password 'gancio';
postgres=# grant all privileges on database gancio to gancio;
```

1. Setup using MariaDB (__optional__)
```bash
sudo apt-get install mariadb
sudo mysql
MariaDB [(none)]> create database gancio;
Query OK, 1 row affected (0.001 sec)
MariaDB [(none)]> create user gancio identified by 'gancio';
Query OK, 0 rows affected (0.011 sec)
MariaDB [(none)]> grant all privileges on gancio.* to gancio;
Query OK, 0 rows affected (0.009 sec)
``` -->


::: tip Package verification
Distributed packages are signed with [this key](/underscore_to.hacklab.asc) you can verify the signature using:
`gpg --verify latest.tgz.sig`
:::


1. Setup systemd service and reload systemd
```bash
sudo curl https://gancio.org/gancio.service -o /etc/systemd/system/gancio.service
sudo systemctl daemon-reload
sudo systemctl enable gancio
```

1. Start gancio service (this should listen on port 13120)
```bash
sudo systemctl start gancio
```

1. [Setup nginx as a proxy](./nginx)

1. Point your web browser to your domain :tada:

## Upgrade

::: warning Backup your data
Backup your data is generally a good thing to do and this is especially true before upgrading.
Don't be lazy and [backup](./backup) your data!
:::

```bash
sudo systemctl stop gancio
sudo npm --global add https://gancio.org/beta.tgz
sudo systemctl restart gancio
```