#!/bin/sh
set -e

sed -i 's;#RunAsDaemon 1;RunAsDaemon 1;g' /etc/tor/torrc
sed -i 's;#HiddenServicePort 80 127.0.0.1:80;HiddenServicePort 80 127.0.0.1:13120;g' /etc/tor/torrc
sed -i 's;#HiddenServiceDir /var/lib/tor/hidden_service/;HiddenServiceDir /var/lib/tor/hidden_service/;g' /etc/tor/torrc


echo "forward-socks5t .onion 127.0.0.1:9050 ." | tee -a /etc/privoxy/config

tor -f /etc/tor/torrc
privoxy /etc/privoxy/config

echo "In a minute, your instance will be available at: " && sleep 5
cat /var/lib/tor/hidden_service/hostname

export http_proxy=http://127.0.0.1:8118
export ALLOW_ACCESS_TO_HIDDEN_SERVICE="true"
bun run dev

