# Hidden Service

In this guide we will explain how to serve Gancio over a TOR onion service.
This will give you a `.onion` domain that can only be reached through the
TOR network.
Probably in a similar way an I2P hidden service can be configured, but we
have not tested it yet.

Please note that in this directory we also left a Dockerfile that automates
most of the procedure below.
You just need to copy the Dockerfile and entrypoint.sh at the root of the
project.

## Install TOR

For example, on Debian Bookworm:
```bash
apt update
apt install tor privoxy
```

We can then configure TOR to deploy an hidden service that direclty serves
our service exposed at localhost at port `13120`.

```bash
sed -i 's;#RunAsDaemon 1;RunAsDaemon 1;g' /etc/tor/torrc
sed -i 's;#HiddenServicePort 80 127.0.0.1:80;HiddenServicePort 80 127.0.0.1:13120;g' /etc/tor/torrc
sed -i 's;#HiddenServiceDir /var/lib/tor/hidden_service/;HiddenServiceDir /var/lib/tor/hidden_service/;g' /etc/tor/torrc
```
And then restart TOR, ie `systemctl restart tor`.

As later we will see we need that Gancio must also able to exit through the
TOR network, in order for the federation functionalities to work.
For this purpouse we will install `privoxy`, which acts as a middle layer
between the SOCKS proxy exposed by TOR, and NodeJS/bun which supports only
HTTP/HTTPS proxies.

To configure privoxy for hidden services:
```bash
echo "forward-socks5t .onion 127.0.0.1:9050 ." | tee -a /etc/privoxy/config
```

## Configure Gancio

`ALLOW_ACCESS_TO_HIDDEN_SERVICE=true` must be set as an environment
variable, as it will configure if the instance will federate with hidden
services or not.
In the first case, a proxy must be configured to access them, as we will
later explain.

Considering that for an hidden service it's very easy to change domain and
there are not that many option to definitevely block an instance, we
preferred to make this feature optional and not by default.
Also for some administrators it might be problematic to have outgoing TOR
traffic due to restrictions by their ISP or country, so this decision must
be pondered adequately.


## Hidden Service Federation

In order to federate with other instances that operate on an hidden
service, we need to properly configure a proxy.
Above we saw how to use privoxy to route connections directed to `.onion`
sites.
This extra step was needed as the native fetch function, neither as
implemented by [NodeJS](https://github.com/nodejs/node/pull/57165) nor
by [bun](https://bun.com/guides/http/proxy)  does support natively SOCKS
proxies, so we needed a middle layer that enabled an HTTP Proxy.

An effort to harden the implementation by using torsocks, which uses the
`LD_PRELOAD` to route every connection to TOR, was unfortunately not
successful.

Also we tested oniux, a containerization technology developed by the TOR
project, which leaverages network namespaces to increase the level of
security, but at the moment it does not support port forward outside the
container.

## Serve with NGINX

An instance might need to be present both on the clearnet, with a properly
configured SSl certificate for its domain, and an onion service.
One might be tempted to serve the hidden service through SSL, but the [TOR
Project warned out](https://blog.torproject.org/facebook-hidden-services-and-https-certs) that
it might not be useful, similarly a TOR developer wrote a blog post to
explain [why it's not beneficial](https://matt.traudt.xyz/posts/2017-12-02-dont-https-your-onions/).

An option is to serve the onion service thorugh HTTP, and upgrade to HTTPS
only if the application is reach through its clearnet domain.
Following from the NGINX guide on how to use reverse proxies, we can
continue


```nginx
server {
  listen 80;
  server_name wnN[...].onion;
  include /etc/nginx/snippets/gancio.conf;
}

server {
  listen 80;
  server_name clearnet.domain;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443;
  listen [::]:443;
  server_name clearnet.domain;
  include /etc/nginx/snippets/gancio.conf;

}

```

Where the snippet contains the configuration for the reverse proxy.

