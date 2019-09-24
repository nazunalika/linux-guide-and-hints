The System Administrator Experience
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. meta::
    :description: The System Administrator Experience for Red Hat based distributions, such as CentOS 7.

This write up provides steps on the System Administrator experience. This is not an end-all, be-all, and has many variables to keep in mind. 

Please keep in mind, this is for Red Hat based distributions, mainly CentOS 7 and 8. Scientific Linux 7 is not supported.

Also note that it will be recommended that you do things in ansible. The RHCE for RHEL 8 will require you to be able to use ansible. As such, we will be focusing on RHEL 8.

Recommendations
---------------

.. note:: Software Replacements

   * Postgresql can be replaced with MySQL/MariaDB

     * Note: Doing this will mean you will need another way to "cluster" MySQL/MariaDB. EL Distributions do not have a built-in way to do this.

   * Spacewalk can be replaced with Katello/Foreman or straight Pulp (**recommended to use Katello**, but you can try both)
   * You can replace KVM with ESXi if you wish, with specific caveats listed in the steps.
   * nagios can be replaced with icinga
   * You can replace firewalld with the regular iptables service or nftables for 8 - This may be required for your virtual host

.. note:: General Notes

   * It's recommended to use colored vim syntax. Root doesn't use vim when vim-enhanced is installed. You can make an alias for vi to run vim (not recommended).
   * Turn on syntaxing in ~/.vimrc -- syntax on
   * Make the vim colors brighter in ~/.vimrc -- set background=dark
   * Export your EDITOR variable in ~/.bash_profile -- export EDITOR=vim
   * Keep selinux set to **enforcing**
   * It is recommended to `disable firewalld <http://www.bromosapien.net/media/index.php/Linux_Disable_FirewallD>`_ for your lab machine. Everything else can stay.

.. note:: Hardware Requirements

   * RAM - Minimum: 8GB, Recommended: 32GB
   * CPU - Minimum: Quad Core i5, Recommended: Quad Core with HT i7 or Xeon
   * Storage - Minimum: 1TB, Recommended: 4TB

     * This should be spread out with multiple disks. Don't use one 4TB, for example. Use 2x2TB or 4x1TB.

   * Network - 1gb link recommended
   
   Please consider on building an actual lab machine that you can do this on.



Certification Completions
-------------------------

Going through this guide fulfills the following certification objectives for the RHCSA.

  * Operate running systems

    * Boot, reboot, and shut down a system normally
    * Locate and interpret system log files and journals
    * Access a virtual machine's console
    * Start and stop virtual machines
    * Start, stop, and check the status of network services
    * Securely transfer files between systems

  * Configure local storage

    * List, create, delete partitions on MBR and GPT disks
    * Create and remove physical volumes, assign physical volumes to volume groups, and create and delete logical volumes
    * Configure systems to mount file systems at boot by Universally Unique ID (UUID) or label
    * Add new partitions and logical volumes, and swap to a system non-destructively

  * Create and configure file systems

    * Mount and unmount CIFS and NFS network file systems
    * Extend existing logical volumes
    * Diagnose and correct file permission problems

  * Deploy, configure, and maintain systems

    * Configure networking and hostname resolution statically or dynamically
    * Schedule tasks using at and cron
    * Start and stop services and configure services to start automatically at boot
    * Configure systems to boot into a specific target automatically
    * Install Red Hat Enterprise Linux automatically using Kickstart
    * Configure a physical machine to host virtual guests
    * Install Red Hat Enterprise Linux systems as virtual guests
    * Configure systems to launch virtual machines at boot
    * Configure network services to start automatically at boot
    * Configure a system to use time services
    * Install and update software packages from Red Hat Network, a remote repository, or from the local file system (in this case, CentOS repos)
    * Update the kernel package appropriately to ensure a bootable system

  * Manage security

    * Configure firewall settings using firewall-config, firewall-cmd, or iptables
    * Set enforcing and permissive modes for SELinux
    * List and identify SELinux file and process context
    * Restore default file contexts
    * Use boolean settings to modify system SELinux settings
    * Diagnose and address routine SELinux policy violations

Going through this guide fulfills the following certification objectives for the RHCE.

  * System configuration and management

    * Use firewalld and associated mechanisms such as rich rules, zones and custom rules, to implement packet filtering and configure network address translation (NAT)
    * Use /proc/sys and sysctl to modify and set kernel runtime parameters
    * Configure a system as either an iSCSI target or initiator that persistently mounts an iSCSI target

  * Network services

    * Install the packages needed to provide the service
    * Configure SELinux to support the service
    * Use SELinux port labeling to allow services to use non-standard ports
    * Configure the service to start when the system is booted
    * Configure the service for basic operation

  * HTTP/HTTPS

    * Configure a virtual host

  * DNS

    * Troubleshoot DNS client issues (you will also be troubleshooting server issues too)

  * NFS

    * Provide network shares to specific clients

  * Database Services

    * Install and configure MariaDB (though you may be using postgresql, consider doing a separate mariadb instance)
    * Backup and restore a database
    * Create a simple database schema

Notes and Changelog
-------------------

.. note:: Post Experience Notes

   While this write up uses KVM exclusively, you may want to enhance your learning after the fact by setting up oVirt on your virtual host and also setting up manageiq. It may require you to redesign everything or even start over, but it is something you can do to say "Yes, I've used that product".

+------------------------+----------------------------------+
|          Date          |              Changes             |
+========================+==================================+
|      May 10, 2016      | * Added information about oVirt  |
|                        | * Added information about cobbler|
+------------------------+----------------------------------+
|      Jul 27, 2018      | * Accounting for Fedora 28       |
|                        | * Remove OpenLDAP from guide     |
|                        | * Remove spacewalk from the guide|
+------------------------+----------------------------------+
|      Jul 23, 2019      | * Started conversion to EL8      |
+------------------------+----------------------------------+

Begin
-----

We'll now begin the system administrator experience. We will provide from beginning to end, what to do, without giving away what has to be done or has to be configured. This is on you to perform. At the end, there is a "wiki" that you create where you will have a chance to document everything you did. I recommend writing down or putting in a word document what you are doing or have done throughout so it'll make your wiki documentation much, much better.

Setup a KVM Hypervisor
++++++++++++++++++++++

Now you'll need to setup a KVM Hypervisor. You can do this on Fedora 28+ or CentOS 7. Because CentOS 7 is a stable platform for libvirt, I recommend using going that route. If you want the latest features for the cost of some stability, Fedora will work for you.

You may want to make sure your hardware supports virtualization.

.. code-block:: none

   egrep --color 'vmx|svm' /proc/cpuinfo

.. note:: Recommendations and Options

   * Create multiple datastores (storage pools where the VM images will sit)

     * Example, 2x2TB means you can make two datastores, 4x1TB means you can make four.

   * Attempt to use LVM as the backing for the store.

     * You can create a Volume Group and have the VM's live as Logical Volumes.
     * You can create a Volume Group and have one or more partitions to make "more" datastores

   * Destroy the "built in" network that libvirt already provides and make your own

     * It already makes virbr0. Make your own OR modify it to not support DHCP/DNS (eg, static only)

.. note:: Hints

   * Most of your commands will be from the following:

     * virsh
     * fdisk/parted
     * pvcreate & vgcreate
     * mkfs

   * To get the most performance out of your VM's disk wise, consider these options:

     * Avoid QCOW2
     * Use virtio for the hardware whenever possible
     * Set caching to "none" for hard disks on VM's when using raw volumes or partitions

DHCP and DNS
++++++++++++

You'll need to setup a DHCP and DNS server. You have a few choices.

1) Create two VM's to run DHCP for HA and create FreeIPA servers to handle DNS (two replicas, doubles as authentication for Linux/UNIX clients)
2) Create two VM's to run DHCP for HA and create two standalone BIND servers as master/slave
3) Use your hypervisor to host DHCP and BIND (not recommended)

It would be sensible to do "1", if you do "2", you at least get more exposure to how zone files are created and the like.

Also, it is possible to allow cobbler handle DHCP and DNS or integrate directly into DNS such as making changes, but this is outside the scope of this write up.

.. warning::

   Do NOT run DHCP from the FreeIPA replicas. The FreeIPA servers should have STATIC addresses set.

.. note::

   When you are setting up DHCP and DNS on separate servers (such as FreeIPA replicas), the DHCP server needs to be configured to tell all the clients the true gateway (this is either a VM in on ESX/oVirt or your hypervisor if you are doing straight KVM) and the DNS servers.

Setup a VM or your hypervisor as the gateway to the internet.

1) IP forwarding enabled (/etc/sysctl.conf)
2) NAT enabled (firewalld can help you with this, check out the zones)
3) A virtual interface (hypervisor) or a second interface for your network (as a VM)

When setting up DHCP and DNS:

1) Decide on a domain name. This can be a domain you own or one you make up internally. I personally used one of my four domains for this lab. RFC expects that internal networks have world routable domains. This is up to you. **Do NOT use '.local' domains**
2) Setup DNS forwarders to ensure your VM's can get DNS requests from the internet. You create a forwarders { } block with each outside DNS IP listed in BIND or you can set them in the FreeIPA interface. You can list as many as you want. **Do NOT put these extra DNS servers in your dhcpd.conf configuration**
3) You need two zones. Forward Zone: This is for your domain, name to an IP. Reverse Zone: This is for reverse IP lookups, IP to a name. FreeIPA handles this for you on setup if you state you are handling a reverse zone and what the subnet is.

.. note:: Bonus Points

   * Setup Dynamic DNS - This requires an almost specific configuration between dhcpd and named (bind) or FreeIPA's named.
   * Dynamic DNS needs to be aware of a domain name
   * Use SSSD for the IPA clients to update their DNS automatically (FreeIPA only) - this may not be required if dhcpd and named are configured correctly

**From this point forward, you are to ensure each of your VM's that you create have DNS entries. If you have Dynamic DNS running, you will NOT need to do any manual changes. You can use nsupdate to add additional entries as needed if you are implementing static A records or CNAME records.**

Server and Content Management
+++++++++++++++++++++++++++++

At this point, you'll need to setup Spacewalk or Katello on a VM. I recommend using Katello as **Satellite 6** has its upstream from Katello. It is a combination of pulp, candlepin, foreman, and a form of puppet. This recommendation is primarily because Red Hat is phasing out **Red Hat Network Classic** and **Satellite 5**.

Katello, go `here <http://www.katello.org/>`__.

.. note:: Heads up

   * You're going to be hosting repositories, I SERIOUSLY recommend creating a VM that has at least 250GB starting and going from there.
   * Spacewalk has an odd "dependency" on wanting DHCP/TFTP to exist on the server at the same time. There is no way around this. You do not have to use it unless you are using cobbler (which needs TFTP and a specific DHCP configuration).
   * Katello is resource heavy, it's you may need to tune it.

.. note:: Bonus Points

   * Setup errata importation for the CentOS Channels/Repositories to properly see Advisories and Information for package updates
   * Create custom kickstarts for your systems (this will help you out later)

Kickstart examples can be found at my `github <https://github.com/nazunalika/useful-scripts/tree/master/centos>`_.

Connect Content Management to Hypervisor
++++++++++++++++++++++++++++++++++++++++

Next you will need to connect your Content Management to your hypervisor. View their documentation to get an idea of how it works.

Spin Up VM's Using Katello/Spacewalk
++++++++++++++++++++++++++++++++++++

You will need to spin up two EL8 VM's via Katello. Do not spin them up using virt-install, virt-manager, ovirt, etc. This will require you to connect Katello to the hypervisor. Ensure they are registered properly to your content management server.

If you find the clients aren't registering on Katello, click `here <https://theforeman.org/manuals/1.15/index.html>`__.

If you want examples of a kickstart you can use, click `here <https://github.com/nazunalika/useful-scripts/blob/master/centos/centos7-pci.ks>`__.

If you find that you do not want to use Katello to perform this task, then you can setup cobbler and work it out from there. **I currently do not have a tutorial for this, but there is plenty of documentation online.**

Setup FreeIPA
+++++++++++++

Setup FreeIPA with two replicas, using CA and DNS built in configuration. This is recommended if you do not want to setup BIND by hand. FreeIPA also provides authentication to your systems without having to go through the hassle of setting up OpenLDAP by hand.

* `FreeIPA <https://freeipa.org>`__
* `FreeIPA Guide <https://linuxguideandhints.com/centos/freeipa.html>`__

I recommend against setting up OpenLDAP for the case of UNIX authentication. For anything else, go for it. 

Spin Up Two VM's for Databases
++++++++++++++++++++++++++++++

Create two new VM's from your Content Management that are EL8 and install postgresql on them.

Do the following:

1) Install and configure pgpool-II for master-master replication
2) If using Spacewalk, export the database of your server and import it into the cluster. Reconfigure Spacewalk to use your database cluster (this is tricky)

**Step 2 is NOT required if you are using Katello/Foreman or Pulp.**

Spin Up Configuration Management
++++++++++++++++++++++++++++++++

While Katello has some form of puppet and ansible built in, it may be better to create a solitary configuration management VM and hook it in. Spin up a VM that is EL7 or EL8 and install a master for configuration management. You have a few choices.

#. SaltStack -> Available in their own repository
#. Ansible   -> Available in EPEL

It is HIGHLY recommended that you use ansible. Ansible is the supported and recommended system by Red Hat and is utilized in the certification exams for EL8.

Spin Up VM for NFS/iSCSI
++++++++++++++++++++++++

This VM should be EL8. Ensure it has an extra 20GB disk attached to it. Install the following:

1) An NFS server (nfs-utils)
2) An iSCSI server (scsi-target-utils, targetcli)

You are to:

1) Export an NFS directory
2) Export a LUN to any server

I highly recommend doing it manually first. The RHEL 6 links still apply to RHEL 7 to an extent. Below are helpful links for iSCSI.

`iSCSI for RHEL 7 (both) <https://www.certdepot.net/rhel7-configure-iscsi-target-initiator-persistently/>`_

Deploy Bacula Server
++++++++++++++++++++

Bacula is a backup service. It is actually confusing to setup. It's not easy. There are plenty of write-ups for bacula and CentOS 6 and 7. The digital ocean write-ups are complete, but do NOT give you everything you need to know to do it "correct" or to succeed completing this portion.

Your server will need the following:

1) Ensure the system has a large disk or a large second disk (this can be any size, start small though) - You can also use your NFS server or iSCSI's LUN. 
2) Ensure it is partitioned for ext4
3) Ensure it is mounted to /bacula
4) If using iSCSI or NFS, ensure the disk from that server is bigger than 20GB. 50 should suffice.
5) Bakula will need to be configured to use postgresql (digital ocean does NOT use postgresql, you will need to do some reading)
6) Register each machine you have to it, storing to flatfile

Deploy Four VM's
++++++++++++++++

1) First two will be web servers running apache (httpd)
2) Next two will be tomcat servers

This is a typical "web/app" configuration. Some shops use apache frontends to weblogic backends. Sometimes it's tomcat backends. 

You will need to do the following:

1) Setup JBoss/Wildfly Wiki on your app servers
2) Setup apache to forward requests to your tomcat servers for the wiki
3) Do this as a VirtualHost configuration with the ServerName as "wiki.domain.tld", replacing "domain.tld" with your domain
4) Set a ServerAlias as wiki

Deploy Load Balancer VM
+++++++++++++++++++++++

This will be considered a "VIP" of sorts for your wiki cluster. This VM can either use iptables round-robin or HAProxy. I highly recommend trying both to see what's easier for you. **HAProxy is recommended, because it's an actual load balancer application.**

You will need the following:

1) A DNS CNAME for this machine called "wiki.domain.tld", replacing domain.tld with your domain
2) You will need to configure apache to respond to requests for "wiki.domain.tld" (virtual host configuration) and forward them on to the app servers
3) HAProxy will need to forward 80 and 443 requests to the two web servers

.. warning:: Dynamic DNS

   If you are using Dynamic DNS, you may need to run rndc sync before making changes. You will want to use the nsupdate command to make changes to your Dynamic Zones. If you are using FreeIPA DNS this is not required.

Deploy Postfix VM
+++++++++++++++++

You will need to do the following:

1) Ensure postfix is listening on all interfaces
2) Ensure postfix is setup to send and receive messages only from your internal network
3) Setup a gmail account or another relay to allow the above to work to outside mail (this is sort of tricky for gmail, but doable)

.. note:: Bonus Points

   * Create two relays as "mailhost1" and "mailhost2" for your domain with the same configurations
   * Create a CNAME for "mailhost.domain.tld" for your load balancer, forwarding port 25 to both servers

Setup Nagios VM
+++++++++++++++

This will be a monitoring server on EL8. You will need to set it up to use snmp to monitor the communication state of every service above. This means:

1) Is the right port open?
2) I got the right kind of response.
3) Filesystem Space, too full?

If you are planning to use full on SNMP, all servers will need the appropriate SNMP ports open and they will need the snmpd clients installed (with a monitor snmpd account)

Setup Syslog VM
+++++++++++++++

Setup this server as a syslog server. It can be EL7 or EL8. Ensure that it is listening on port 514 UDP and TCP in the configuration and that those ports are open.

.. note::

   You will need to go to your servers and setup /etc/rsyslog.conf to send ALL logs to this syslog server

Optionally, setup an all inclusive logging solution, like graylog, elastic search, mongodb, fluentd. The sky is the limit here!

Document Your Work
++++++++++++++++++

On your new wiki, document everything you did, right now, on your new wiki.

RPM Build Server
++++++++++++++++

For fun, you can setup a new server that is your designated RPM building machine. You will need to install **mock** to do this. Optionally, you can setup koji, bodhi, the things that the Fedora project uses.

Git Server
++++++++++

Also for fun, you can setup a git server. There are many options out there. A popular opensource one is `Gitlab <https://about.gitlab.com/>`_ or even Gitea.

Ansible
+++++++

Consider setting up ansible and the open source tower. Automate everything via ansible.
