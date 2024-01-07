---
title: The System Administrator Experience
---

This write up provides steps on the System Administrator experience.
This is not an end-all, be-all, and has many variables to keep in mind.
But can provide a baseline for you.

Please keep in mind, this is for Red Hat based distributions, mainly
Enterprise Linux 8 and 9. CentOS Stream works within reason.

Also note that it will be recommended that you do things in ansible. The
RHCE for RHEL 9 will require you to be able to use ansible. As such, we
will be focusing on RHEL 9.

## Recommendations
!!! note
    Software Replacements

    * Postgresql can be replaced with MySQL/MariaDB
    * Use Katello/Foreman, straight Pulp, or Uyuni
    * You can use any hypervisor other than KVM if you wish, with
      specific caveats
    * nagios can be replaced with icinga
    * You can replace firewalld with the regular nftables service. This
      may be required for your virtual host

!!! note
    General Notes

    * It's recommended to use colored vim syntax. Root doesn't use vim
      when vim-enhanced is installed. You can make an alias for vi to run
      vim (not recommended).
    * Turn on syntaxing in `~/.vimrc` with `syntax on`
    * Make the vim colors brighter in `~/.vimrc` with `set background=dark`
    * Export your EDITOR variable in `~/.bash_profile` with `export EDITOR=vim`
    * Keep selinux set to **enforcing**

!!! note
    Hardware Requirements

    * RAM - Minimum: 32GB, Recommended: 64GB
    * CPU - Minimum: Intel or AMD Quad Core, Recommended: 8 Core with HyperThreading
    * Storage - Minimum: 4TB, Recommended: 8TB
    * Network - minium 1gb link recommended

Please consider on building an actual lab machine that you can do this
on.

## Certification Completions

Certification guidelines will be updated later.

## Notes and Changelog
!!! note
    Post Experience Notes

    While this write up uses KVM exclusively, you may want to enhance your
    learning after the fact by setting up another virtualization platform
    on your virtual host. It may require you to redesign everything or
    even start over, but it is something you can consider which you like
    best overall.

| Date                   | Changes                          |
|------------------------|----------------------------------|
| January 07, 2024       | Restructure with markdown        |

## Begin

We'll now begin the system administrator experience. We will provide
from beginning to end, what to do, without giving away what has to be
done or has to be configured. This is on you to perform. At the end,
there is a "wiki" that you create where you will have a chance to
document everything you did. I recommend writing down or putting in a
word document what you are doing or have done throughout so it'll make
your wiki documentation much, much better.

### Setup a KVM Hypervisor

Now you'll need to setup a KVM Hypervisor. You can do this on Fedora
39+ or Enterprise Linux 9. Because EL9 is a stable platform for libvirt,
I recommend using going that route. If you want the latest features for
the cost of some stability, Fedora will work for you.

You may want to make sure your hardware supports virtualization.

```
egrep --color 'vmx|svm' /proc/cpuinfo
```

#### Recommendations and Options

* Create multiple datastores (storage pools where the VM images will
  sit)

    * Example, 2x2TB means you can make two datastores, 4x1TB means
      you can make four.

* Attempt to use LVM as the backing for the store.

    * You can create a Volume Group and have the VM's live as Logical
      Volumes.
    * You can create a Volume Group and have one or more partitions to
      make "more" datastores

* Destroy the "built in" network that libvirt already provides and
  make your own

    * It already makes virbr0. Make your own OR modify it to not
      support DHCP/DNS (eg, static only)

#### Hints

* Most of your commands will be from the following:

    * virsh
    * fdisk/parted
    * pvcreate & vgcreate
    * mkfs

* To get the most performance out of your VM's disk wise, consider
  these options:

    * Avoid QCOW2
    * Use virtio for the hardware whenever possible
    * Set caching to "none" for hard disks on VM's when using raw
      volumes or partitions

### DHCP and DNS

You'll need to setup a DHCP and DNS server. You have a few choices.

1. Create two VM's to run DHCP for HA and create FreeIPA servers to
   handle DNS (two replicas, doubles as authentication for Linux/UNIX
   clients)
2. Create two VM's to run DHCP for HA and create two standalone BIND
   servers as master/slave
3. Use your hypervisor to host DHCP and BIND (not recommended)

It would be sensible to do "1", if you do "2", you at least get more
exposure to how zone files are created and the like. For ease of use,
**we recommend choosing option 1.**

Also, it is possible to allow cobbler handle DHCP and DNS or integrate
directly into DNS such as making changes, but this is outside the scope
of this write up.

!!! warning

    Do NOT run DHCP from the FreeIPA replicas. The FreeIPA servers should
    have STATIC addresses set.

!!! note

    When you are setting up DHCP and DNS on separate servers (such as
    FreeIPA replicas), the DHCP server needs to be configured to tell all
    the clients the true gateway (this is either a VM in on KVM or a
    hypervisor of your choice if you are doing straight KVM) and the DNS servers.

Setup a VM or your hypervisor as the gateway to the internet.

1. IP forwarding enabled (/etc/sysctl.conf)
2. NAT enabled (firewalld can help you with this, check out the zones)
3. A virtual interface (hypervisor) or a second interface for your
   network (as a VM)

When setting up DHCP and DNS:

1. Decide on a domain name. This can be a domain you own or one you
   make up internally. I personally used one of my four domains for
   this lab. RFC expects that internal networks have world routable
   domains. This is up to you. **Do NOT use '.local' domains**
2. Setup DNS forwarders to ensure your VM's can get DNS requests from
   the internet. You create a forwarders { } block with each outside
   DNS IP listed in BIND or you can *optionally* set them in the
   FreeIPA interface. You can list as many as you want. With a default
   configuration of FreeIPA, forwarders are not strictly required. **Do
   NOT put these extra DNS servers in your dhcpd.conf configuration**
3. You need two zones. Forward Zone: This is for your domain, name to
   an IP. Reverse Zone: This is for reverse IP lookups, IP to a name.
   FreeIPA handles this for you on setup if you state you are handling
   a reverse zone and what the subnet is.

#### Bonus Points

* Setup Dynamic DNS - This requires an almost specific configuration
  between dhcpd and named (bind) or FreeIPA's named.
* Dynamic DNS needs to be aware of a domain name
* Use SSSD for the IPA clients to update their DNS automatically
  (FreeIPA only) - this may not be required if dhcpd and named are
  configured correctly
* Setup an unbound service running on port 9053 that forwards to
  1.1.1.1 for encrypted DNS

**From this point forward, you are to ensure each of your VM's that you
create have DNS entries. If you have Dynamic DNS running, you will NOT
need to do any manual changes. If using FreeIPA, you may not need to
make these changes. You can use nsupdate or the ipa equivalent to add
additional entries as needed if you are implementing static A records or
CNAME records.**

### Server and Content Management

At this point, you'll need to setup Foreman/Katello, Pulp, or Uyuni on
a VM. I recommend using Pulp if you want something smaller and simpler.
If you want something close to **Red Hat Satellite**, go through
katello. It is a combination of pulp, candlepin, foreman. This
recommendation is primarily because of Satellite 6 existing in a large
amount of Red Hat shops.

Katello, go [here](http://www.katello.org/).

!!! note
    Heads up

    * You're going to be hosting repositories, I SERIOUSLY recommend
      creating a VM that has at least 250GB starting and going from there.
      Don't try to host Fedora.
    * Katello is resource heavy, you may need to tune it.
    * Pulp may be easier on you, resource wise.

#### Bonus Points

* Setup errata importation for the Enterprise Linux
  Channels/Repositories to properly see Advisories and Information for
  package updates if the repos you are importing does not contain them
* Create custom kickstarts for your systems (this will help you out
  later)


Kickstart examples can be found at my
[github](https://github.com/nazunalika/useful-scripts/tree/master/centos).

### Connect Content Management to Hypervisor

Next you will need to connect your Content Management to your
hypervisor. View their documentation to get an idea of how it works.

### Spin Up VM's Using Katello/Spacewalk or PXE Server

You will need to spin up two EL8 or EL9 VM's via Katello or PXE. Do not spin
them up using virt-install, virt-manager, or anything else. This will require
you to connect Katello to the hypervisor. Ensure they are registered
properly to your content management server.

If you find the clients aren't registering on Katello, click
[here](https://theforeman.org/manuals/3.8/index.html).

If you find that you do not want to use Katello to perform this task,
then you can setup cobbler and work it out from there. **I currently do
not have a tutorial for this, but there is plenty of documentation
online.** There are also ansible playbooks you could look at for
examples if you wanted to go that route, but it may be time consuming
and something to setup at the very end.

### Setup FreeIPA

Setup FreeIPA with two replicas, using CA and DNS built in
configuration. This is recommended if you do not want to setup BIND by
hand. FreeIPA also provides authentication to your systems without
having to go through the hassle of setting up OpenLDAP by hand nor
having Windows AD.

* [FreeIPA](https://freeipa.org)
* [FreeIPA Guide](https://linuxguideandhints.com/el/freeipa)

I recommend against setting up OpenLDAP for the case of UNIX
authentication. For anything else, go for it.

Once FreeIPA is available, all systems should be using FreeIPA as your
DNS servers and they should all be enrolled to your domain.

### Spin Up Two VM's for Databases

Create two new VM's from your Content Management or PXE system that are
EL9 and install the default postgresql on them.

Attempt to install and configure pgpool-II for master-master
replication. Note that this may not be default in Enterprise Linux and
you can safely skip this.

### Spin Up Configuration Management

While Katello has some form of ansible built in, it may be
better to create a solitary configuration management VM and hook it in.
Spin up a VM that is EL9 and install a master for configuration
management.

It is HIGHLY recommended that you use ansible. Ansible is the supported
and recommended system by Red Hat and is utilized in the certification
exams for EL9. At some point, you could spin up a docker container for
AWX if you wanted, but this is not a strict requirement.

### Spin Up VM for NFS/iSCSI

This VM should be EL9. Ensure it has an extra 20GB disk attached to it.
Install the following:

1. An NFS server (nfs-utils)
2. An iSCSI server (scsi-target-utils, targetcli)

You are to:

1. Export an NFS directory
2. Export a LUN to any server

[iSCSI for RHEL 9](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices)

### Deploy Bacula Server

Bacula is a backup service. It is actually confusing to setup. It's not
easy. There are plenty of write-ups for bacula and RHEL/Enterprise Linux.
The digital ocean write-ups are complete, but do NOT give you everything
you need to know to do it "correct" or to succeed completing this portion.

Your server will need the following:

1. Ensure the system has a large disk or a large second disk (this can
   be any size, start small though) - You can also use your NFS server
   or iSCSI's LUN.
2. Ensure it is partitioned for ext4
3. Ensure it is mounted to /bacula
4. If using iSCSI or NFS, ensure the disk from that server is bigger
   than 20GB. 50 should suffice.
5. Bakula will need to be configured to use postgresql (digital ocean
   does NOT use postgresql, you will need to do some reading)
6. Register each machine you have to it, storing to flatfile

Deploy Two/Four VM's
---------------------

1. First one/two will be web servers running apache (httpd)
2. Next one/two will be app servers

This is a typical "web/app" configuration. Some shops use apache
frontends to weblogic backends. Sometimes it's tomcat backends. Some
shops opt for other methods and software too.

If wish to setup Wildfly and host a wiki, you will need to do the
following:

1. Setup Wildfly Wiki or on your app servers
2. Setup apache to forward requests to your tomcat servers for the wiki
3. Do this as a VirtualHost configuration with the ServerName as
   "wiki.domain.tld", replacing "domain.tld" with your domain
4. Set a ServerAlias as wiki

If you wish to setup a Git

Deploy Load Balancer VM
-----------------------

This will be considered a "VIP" of sorts for your wiki and other
applications. This VM can either use iptables round-robin or HAProxy. I
highly recommend trying both to see what's easier for you. **HAProxy is
recommended, because it's an actual load balancer application.**

You will need the following:

1. A DNS CNAME for this machine called "wiki.domain.tld", replacing
   domain.tld with your domain
2. You will need to configure apache to respond to requests for
   "wiki.domain.tld" (virtual host configuration) and forward them on
   to the app servers
3. HAProxy will need to forward 80 and 443 requests to the two web
   servers

!!! warning
    Dynamic DNS

    If you are using Dynamic DNS, you may need to run rndc sync before
    making changes in the case of standalone BIND. You will want to use the
    nsupdate command to make changes to your Dynamic Zones. If you are using
    FreeIPA DNS this is not required.

Deploy Postfix VM
-----------------

You will need to do the following:

1. Ensure postfix is listening on all interfaces
2. Ensure postfix is setup to send and receive messages only from your
   internal network
3. Setup a gmail account or another relay to allow the above to work to
   outside mail (this is sort of tricky for gmail, but doable)

#### Bonus Points

* Create two relays as "mailhost1" and "mailhost2" for your domain
  with the same configurations
* Create a CNAME for "mailhost.domain.tld" for your load balancer,
  forwarding port 25 to both servers

    * Optionally, you can use round-robin DNS instead of HAProxy

### Setup Nagios VM

This will be a monitoring server on EL9. You will need to set it up to
use snmp to monitor the communication state of every service above. This
means:

1. Is the right port open?
2. I got the right kind of response.
3. Filesystem Space, too full?

If you are planning to use full on SNMP, all servers will need the
appropriate SNMP ports open and they will need the snmpd clients
installed (with a monitor snmpd account)

### Setup Syslog VM

Setup this server as a syslog server. It can be EL8 or higher. Ensure
that it is listening on port 514 UDP and TCP in the configuration and
that those ports are open.

You will need to go to your servers and setup /etc/rsyslog.conf to send
ALL logs to this syslog server

Optionally, setup an all inclusive logging solution, like graylog,
elastic search, mongodb, fluentd. The sky is the limit here!

### Document Your Work

On your new wiki, document everything you did, right now, on your new
wiki.

### RPM Build Server

For fun, you can setup a new server that is your designated RPM building
machine. You will need to install **mock** to do this. Optionally, you
can setup koji, bodhi, the things that the Fedora project uses. This is
not for the faint of heart.

### Git Server

Also for fun, you can setup a git server. There are many options out
there. A popular opensource one is [Gitea](https://gitea.io/).

### Ansible

Consider setting up ansible and the open source tower. Automate
everything via ansible.
