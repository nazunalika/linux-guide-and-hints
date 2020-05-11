Hurricane Electric IPv6 Tunnel
==============================

On distributions that use Network Manager, you can setup an IPv6 tunnel with Hurricane Electric. Make sure you have done the following.

#. Create an account at `Hurricane Electric <https://tunnelbroker.net>`__
#. Click "Create Regular Tunnel" on the left hand side
#. Enter your IPv4 public IP address in the first box
#. Choose the closest tunnel server to you (in my case, it's Phoenix) - Note the IP Address (eg. 66.220.7.82)
#. Click "create tunnel"
#. Note all the information in your "tunnel details"

.. code:: shell

   % nmcli con add type ip-tunnel \
           # Name of the interface
           ifname sit0 \
           # Tunnel protocol with the endpoint
           mode sit remote 66.220.7.82 -- \
           # Disabling IPv4 on this interface
           ipv4.method disabled \
           # Manual IPv6 configuration
           ipv6.method manual \
           # IPv6 endpoint addresses (not your subnet)
           ipv6.address 2001:470:1f18:96::2/64 \
           ipv6.gateway 2001:470:1f18:96::1/64

You will also need to open some parts of your firewall to allow communication. In particular, ICMP (at least type 8) should be allowed from the tunnel server for the heartbeat.

After this, you should be able to assign addresses from your routed /64 on your current machine or machines in your network and be able to ping out. You can also create a /48 and make multiple /64's if you wish.

It is possible to update the tunnel automatically with your IPv4 address in the event it changes.

.. code:: shell

   % vi /etc/NetworkManager/dispatcher.d/pre-up.d/00-tunnelfix.sh
   #!/bin/sh
   user=USERNAME
   pass=PASSWORD
   tunnel=TUNNEL_ID

   if [ "$1" = sit0 ]; then
     wget -O /dev/null https://$user:$pass@ipv4.tunnelbroker.net/ipv4_end.php?tid=$tunnel
   fi
