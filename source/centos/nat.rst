NAT/Router
^^^^^^^^^^

.. meta::
       :description: How to setup and configure a router and/or a simple NAT service in CentOS

This page goes over setting up a router or a simple NAT service for CentOS.

.. contents::

Requirements
------------

Here are the list of requirements below.

* CentOS 7, 8 or Fedora
* An active internet connection to install the packages required or available internal mirrors
* A system with at least two (2) network interfaces

Tutorial
--------

Interface Setup
+++++++++++++++

To properly setup the system, a few things have to be done. 

#. One interface must be the WAN interface, in most cases this is set to DHCP.
#. Another interface must be the LAN interface or a group of interfaces must become a bridge with a static address
#. ip_forward must be turned on - optionally if you have ipv6, turn on that forwarding as well

.. note:: IPv6 and NAT

   If you have an IPv6 prefix, whether it's from your ISP or it's a brokered prefix from he.net, NAT is generally not needed. Instead of using NAT for IPv6, you can just do simple forwarding. This is covered in a later section.

FirewallD
+++++++++

When using firewalld, CentOS 7+ and all Fedora's can setup a simple NAT with masquerade without having to know iptables or nftables syntax. This may be more or less ideal for some users who want to quickly get a NAT and router going. The drawback is that the syntax and knowing how the rules work are hidden behind a frontend. To setup a NAT:

.. code-block:: shell

   # Tell eth0 to be our WAN
   % nmcli con mod eth0 connection.zone external
   # Tell eth1 to be our LAN (or a bridge if you have one)
   % nmcli con mod eth1 connection.zone internal
   # Doesn't hurt to re-up
   % nmcli con up eth0 ; nmcli con up eth1

   # The external zone already has masquerade on, but just in case
   % firewall-cmd --zone=external --add-masquerade --permanent
   % firewall-cmd --complete-reload
   % firewall-cmd --get-active-zones
   external
     interfaces: eth0
   internal
     interfaces: eth1

iptables
++++++++

.. warning:: CentOS 7 or older

   This is for CentOS 7 or Fedora where iptables is the default. While nftables can be installed on CentOS 7, the NAT functionality does not seem to work properly. This may have changed. Use nftables at your own risk.

To setup NAT with iptables, the following will suffice as the building blocks. Assuming eth0 is the WAN and eth1 is the LAN.

.. code-block:: shell

   % systemctl disable firewalld --now
   % systemctl mask firewalld
   % yum install iptables-services
   % systemctl enable iptables --now
   % iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
   % iptables -I FORWARD 1 -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
   % iptables -I FORWARD 2 -i eth1 -o eth0 -j ACCEPT
   % iptables-save > /etc/sysconfig/iptables
   # Verify that the final FORWARD rule is a reject.
   % iptables -nvL
   % iptables -t nat -nvL
   # If it is not, manually modify the file... it should look like this:
   . . .
   -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
   -A FORWARD -i eth1 -o eth0 -j ACCEPT
   -A FORWARD -j REJECT --reject-with icmp-host-prohibited
   . . .
   # Optionally, you can set the jump to DROP instead.
   # If you modify the file, run...
   % iptables-restore < /etc/sysconfig/iptables

nftables
++++++++

.. warning:: CentOS 8 or Fedora Only

   This is for CentOS 8 or Fedora where nftables is the default. While iptables exists for CentOS 8 still, it is being superseded by nftables. It is recommended to stick with nftables.

The syntax for nftables is a little tricky and quite different from what we may be used to with iptables. This may be an oversimplification and may or may not work. For ideas, you can view the files in /etc/nftables. This is a rough example of what I tried on migration to CentOS 8.

.. code-block:: shell

   # Disable firewalld, we'll enable nftables later
   % systemctl disable firewalld --now
   % systemctl mask firewalld
   # Flush all rules
   % nft flush ruleset

Rest coming soon.

IPv6 Forwarding
+++++++++++++++

Coming soon.

DHCP
++++

Optional. Coming soon
