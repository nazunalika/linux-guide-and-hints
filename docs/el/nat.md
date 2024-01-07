---
title: 'NAT/Router'
---

This page goes over setting up a router or a simple NAT service for
Enterprise Linux.

## Requirements

Here are the list of requirements below.

* Enterprise Linux 8, 9 or Fedora
* An active internet connection to install the packages required or available internal mirrors
* A system with at least two (2) network interfaces

## Tutorial

### Interface Setup

To properly setup the system, a few things have to be done.

1. One interface must be the WAN interface, in most cases this is set
   to DHCP.
2. Another interface must be the LAN interface or a group of interfaces
   must become a bridge with a static address
3. `ip_forward` must be turned on - optionally if you have ipv6, turn on
   that forwarding as well

!!! note
    IPv6 and NAT

    If you have an IPv6 prefix, whether it's from your ISP or it's a
    brokered prefix from he.net, NAT is generally not needed. Instead of
    using NAT for IPv6, you can just do simple forwarding. This is covered
    in a later section.

### FirewallD

When using firewalld, Enterprise Linux 7+ and all Fedora\'s can setup a
simple NAT with masquerade without having to know iptables or nftables
syntax. This may be more or less ideal for some users who want to
quickly get a NAT and router going. The drawback is that the syntax and
knowing how the rules work are hidden behind a frontend. To setup a NAT:

```
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
```

### nftables

This is for Enterprise Linux 8/9 or Fedora where nftables is the default.
While iptables exists for Enterprise Linux 8 still, it is being
superseded by nftables. It is recommended to stick with nftables.

The syntax for nftables is a little tricky and quite different from what
we may be used to with iptables. This may be an oversimplification and
may or may not work. For ideas, you can view the files in /etc/nftables.
This is a rough example of what I tried on migration to Enterprise Linux
8.

```
# Disable firewalld, we'll enable nftables later
% systemctl disable firewalld --now
% systemctl mask firewalld
# Flush all rules
% nft flush ruleset
```

Rest coming soon.

## IPv6 Forwarding

Coming soon.

## DHCP

Optional. Coming soon
