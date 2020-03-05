FreeIPA
^^^^^^^

.. meta::
    :description: How to install/configure FreeIPA on CentOS 7/8 with replicas, configuring clients for FreeIPA, policies (eg sudo), and host based access control methods.

This tutorial goes over how to install and configure FreeIPA on CentOS 7 or 8 servers with replicas, as well as configuring client machines to connect and utilize FreeIPA resources, policies (eg sudo), and host based access control methods. We will also go over a scenario of configuring a trust with an Active Directory domain. The client setup will work for Fedora users as the packages are the same, just newer versions.

.. contents::

Overview
--------

FreeIPA is an integrated security information management system combining Linux, a Directory Server (389), Kerberos, NTP, DNS, DogTag. It's a system that can be loosely compared to Active Directory in what it attempts to solve for Linux and UNIX clients and even mixed environments. While it is **not** an active directory, it is an integrated Identity and Authentication solution for Linux/UNIX environments, which means it does not support Windows clients. One problem that FreeIPA attempts to solve is giving back control to the Linux/UNIX administration teams of access, authentication, and authorization rather than trying to integrate directly into Active Directory, where the controls do not work the same or do not work at all. And because of this, no third party software is required to be installed.

Requirements
------------

Here are the list of requirements below.
 
* CentOS 7+ or Fedora 30+
* An active internet connection to install the packages required or available internal mirrors
* DNS delegation (if a DNS appliance or server already exists)
* 2 core, 4GB system with at least 10GB+ disk for /var/lib/dirsrv

Tutorial Preface, Notes, and Recommendations
--------------------------------------------

.. warning:: Potential Pitfalls!

   * Leave SELinux enabled at all times. You will not run into SELinux issues
   * FreeIPA runs a lot better when it controls the DNS domain that it is given - It is recommended DNS is delegated or that FreeIPA run DNS entirely
   * FreeIPA does not run DHCP. ISC DHCP can be configured to do dynamic DNS updates to FreeIPA or hosts can be configured to perform dynamic DNS updates

.. note:: Recommended Information

   * Keep selinux set to **enforcing**
   * DNS - You **must** be careful when using DNS. Here are recommendations. [#f1]_

     * Recommendation 1: FreeIPA runs your entire DNS for your network - This requires the DHCP servers to set the DNS servers to the IPA servers. This will be useful in the case that your clients will have their SSH keys added as SSHFP records to DNS when enrolled as clients. This also gives you the added benefit of a client updating its own DNS entries (A and PTR records) if the client is DHCP enabled and the IP changes if you so choose.
     * Recommendation 2: FreeIPA is delegated a subdomain of a domain used already in the network - It's not required for hosts to live in the subdomain to be a member of the IPA domain. Do not try to hijack a domain.

   * Consider setting up a trust with Active Directory if you are in a mixed environment, eg Active Directory already exists
   * IPA servers should have static assigned addresses - Configured via nmcli or directly in /etc/sysconfig/network-scripts/ifcfg-*
   * Try to avoid running FreeIPA without DNS - while possible, it's highly unmanageable.

.. note:: Trust Information

   If you are in a mixed environment (both Windows and Linux/UNIX), it is recommended to setup a trust between FreeIPA and Active Directory. Because of this, they will need to be in different domains (eg, example.com and ipa.example.com or example.com and ipa.example.com, depending on what the current DNS controllers or appliances are). This way, you do not have to create duplicate users if a windows user logs into Linux resources nor use winsync (which we recommend against using).

.. note:: NOFILE limits

   You may run into file descriptor limit problems depending on the IPA version you are using and/or patch level. Ensure that /etc/sysconfig/dirsrv.systemd has LimitNOFILE set to at least 16384. By default this shouldn't happen in 7.6+


DNS
---

As noted in the previous section, you must try not to hijack a domain. You can migrate records over to FreeIPA's DNS if you'd like, but care must be taken with that approach. 

While FreeIPA can do the typical DNS server work such as forward/reverse zones and various types of records, it should not be considered a full solution. It does not support views (eg, you can't have internal and external views, assuming you have domains that are publically facing). In the event you need to have views, that's when you need a different DNS server or service to provide this to you.

There are two ways you can have DNS entries updated dynamically: --enable-dns-updates for ipa-client-install and DHCP dynamic DNS updates. Both are sufficient. The latter requires additional work and is outside the scope of this write up.

Delegation
++++++++++

Throughout this guide, you may find we will be using a subdomain by DNS delegation, as it would be a more real world example of bringing in FreeIPA to an environment that is already in place, working, with a DNS hosted by AD or by an appliance. Majority of the examples assume both IPA and AD is delegated (when it's normally IPA that's just delegated while AD hosts the actual parent zone). Using this type of setup, it is not required for clients to have entries in the IPA domain. In fact, they can be in other domains as long as they have A/AAAA/PTR records associated with them. This assumes that there could be dynamic dns associated with DHCP or everything is static and lives in the parent zones. **The caveat to this is SSO will fail**.

You can setup already existing DNS servers to delegate an entire domain or a subdomain for FreeIPA. This way, you don't overlap with a domain that's already in use. So for example, if AD owns example.com, you could have AD delegate ipa.example.com or even forward example.net. If AD is not the DNS provider for the environment, you can have the appliance delegate the domain in the same manner. 

Below is a bind example of what example.com would look like when delegating the IPA domain:

.. code-block:: none

   $ORIGIN example.com.
   @ IN SOA ... ( )
                           NS      np-ad01
                           NS      np-ad02
   np-ad01                 A       10.200.0.232
   np-ad02                 A       10.200.0.233
   ; Many other records here, pertaining to AD, eg msdcs and SRV records

   ; IPA records
   $ORIGIN ipa.example.com.
   @                       NS      np-ipa01
                           NS      np-ipa02
   np-ipa01                A       10.200.0.230
   np-ipa02                A       10.200.0.231

Note that AD can send nsupdates to a DNS server if given the permissions - As of this writing, FreeIPA does not do this, which is why DNS delegation is recommended.

Server Setup
------------

Required Packages
+++++++++++++++++

* ipa-server
* ipa-client (required as an IPA server is technically a client of the domain)
* ipa-server-dns (required for using the internal DNS)
* ipa-server-trust-ad (required for AD trusts)
* sssd/sssd-ipa (pulled in as dependencies)

Installation
++++++++++++

To install the server, make sure the hostname is set to the A records and NS delegations you've put in DNS (which won't respond to a DNS lookup). If these are stand-alone, then you can just keep it at the top level (eg, example.com). You'll also need to modify /etc/hosts, set static IP addresses, and then run the ipa-server-install command.

.. code-block:: shell

   % hostnamectl set-hostname server1.ipa.example.com
   % nmcli con mod ens192 ipv4.address 10.200.0.230/24
   % nmcli con mod ens192 ipv4.gateway 10.200.0.1
   % nmcli con mod ens192 ipv4.method manual
   % nmcli con up ens192
   % vi /etc/hosts
   . . .
   10.200.0.230 server1.ipa.example.com
   10.200.0.231 server2.ipa.example.com
   
   # RHEL 7
   % yum install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y
   # RHEL 8
   % yum module enable idm:DL1/{dns,adtrust,client,server,common}
   % yum install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y
   # Setup
   % firewall-cmd --permanent --add-service={ntp,http,https,freeipa-ldap,freeipa-ldaps,kerberos,freeipa-replication,kpasswd,dns}
   % firewall-cmd --complete-reload
   % ipa-server-install --no_hbac_allow \
       --no-ntp \ <-- If you want to host NTP from IPA, take off --no-ntp
       --setup-dns \
       --realm IPA.EXAMPLE.COM \
       --domain example.com 

   . . . (show steps here)

While not officially recommended, you could have two accounts. One for administration of servers and the domain and one for your workstation, similar to separating domain users and domain administrators in active directory. You don't have to follow this, but at least there's a form of separation.

.. code-block:: shell
   
   % kinit admin
   % ipa user-add --first=First --last=Last --cn="First Last Admin" --gecos="First Last Admin" flast2
   % ipa group-add-member --users=flast2 admins

Replica
+++++++

On the replica, ensure you repeat the same steps as above.

.. code-block:: shell

   % hostnamectl set-hostname server2.ipa.example.com
   % nmcli con mod ens192 ipv4.address 10.200.0.231/24
   % nmcli con mod ens192 ipv4.gateway 10.200.0.1
   % nmcli con mod ens192 ipv4.method manual
   % nmcli con up ens192
   % vi /etc/hosts
   . . .
   10.200.0.230 server1.ipa.example.com
   10.200.0.231 server2.ipa.example.com
   
   % yum install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y
   % firewall-cmd --permanent --add-service={ntp,http,https,freeipa-ldap,freeipa-ldaps,kerberos,freeipa-replication,kpasswd,dns}
   % firewall-cmd --complete-reload
   % ipa-replica-install --no-forwarders --setup-ca --setup-dns --no-ntp --principal admin --admin-password "ChangePass123" --domain ipa.example.com
   . . . (show steps)

You should now be able to see your replicas.

.. code-block:: shell

   % ipa-replica-manage list
   server1.ipa.example.com: master
   server2.ipa.example.com: master

Replica Automation
++++++++++++++++++

It is possible to automate the replica installation. To automate the replica installation, the following requirements would need to be met:

* Server must be added as a client (ipa-client-install) with an IP address on the commandline
* Server must be added to the ipaservers host group
* ipa-replica-install ran without principal and passwords

Once you have a server added as a client and then added to the ipaservers host group, you would run a command like this:

.. code-block:: shell

   % ipa-replica-install --no-ntp --sh-trust-dns --unattended --setupca --mkhomedir --setup-dns --no-forwarders

If you have forwarders, use the --forwarders option instead. Remove --no-ntp if you are hosting NTP.

Server Migration/Upgrade
------------------------

To perform a migration from RHEL 7 to RHEL 8, the following steps will have to take place:

* RHEL 8 system is installed and enrolled as a client
* RHEL 8 system is added as a replica

.. code-block:: shell

    % yum module enable idm:DL1
    # Install other necessary packages, ie AD trust packages
    % yum install ipa-server ipa-server-dns -y
    % ipa-client-install --realm EXAMPLE.COM --domain example.com
    % kinit admin
    # Add other switches that you feel are necessary, such as forwarders, kra, ntp...
    % ipa-replica-install --setup-dns --setup-ca --ssh-trust-dns --mkhomedir
    
    # Verify all services are in a RUNNING state
    % ipactl status
    Directory Service: RUNNING
    . . .

    % ipa-csreplica-manage list
    el7.example.com: master
    el8.example.com: master

    % ipa-csreplica-manage list --verbose el8.example.com
    Directory Manager password:

    el7.example.com
      last init status: None
      last init ended: 1970-01-01 00:00:00+00:00
      last update status: Error (0) Replica acquired successfully: Incremental update succeeded
      last update ended: 2019-11-07 22:46:15+00:00

* Change CRL to RHEL 8 system and adjust settings on both replicas for pki-tomcatd and httpd

.. code-block:: shell

   # Change CA master to el8
   % ipa config-mod --ca-renewal-master-server el8.example.com

   # Shut down all CRL generation on EL7
   el7% ipa-crlgen-manage status
   CRL generation: enabled
   . . .

   el7% ipa-crlgen-manage disable
   Stopping pki-tomcatd
   Editing /var/lib/pki/pki-tomcat/conf/ca/CS.cfg
   Starting pki-tomcatd
   Editing /etc/httpd/conf.d/ipa-pki-proxy.conf
   Restarting httpd
   CRL generation disabled on the local host. Please make sure to configure CRL generation on another master with ipa-crlgen-manage enable.
   The ipa-crlgen-manage command was successful

   # Verify that the /etc/httpd/conf.d/ipa-pki-proxy.conf file's RewriteRule is not commented
   # If it is, remove the comment and restart httpd
   % tail -n 1 /etc/httpd/conf.d/ipa-pki-proxy.conf
   RewriteRule ^/ipa/crl/MasterCRL.bin https://el7.example.com/ca/ee/ca/getCRL?op=getCRL&crlIssuingPoint=MasterCRL [L,R=301,NC]

   # Turn it on with EL8
   el8% systemctl stop pki-tomcatd@pki-tomcat.service

   # The values should be changed from false to true
   el8% vi /etc/pki/pki-tomcat/ca/CS.cfg
   ca.crl.MasterCRL.enableCRLCache=true
   ca.crl.MasterCRL.enableCRLUpdates=true

   el8% systemctl start pki-tomcatd@pki-tomcat.service

   # Make sure the rewrite rule has a comment on el8
   el8% vi /etc/httpd/conf.d/ipa-pki-proxy.conf
   . . .
   #RewriteRule ^/ipa/crl/MasterCRL.bin https://el8.example.com/ca/ee/ca/getCRL?op=getCRL&crlIssuingPoint=MasterCRL [L,R=301,NC]

   el8% systemctl restart httpd

* Test user is created to ensure DNA range is adjusted and replication is working

.. code-block:: shell

   % ipa user-add --first=testing --last=user testinguser1

   # Test on both systems
   el7% ipa user-find testinguser1
   el8% ipa user-find testinguser1

* Verify DNA range

.. code-block:: shell

   # There should be ranges for both replicas
   % ipa-replica-manage dnarange-show
   el7.example.com: ...
   el8.example.com: ...

* Stop RHEL 7 IPA services, remove replica, uninstall

.. code-block:: shell

   # Stop all el7 services
   el7% ipactl stop

   # Delete the el7 system from the topology
   el8% ipa server-del el7.example.com

   # Uninstall and/or power down system
   el7% ipa-server-install --uninstall
   el7% init 0

The above is in the case of a single master installation. Let's say you have two RHEL 7 replicas instead. One approach is to install a RHEL 8 system, add it in as needed, reinstall the old RHEL 7 system to RHEL 8, and add it back. Another way is to install two new RHEL 8's, add them in as needed, and power off the RHEL 7's. Below is an example set of steps.

* RHEL 8 system is installed and enrolled as a client
* RHEL 8 system is added as a replica
* Change CRL to RHEL 8 system and adjust settings on RHEL 7 CA master and new RHEL 8 replica for pki-tomcatd and httpd
* Test user is created to ensure DNA range is adjusted
* Verify DNA range
* Stop first RHEL 7 IPA services, remove replica, uninstall, power off.
* Second RHEL 8 system is installed and enrolled as a client
* Second RHEL 8 system is added as a replica
* Test user is created again to ensure DNA range is adjusted
* Verify DNA range
* Stop second RHEL 7 IPA services, remove replica, uninstall, power off.

Active Directory Trust
----------------------

To initiate a trust with your active directory domain, ensure the following requirements are met.

.. note:: Requirements

   Package installed: ipa-server-trust-ad
   DNS: Properly configured that FreeIPA can resolve the AD servers A and SRV records
   This can either be forwarders to AD, a subdomain that IPA manages, or delegated subdomain from the master DNS servers in your network. This is completely dependent on your infrastructure.
   DNS: AD forest has sites and SRV records, including priorities, are set correctly

When the following requirements are met, you have two choices before continuning. You can either use POSIX or have the id range generated automatically.

.. note:: POSIX vs Non-POSIX

   If you decide to use POSIX, your AD users are expected to have uidNumber, gidNumber, loginShell, unixHomeDirectory set. Else, you will need to setup ID overrides if you already have that information for current users (assuming this is not a new setup for the environment, ie you already have UID's for people). If you are not planning a migration from pure AD over to IPA with a trust, it is recommended to note that information so you can setup the ID overrides. Afterwards, any new users will get UID/GID's that you will not have to manage yourself.

You will need to prep your master(s) for the trust. We will be enabling compat, adding sids, and adding agents so both masters can provide AD information. 

.. code-block:: shell

   % ipa-adtrust-install --add-sids --add-agents --enable-compat

This will do what we need. If you do not have legacy clients (RHEL 5, Solaris, HP-UX, AIX, SLES 11.4, the list goes on), then you do not need to enable compat mode. Though, it could be useful to have it for certain apps or scenarios.

You will now need to open the necessary ports. Do this on all masters.

.. note:: Ports

   TCP: 135, 138, 139, 389, 445, 1024-1300, 3268
   UDP: 138, 139, 389, 445

.. code-block:: shell

   % firewall-cmd --add-service=freeipa-trust --permanent
   % firewall-cmd --complete-reload

Now you can initiate the trust. The admin account you use should be part of the domain admins group or at least have permissions to initiate a trust. The former is path of least resistance.

.. code-block:: shell

   # If you are using POSIX ID, use ipa-ad-trust-posix.
   % ipa trust-add --type=ad example.com --range-type=ipa-ad-trust --admin adminaccount --password 

Once the trust is up, verify it.

.. code-block:: shell

   % ipa trust-show example.com
    Realm name: example.com
    Domain NetBIOS name: AD
    Domain Security Identifier: S-X-X-XX-XXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX
    Trust direction: Trusting forest
    Trust type: Active Directory domain
    UPN suffixes: example.com

You should be able to test for the users now.

.. code-block:: shell

   % id aduser1@example.com
   uid=XXXXX(aduser1@example.com) gid=XXXXX(aduser1@example.com) groups=XXXXX(aduser1@example.com)

Disable Anonymous Bind
----------------------

In some cases, it is a requirement to disable *all* anonymous binds. If this is the case, you will need to modify cn=config on each master as it is not replicated.

.. warning:: rootdse

   Some applications do anonymous binds to the directory server to determine its version and it supported controls. While it is possible to disable anonymous binds completely, it is important to know that if you disable the rootdse binds, applications that do anonymous lookups to get server information will fail.

.. code-block:: shell
   
   % ldapmodify -xZZ -D "cn=Directory Manager" -W -h server.ipa.example.com
   Enter LDAP Password:
   dn: cn=config
   changetype: modify
   replace: nsslapd-allow-anonymous-access
   nsslapd-allow-anonymous-access: rootdse

   modifying entry "cn=config"

Client Setup
------------

RHEL 7 & 8
++++++++++

Ensure your /etc/resolv.conf (or other dns settings) are set correctly. Ensure your hostname is also set correctly.

.. code-block:: shell

   % yum install ipa-client -y
   % ipa-client-install --realm EXAMPLE.COM --domain example.com --mkhomedir

Mac Clients
+++++++++++

MacOS Clients are an interesting workstation to setup as a FreeIPA client. It takes a little bit of fighting and troubleshooting, but it can work with the right settings. **Note that as of Catalina, you may not be able to login to your account nor will creating a mobile account function as you would expect.**

.. note:: Other Guides

   There are a couple of guides out there that you may have found before (if you looked) that help setup IPA for Mac. There's one for much older (I think Lion) and one for Sierra. This section was made mostly for my own reference because I found some things in both of those guides didn't address issues I ran into one way or another and couldn't find any information on. The FreeIPA users mail list didn't have any archives with people having similar issues. 

   If you are interested in the other guides to compare to, you may see them `here (recent) <https://www.freeipa.org/page/HowTo/Setup_FreeIPA_Services_for_Mac_OS_X_10.12>`_ and `here (older) <https://annvix.com/using_freeipa_for_user_authentication#Mac_OS_X_10.7.2F10.8>`_

.. warning:: AD Users

   You cannot login as AD users on a Mac when going through FreeIPA. You can, in theory, point to the cn=compat tree and set the attribute mapping to rfc2307. In my tests, I have never been able to get this to work. This section, I am going to assume you are going to be logging in as a user in IPA. If you are in a mixed environment, add your Mac to your AD domain instead.

Check your system's hostname. You want to make sure it has a hostname defined for it in the domain the mac sits in, even if it's dynamic via DHCP/DNS.

.. code-block:: shell

   % sudo scutil --set HostName mac.example.com

Get the IPA certificate. You'll need to double click it after you get it and import it.

.. code-block:: shell

   % cd ~/Desktop && curl -OL http://server1.ipa.example.com/ipa/config/ca.crt
   % sudo mkdir /etc/ipa
   % sudo cp ca.crt /etc/ipa/ca.crt
   % sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /etc/ipa/ca.crt

On the IPA server, you will need to create a host and get the keytab.

.. code-block:: shell

   % ipa host-add mac.example.com --macaddress="00:00:00:00:00:00"
   % ipa-getkeytab -s server1.ipa.example.com -p host/mac.example.com -k /tmp/krb5.keytab

You will need to transfer that keytab to your mac.

.. code-block:: shell

   % cd ~
   % scp user@server1.ipa.example.com:/tmp/krb5.keytab .
   % sudo mv krb5.keytab /etc/krb5.keytab
   % sudo chmod 600 /etc/krb5.keytab
   % sudo chown root:wheel /etc/krb5.keytab

Configure /etc/krb5.conf

.. code-block:: none
   
   [domain_realm]
       .ipa.example.com = IPA.EXAMPLE.COM
       ipa.example.com = IPA.EXAMPLE.COM
   
   [libdefaults]
       default_realm = IPA.EXAMPLE.COM
       allow_weak_crypto = yes 
       dns_lookup_realm = true
       dns_lookup_kdc = true
       rdns = false
       ticket_lifetime = 24h
       forwardable = yes 
       renewable = true
    
   [realms]
       IPA.EXAMPLE.COM = {
           # You don't need to set these when your DNS is setup correctly, but it doesn't hurt to have a reference.
           # In my opinion, you shouldn't hardcode these values. You have to have a good reason to.
           #kdc = tcp/server1.ipa.example.com
           #kdc = tcp/server2.ipa.example.com
           #admin_server = tcp/server1.ipa.example.com
           #admin_server = tcp/server2.ipa.example.com
           pkinit_anchors = FILE:/etc/ipa/ca.crt
       }

You'll want to do a kinit to verify. If it works, you should be able to go to the FreeIPA webui and check that the host is "enrolled" (Identity -> Hosts).

.. code-block:: shell

   % kinit username@IPA.EXAMPLE.COM

You need to modify a couple of pam files. I'll explain why they need to be changed.

.. code-block:: shell

   % sudo vi /etc/pam.d/authorization
   # authorization: auth account
   # Putting krb5 here twice ensures that you can login via kerberos and also get a keytab
   auth          optional       pam_krb5.so use_first_pass use_kcminit default_principal
   auth          sufficient     pam_krb5.so use_first_pass default_principal
   auth          required       pam_opendirectory.so use_first_pass nullok
   account    required       pam_opendirectory.so

   % sudo vi /etc/pam.d/screensaver
   # The krb5 changes do similar to the authorization when on the lock screen after a sleep
   auth       optional       pam_krb5.so use_first_pass use_kcminit
   auth       optional       pam_krb5.so use_first_pass use_kcminit default_principal
   auth       sufficient     pam_krb5.so use_first_pass default_principal
   auth       required       pam_opendirectory.so use_first_pass nullok
   account    required       pam_opendirectory.so
   account    sufficient     pam_self.so
   account    required       pam_group.so no_warn group=admin,wheel fail_safe
   account    required       pam_group.so no_warn deny group=admin,wheel ruser fail_safe

   % sudo vi /etc/pam.d/passwd
   # Helps with kerberos logins
   password   sufficient     pam_krb5.so
   auth       required       pam_permit.so
   account    required       pam_opendirectory.so
   password   required       pam_opendirectory.so
   session    required       pam_permit.so 

After these changes, you'll need to go into make some changes with the directory utility.

#. Go to system preferences -> users & groups -> login options - Click the 'lock' to make changes
#. Set the following:

.. code-block:: none

   Automatic login: Off
   Display login window as: Name and Password
   Show fast user switching menu as: Full Name

#. Click "Join" next to "Network Account Server"
#. Enter one of your IPA servers (you can duplicate it later for backup purposes) and click Continue.
#. Ensure "Allow network users to log in at login window" is checked - Make sure it's set to all users
#. Click "edit" next to the "Network Account Server"
#. Click "Open Directory Utility"
#. Click the lock, edit LDAPv3
#. Select your server and click "edit"
#. Set the following options:

.. code-block:: none

   Open/close times out in 5 seconds
   Query times out in 5 seconds
   Connection idles out in 1 minute (this can't be changed)
   Encrypt using SSL (selected)

#. Click "Search & Mappings"
#. You may either select "rfc2307" from the dropdown or select custom. It will ask your base DN (eg, dc=ipa,dc=example,dc=com)

* If you select rfc2307, it will ask for your base DN (eg, dc=ipa,dc=example,dc=com)
* If you select "custom", you will need to do this manually for each record type. **This is recommended for most deployments.**

#. Click the "+" to add a groups record type or scroll and find "groups".
#. Select "groups", and ensure the following object classes exist. You can click the "+" to add them when needed. 

+-------------------------+---------------+
| Record Type             | ObjectClasses |
+=========================+===============+
| Groups                  | posixGroup    |
+-------------------------+---------------+
|                         | ipausergroup  |
+-------------------------+---------------+
|                         | groupOfNames* |
+-------------------------+---------------+

.. note::

   "groupOfNames" is optional here, because it seems that the directory utility doesn't understand this concept.

#. Expand "groups" and ensure the following for each record type. You can click the "+" to add the attribute types as needed.

+-------------------------+---------------+
| Attribute               | Mapping       |
+=========================+===============+
| PrimaryGroupID          | gidNumber     |
+-------------------------+---------------+
| RecordName              | cn            |
+-------------------------+---------------+

#. Click the "+" to add a users record type or scroll and find "users".
#. Select "users" and ensure the following object classes exist. You can click the "+" to add them when needed.

+-------------------------+---------------+
| Record Type             | ObjectClasses |
+=========================+===============+
| Users                   | inetOrgPerson |
+-------------------------+---------------+
|                         | posixAccount  |
+-------------------------+---------------+
|                         | shadowAccount |
+-------------------------+---------------+
|                         | apple-user    |
+-------------------------+---------------+

#. Expand "users" and ensure the following for each record type. You can click the "+" to add the attribute types as needed.

+-------------------------+------------------------------+
| Attribute               | Mapping                      |
+=========================+==============================+
| AuthenticationAuthority | uid                          |
+-------------------------+------------------------------+
| GeneratedUID            | GeneratedUID or ipaUniqueID  |
+-------------------------+------------------------------+
| HomeDirectory           | #/Users/$uid$                |
+-------------------------+------------------------------+
| NFSHomeDirectory        | #/Users/$uid$                |
+-------------------------+------------------------------+
| PrimaryGroupID          | gidNumber                    |
+-------------------------+------------------------------+
| RealName                | cn                           |
+-------------------------+------------------------------+
| RecordName              | uid                          |
+-------------------------+------------------------------+
| UniqueID                | uidNumber                    |
+-------------------------+------------------------------+
| UserShell               | loginShell                   |
+-------------------------+------------------------------+
| AltSecurityIdentities   | #Kerberos:$krbPrincipalName$ |
+-------------------------+------------------------------+

#. If using custom mapping, click reach record type you created and ensure the base DN is set. 
#. Make sure each record type is set to all subtrees.
#. Click OK
#. Click OK
#. Click on Search Policy.
#. Double check that "/LDAPV3/server1.ipa.example.com" is listed beneath "/Local/Default"
#. Close everything until you're back to the users & groups section of preferences
#. Open a terminal.

.. code-block:: shell

   % dscacheutil -flushcache
   % dscacheutil -q user -a name username

You should get a return.

If you want to further verify users and groups after the above succeeds, open up the directory utility again. Click "Directory Editor", ensure you are searching for "users" and check that they appear in a list on the right hand side, optionally doing a search. In a default setup, you shouldn't need an account to do (some) anonymous lookups. If you changed that in any way, you will need to create a readonly system account in cn=sysaccounts,cn=etc.

In a terminal, you will need to create the home directories via the createmobileaccount command. [#f2]_

.. code-block:: shell

   % sudo /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P

Log out and login as your IPA user. It should succeed. It takes a few moments, but you will eventually see the first login prompts that require you to hit next a couple of times. You'll get a fresh desktop.

Log out and go back to your local account. Go to system preferences, users & groups, find the account, set it as an administrator of the machine.

.. warning:: Password Notes

   There are a couple of problems with this setup that you should be aware of. 
   
   * If you do a mobile account, changing your password through the FreeIPA gui does not change your passwords on your system.
   * If your account does not have any keytabs (eg, you haven't had your mac on or haven't logged in in over 24 hours), you can login with the new password and it will suceed. The system will cache the new password right away. However, your keychain the first time will ask for the old passwords and this is normal. So you can change them by hand or you can log out and back in and the system will ask you if you want to update the password and it will just update automatically.

And that's it! My own script that I made (as a reference) is below to do the work. It's highly recommended that you do the mapping first and make a tar file of the content from /Library/Preferences/OpenDirectory and just untar it to other Mac's.

.. code-block:: shell

   #!/bin/bash
   serverName=server1.ipa.example.com
   krb5Conf=/etc/krb5.conf
   krb5Tab=/etc/krb5.keytab
   pamDirectory=/etc/pam.d

   # Add SSL cert to chain
   mkdir /etc/ipa
   cd /etc/ipa
   curl -OL http://$serverName/ipa/config/ca.crt
   security add-trusted-cert -d -k /Library/Keychains/System.keychain -r trustRoot /etc/ipa/ca.crt
   
   # Stop and flushout the Open Directory
   /usr/sbin/dscacheutil -flushcache
   launchctl unload /System/Library/LaunchDaemons/com.apple.opendirectoryd.plist

   # Pull the plist and pam files needed for IPA and deploy them, this assumes you setup one mac and zipped up the configurations
   # You can try your hand at dsconfigldap before pam, but I could never figure it out, honestly.
   # Relevant tar: tar czf /tmp/macconfig.tar.gz /Library/Preferences/OpenDirectory/Configurations /etc/pam.d/authorization \ 
   #                /etc/pam.d/screensaver /etc/pam.d/passwd /etc/krb5.conf
   cd /tmp
   curl -OL http://$serverName/macconfig.tar.gz
   cd /
   tar xzf /tmp/macconfig.tar.gz
   
   # Add steps here for your keytab! Where are you getting it from?
   cp /tmp/mac.keytab /etc/krb5.keytab
   chown root:wheel /etc/krb5.keytab
   chmod 600 /etc/krb5.keytab

   # Start directory
   launchctl load /System/Library/LaunchDaemons/com.apple.opendirectoryd.plist
   sleep 30
  
   # Kill the loginwindow
   killall loginwindow

   # If the system doesn't reboot here, reboot now.

If you want to move your local files, you will need to tread lightly here. I personally believe it's always good to start fresh though. Look into the ditto command. I suppose something like this can work:

.. code-block:: shell

   # make sure you're logged in as a different account away from your local account
   % sudo su -
   root# cd /Users
   root# ditto localfolder networkfolder (or maybe an mv?)
   root# chown -R user:user folder
   root# /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P

Another issue you may run into, if you have been using your Mac with a local account for a while, a lot of directories in /Applications will be owned by localuser:staff or localuser:admin. It's recommended to fix those too. 

Discovery and Settings
''''''''''''''''''''''

The directory framework in MacOS has the ability to discover settings for a particular LDAP server that it is being connected to. FreeIPA does not contain the schema, plugins, nor the infrastructure to provide the same things (for example, mDNS/Avahi, among other things). There was a (WIP) plugin created in 2017 by abbra. However, it is unclear if this works at all, nor is it clear if it ever did and will in python3 (abbra noted at the time that it "installs" into python 2 directories, which hints to not being tested or working on python 3). Please see the following resources for discussion and information.

* `Pagure <https://pagure.io/freeipa/issue/4813>`__
* `freeipa-macosx-support <https://github.com/abbra/freeipa-macosx-support>`__

SUSE
++++

To setup openSUSE with FreeIPA, we'll need to do some manual work. This applies to SUSE 12 and up.

.. code-block:: shell
   
   # On an IPA server or client with the IPA utilities...
   % ipa host-add suse.example.com
   % /usr/sbin/ipa-getkeytab -s ipa.example.com -p host/suse.example.com -k /tmp/suse.keytab
   % scp /tmp/suse.keytab suse.example.com:/tmp/krb5.keytab
   
   # On the IPA client...
   % cp /tmp/krb5.keytab /etc
   % chmod 600 /etc/krb5.keytab
   % mkdir /etc/ipa
   % curl -o /etc/ipa/ca.crt http://ipa.example.com/ipa/config/ca.crt
   % curl -o /etc/pki/trust/anchors/ipa.example.com.crt http://ipa.example.com/ipa/config/ca.crt
   % update-ca-certificates
   % zypper install sssd sssd-ipa yast2-auth-client krb5-client openldap2-client cyrus-sasl-gssapi

   # Setup SSSD
   % vi /etc/sssd/sssd.conf
   [domain/example.com]
   cache_credentials = True
   krb5_store_password_if_offline = True
   ipa_domain = example.com
   ipa_hostname = suse.example.com
   # Client Specific Settings
   ipa_server = _srv_, ipa.example.com
   dns_discovery_domain = example.com
   # If we have a trust with domain resolution order
   #full_name_format = %1$s

   id_provider = ipa
   auth_provider = ipa
   access_provider = ipa
   chpass_provider = ipa

   ldap_tls_cacert = /etc/ipa/ca.crt

   [sssd]
   services = nss, sudo, pam, ssh
   domains = example.com

   [nss]
   filter_users = root,ldap,named,avahi,haldaemon,dbus,radiusd,news,nscd,tomcat,postgres
   homedir_substring = /home

   [pam]

   [sudo]

   [autofs]

   [ssh]

   # Setup kerberos
   % vi /etc/krb5.conf
   [libdefaults]
     default_realm = EXAMPLE.COM
     dns_lookup_realm = true
     dns_lookup_kdc = true
     rdns = false
     dns_canonicalize_hostname = false
     ticket_lifetime = 24h
     forwardable = true
     udp_preference_limit = 0
     default_ccache_name = KEYRING:persistent:%{uid}


   [realms]
     EXAMPLE.COM = {
       pkinit_anchors = FILE:/var/lib/ipa-client/pki/kdc-ca-bundle.pem
       pkinit_pool = FILE:/var/lib/ipa-client/pki/ca-bundle.pem
     }

   [domain_realm]
     .example.com = EXAMPLE.COM
     example.com = EXAMPLE.COM
     suse.example.com = EXAMPLE.COM

   # Setup pam
   % pam-config -a --sss --mkhomedir --mkhomedir-umask=0077 \
     --pwhistory --pwhistory-remember=5 --localuser --cracklib \
     --cracklib-minlen=14 --cracklib-dcredit=-1 --cracklib-ucredit=-1 \
     --cracklib-lcredit=-1 --cracklib-ocredit=-1 --cracklib-retry=3 --unix-sha512

   # Setup nsswitch (you can make it compat sss, but I use files sss)
   % sed -i.bak 's/compat$/files sss/g' /etc/nsswitch.conf
   % echo "sudoers: files sss" >> /etc/nsswitch.conf

   # Start sssd
   % systemctl enable sssd --now

   # Verify
   % id admin

In the case of having an IPA-AD trust, you may need to change a line in your pam configuration.

.. code-block:: shell

   % sed -i 's/use_first_pass/forward_pass/g' /etc/pam.d/common-auth-pc

   # The affected line should appear like the below
   auth    sufficient      pam_sss.so      forward_pass

HBAC
----

When we first setup our IPA servers, we had an option set to make it so hbac wasn't allowed for everyone. This way we have to create HBAC rules for our systems. I personally do this out of habit when working with IPA. What we need to do though is create an "admin" group that can login to all machines.

.. code-block:: shell

   % ipa idrange-show IPA.EXAMPLE.COM_id_range
     Range name: IPA.EXAMPLE.COM_id_range
     First Posix ID of the range: 686600000
     Number of IDs in the range: 200000
     First RID of the corresponding RID range: 1000
     First RID of the secondary RID range: 100000000
     Range type: local domain range
   % ipa group-add --gid=686610000 linuxadm
   % ipa group-add-member --users=flast linuxadm

**Note for AD Users**: In the event that your AD user or group of users will be an admin, you need to create an "external" group to map the user or users over. This isn't required if you don't have an AD trust.

.. code-block:: shell

   # Create an external group that the AD user/group goes into
   % ipa group-add --external linuxadm_external
   # Add the user (or group) into the external group
   % ipa group-add-member --users=aduser1@example.com linuxadm_external
   % ipa group-add-member --users=adgroup1@example.com linuxadm_external
   # Add the external group as a member of the IPA posix group.
   # aduser1 and adgroup1 are now effectively members of the linuxadm group in IPA.
   % ipa group-add-member --groups=linuxadm_external linuxadm

Now, let's create an HBAC for our Linux Administrator account for our group.

.. code-block:: shell

   % ipa hbacrule-add --hostcat=all --servicecat=all --desc='linux admins all access' linuxadm
   % ipa hbacrule-add-user --groups=linuxadm linuxadm
   % ipa hbactest --rules=All_Systems --user=flast --host=server1.ipa.example.com --service=sshd
   % ipa hbactest --rules=All_Systems --user=aduser1@example.com --host=server1.ipa.example.com --service=sshd

You might want to create an HBAC rule specifically for your IPA admin accounts to have ssh access to the IPA servers too. You can follow something like the above to make it possible. Or you can just add the IPA admins group into the HBAC rule we just made above.

.. note:: Group Types

   Groups in Active Directory have three types. These three types can actually change the behavior of how SSSD on the IPA domain controllers resolve them or if they'll even be resolvable at all. The three types are 'Domain Local', 'Global', and 'Universal'. If at all possible, avoid groups being 'Global'. Domain Local or Universal is recommended.

SUDO
----

Setting up sudo is relatively easy. RHEL 6 and newer for sssd supports IPA as a provider for sudo. Based on the last section, let's create a sample rule for our Linux admins that can login to every system, we want to ensure they can run all commands.

.. code-block:: shell

   % ipa sudorule-add --runasusercat=all --hostcat=all --cmdcat=all --desc='linux admins all sudo' all_linux_sudo
   % ipa sudorule-add-user --groups=linuxadm all_linux_sudo

You can make this a little more specific, such as /bin/bash as everyone or otherwise. It's your call here. If you want to create a sudo rule and add some commands to it, you can do something like this.

.. code-block:: shell

   % ipa sudorule-add sudo_rule
   % ipa sudorule-add-allow-command --sudocmds="/usr/bin/less" sudo_rule

Legacy Client Setup
-------------------

This applies to Solaris, Omnios, others based on Illumos.

Solaris 10
++++++++++

Setting up Solaris 10 as an IPA client is interesting in the fact that if you have a trust, things change (like where to look in the directory for users).

Create an ldif for your service account (optional)

.. code-block:: ldif

   dn: uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectclass: account
   objectclass: simplesecurityobject
   uid: solaris
   userPassword: secret123
   passwordExpirationTime: 20380119031407Z
   nsIdleTimeout: 0

The solaris system account is required. So now, add it in.

.. code-block:: shell

   % ldapadd -xWD 'cn=Directory Manager' -f /tmp/solaris.ldif

Now, set the nisdomain.

.. code-block:: shell

   % defaultdomain ipa.example.com
   % echo 'ipa.example.com' > /etc/defaultdomain

Configure kerberos.

.. code-block:: shell

   % vi /etc/krb5/krb5.conf
   [libdefaults]
   default_realm = IPA.EXAMPLE.COM
   dns_lookup_kdc = true
   verify_ap_req_nofail = false
   
   [realms]
   IPA.EXAMPLE.COM = {
   }
   
   [domain_realm]
   ipa.example.com = IPA.EXAMPLE.COM
   .ipa.example.com = IPA.EXAMPLE.COM
   
   [logging]
   default = FILE:/var/krb5/kdc.log
   kdc = FILE:/var/krb5/kdc.log
   kdc_rotate = {
    period = 1d
    version = 10
   }
   
   [appdefaults]
   kinit = {
   renewable = true
   forwardable= true
   }

Generate a keytab and bring it over.

.. code-block:: shell

   # on the ipa server
   % ipa host-add solaris10.example.com
   % ipa-getkeytab -s server1.ipa.example.com -p host/solaris10.example.com -k /tmp/solaris10.keytab
   
   # Transfer the keytab
   % scp /tmp/solaris10.keytab solaris10.example.com:/tmp
   
   # On the solaris 10 machine
   % cp /tmp/solaris10.keytab /etc/krb5/krb5.keytab
   % chmod 600 /etc/krb5/krb5.keytab
   % chmod 644 /etc/krb5/krb5.conf
   % chown root:sys /etc/krb5/*
   % kinit flast2@IPA.EXAMPLE.COM

Create the LDAP configurations, bring the certificate, and create an NSS database.

.. code-block:: shell

   % mkdir /etc/ipa /var/ldap
   % cd /etc/ipa
   % wget -O ipa.pem http://server1.ipa.example.com/ipa/config/ca.crt
   % certutil -A -n "ca-cert" -i /etc/ipa/ipa.pem -a -t CT -d .
   % cp * /var/ldap
   % vi /etc/ldap.conf
   base dc=ipa,dc=example,dc=com
   scope sub
   TLS_CACERTDIR /var/ldap
   TLS_CERT /var/ldap/cert8.db
   TLS_CACERT /var/ldap/ipa.pem
   tls_checkpeer no
   ssl off
   bind_timelimit 120
   timelimit 120
   uri ldap://server1.ipa.example.com
   sudoers_base ou=sudoers,dc=ipa,dc=example,dc=com
   pam_lookup_policy yes

Now init the ldap client.

.. warning:: No Secure Connection

   When using this, you are not creating a secure connection. The Solaris 10 SSL libraries are so old that they cannot work with the ciphers that FreeIPA has turned on.

.. note:: AD Trust - Different Trees

   If using an AD trust, you should use the second example, where it looks at the compat tree for users.

.. warning:: No Service Account

   If you have configured FreeIPA to not allow any anonymous connections, you will need to use a proxy account. We have provided the examples for this configuration.

.. code-block:: shell

   # Without AD Trust (no proxy)
   % ldapclient manual -a authenticationMethod=none \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # Without AD Trust (proxy)
   % ldapclient manual -a credentialLevel=proxy \
                       -a authenticationMethod=simple \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123" \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # With AD Trust (no proxy)
   % ldapclient manual -a authenticationMethod=none \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # With AD Trust (proxy)
   % ldapclient manual -a credentialLevel=proxy \
                       -a authenticationMethod=simple \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123" \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5


This should succeed. Once it succeeds, you need to configure pam and nsswitch. 

.. note:: AD Trust Information

   In the event you don't have an AD trust, you can change the "binding" lines to required, remove the pam_ldap lines, and change pam_krb5 lines to read "required"

.. code-block:: shell

   % vi /etc/pam.conf

   # Console
   login auth requisite    pam_authtok_get.so.1
   login auth sufficient   pam_krb5.so.1
   login auth required     pam_unix_cred.so.1
   login auth required     pam_dial_auth.so.1
   login auth sufficient   pam_unix_auth.so.1 server_policy
   login auth sufficient   pam_ldap.so.1

   rlogin auth sufficient  pam_rhosts_auth.so.1
   rlogin auth requisite   pam_authtok_get.so.1
   rlogin auth required    pam_dhkeys.so.1
   rlogin auth sufficient  pam_krb5.so.1
   rlogin auth required    pam_unix_cred.so.1
   rlogin auth sufficient  pam_unix_auth.so.1 server_policy
   rlogin auth sufficient  pam_ldap.so.1
   
   # Needed for krb
   krlogin auth required   pam_unix_cred.so.1
   krlogin auth sufficient pam_krb5.so.1
   
   # Needed for krb
   krsh auth required      pam_unix_cred.so.1
   krsh auth required      pam_krb5.so.1
   
   # ?
   ppp auth requisite      pam_authtok_get.so.1
   ppp auth required       pam_dhkeys.so.1
   ppp auth sufficient     pam_krb5.so.1
   ppp auth required       pam_dial_auth.so.1
   ppp auth binding        pam_unix_auth.so.1 server_policy
   ppp auth sufficient     pam_ldap.so.1
   
   # Other, used by sshd and "others" as a fallback
   other auth requisite    pam_authtok_get.so.1
   other auth required     pam_dhkeys.so.1
   other auth sufficient   pam_krb5.so.1
   other auth required     pam_unix_cred.so.1
   other auth sufficient   pam_unix_auth.so.1 server_policy
   other auth sufficient   pam_ldap.so.1
   other account requisite pam_roles.so.1
   other account required  pam_projects.so.1
   other account binding   pam_unix_account.so.1 server_policy
   other account sufficient pam_krb5.so.1
   other account sufficient pam_ldap.so.1
   other session required  pam_unix_session.so.1
   other password required pam_dhkeys.so.1
   other password requisite pam_authtok_get.so.1
   other password requisite pam_authtok_check.so.1 force_check
   other password required pam_authtok_store.so.1 server_policy
   
   # passwd and cron
   passwd auth binding    pam_passwd_auth.so.1 server_policy
   passwd auth sufficient pam_ldap.so.1
   cron account required  pam_unix_account.so.1
   
   # SSH Pubkey - Needed for openldap and still probably needed
   sshd-pubkey account required pam_unix_account.so.1

.. code-block:: shell

   % vi /etc/nsswitch.conf
   
   # Below are just the minimum changes
   passwd:     files ldap [NOTFOUND=return]
   group:      files ldap [NOTFOUND=return]
   sudoers:    files ldap
   netgroup:   ldap
   # the rest here are just here, up to you if you choose to set them.
   hosts:      files dns
   ipnodes:    files dns
   ethers:     files ldap
   publickey:  files ldap
   automount:  files ldap

You can test now if you'd like.

.. code-block:: shell

   bash-3.2# ldaplist -l passwd flast2
   dn: uid=flast2,cn=users,cn=compat,dc=ipa,dc=example,dc=com
           cn: First Last
           objectClass: posixAccount
           objectClass: ipaOverrideTarget
           objectClass: top
           gidNumber: 1006800001
           gecos: First Last
           uidNumber: 1006800001
           ipaAnchorUUID: :IPA:ipa.example.com:8babb9a8-5aaf-11e7-9769-00505690319e
           loginShell: /bin/bash
           homeDirectory: /home/first.last2
           uid: first.last2

I recommend setting up sudo at least... if you want to use sudo, install the sudo-ldap from sudo.ws for Solaris 10.

Solaris 11 and Omnios/Illumos
+++++++++++++++++++++++++++++

Solaris 11 and Omnios share similar configuration to Solaris 10. There are a couple of manual things we have to do, but they are trivial. Solaris 11/Omnios will use TLS and sudo should just work.

.. note:: AD Groups

   In Solaris 10, users who logged in with AD users (with their short name) would appear as their full name (name@domain). This allowed their groups to fully resolve. However, in Solaris 11.4, this was not the case. Short name logins will work but your groups will not resolve as the compat tree uses the full name. To avoid running into this problem, you should be on at least SRU 11.4.7.4.0

Below is for the service account like in the previous section, here as a reference.

.. code-block:: ldif

   dn: uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectclass: account
   objectclass: simplesecurityobject
   uid: solaris
   userPassword: secret123
   passwordExpirationTime: 20380119031407Z
   nsIdleTimeout: 0

.. code-block:: shell

   % ldapadd -xWD 'cn=Directory Manager' -f /tmp/solaris.ldif

Now, set the nisdomain.

.. code-block:: shell

   % defaultdomain ipa.example.com
   % echo 'ipa.example.com' > /etc/defaultdomain

Configure kerberos.

.. code-block:: shell

   % vi /etc/krb5/krb5.conf
   [libdefaults]
   default_realm = IPA.EXAMPLE.COM
   dns_lookup_kdc = true
   verify_ap_req_nofail = false

   [realms]
   IPA.EXAMPLE.COM = {
   }

   [domain_realm]
   ipa.example.com = IPA.EXAMPLE.COM
   .ipa.example.com = IPA.EXAMPLE.COM

   [logging]
   default = FILE:/var/krb5/kdc.log
   kdc = FILE:/var/krb5/kdc.log
   kdc_rotate = {
    period = 1d
    version = 10
   }

   [appdefaults]
   kinit = {
   renewable = true
   forwardable= true
   }

Generate a keytab and bring it over.

.. code-block:: shell

   # on the ipa server
   % ipa host-add solaris11.example.com
   % ipa-getkeytab -s server1.ipa.example.com -p host/solaris11.example.com -k /tmp/solaris11.keytab
   
   # Transfer the keytab
   % scp /tmp/solaris11.keytab solaris11.example.com:/tmp
   
   # On the solaris 11 machine
   % cp /tmp/solaris11.keytab /etc/krb5/krb5.keytab
   % chmod 600 /etc/krb5/krb5.keytab
   % chmod 644 /etc/krb5/krb5.conf
   % chown root:sys /etc/krb5/*

   # Check the keytab
   % klist -ket /etc/krb5/krb5.keytab

   # Test that you can kinit
   % kinit flast2@IPA.EXAMPLE.COM

Create the LDAP configurations, bring the certificate, and create an NSS database.

.. note:: Solaris 11.3 vs 11.4

   11.3 and 11.4 require different configurations. Please take note of that if you still have 11.3 or earlier systems. Omnios may require a different configuration. Test 11.3 and 11.4 to verify this. You can enable sudoers debug to assist.


.. code-block:: shell

   % mkdir /etc/ipa /var/ldap
   % cd /etc/ipa
   % wget -O ipa.pem http://server1.ipa.example.com/ipa/config/ca.crt
   % cp * /var/ldap
   % vi /etc/ldap.conf
   base dc=ipa,dc=example,dc=com
   scope sub
   bind_timelimit 120
   timelimit 120
   uri ldap://server1.ipa.example.com
   sudoers_base ou=sudoers,dc=ipa,dc=example,dc=com
   pam_lookup_policy yes
   # 11.3
   TLS_CACERTDIR /var/ldap
   TLS_CERT /var/ldap/cert8.db
   ssl on
   tls_checkpeer no
   # 11.4
   TLS_CACERTDIR /var/ldap
   ssl start_tls
   tls_checkpeer no

Now init the ldap client. We actually get to use a secure connection here. Kerberos is hit or miss, could never get sasl/GSSAPI to work.

.. note:: AD Trust - Different Trees

   If using an AD trust, you should use the second example, where it looks at the compat tree for users.

.. warning:: No Service Account

   If you have configured FreeIPA to not allow any anonymous connections, you will need to use a proxy account. We have provided the examples for this configuration.

.. code-block:: shell

   # Without AD Trust (no proxy)
   % ldapclient manual -a authenticationMethod=tls:simple \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # Without AD Trust (proxy)
   % ldapclient manual -a authenticationMethod=tls:simple \
                       -a credentialLevel=proxy \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123" \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # With AD Trust (no proxy)
   % ldapclient manual -a authenticationMethod=tls:simple \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

   # With AD Trust (proxy)
   % ldapclient manual -a authenticationMethod=tls:simple \
                       -a credentialLevel=proxy \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123" \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com \
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com" \
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5

This should succeed. Once it succeeds, you need to configure pam and nsswitch.

.. code-block:: shell

   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/sudoer = astring: "files ldap"' 
   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/password = astring: "files ldap [NOTFOUND=return]"' 
   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/group = astring: "files ldap [NOTFOUND=return]"' 

   % /usr/sbin/svcadm refresh svc:/system/name-service/switch
   % /usr/sbin/svcadm restart svc:/system/name-service/switch
   % /usr/sbin/svcadm restart ldap/client

.. note:: AD Trust Information

   In the event you don't have an AD trust, you can change the "binding" lines to required, remove the pam_ldap lines, and change pam_krb5 lines to read "required"

.. code-block:: shell

   % vi /etc/pam.d/login
   auth definitive         pam_user_policy.so.1
   auth requisite          pam_authtok_get.so.1
   auth required           pam_dhkeys.so.1
   auth sufficient         pam_krb5.so.1
   auth required           pam_unix_cred.so.1
   auth sufficient         pam_unix_auth.so.1 server_policy
   auth sufficient         pam_ldap.so.1

   % vi /etc/pam.d/other
   auth definitive         pam_user_policy.so.1
   auth requisite          pam_authtok_get.so.1
   auth required           pam_dhkeys.so.1
   auth sufficient         pam_krb5.so.1
   auth required           pam_unix_cred.so.1
   auth sufficient         pam_unix_auth.so.1 server_policy
   auth sufficient         pam_ldap.so.1
   
   account requisite       pam_roles.so.1
   account definitive      pam_user_policy.so.1
   account binding         pam_unix_account.so.1 server_policy
   account sufficient      pam_krb5.so.1
   account sufficient      pam_ldap.so.1
   
   session definitive      pam_user_policy.so.1
   session required        pam_unix_session.so.1
   
   password definitive     pam_user_policy.so.1
   password include        pam_authtok_common
   password sufficient     pam_krb5.so.1
   password required       pam_authtok_store.so.1 server_policy
   
   % vi /etc/pam.d/sshd-pubkey
   account required        pam_unix_account.so.1

You can test now if you'd like.

.. code-block:: shell

   root@solaris11:~# ldaplist -l passwd flast2
   dn: uid=flast2,cn=users,cn=compat,dc=ipa,dc=example,dc=com
           cn: First Last
           objectClass: posixAccount
           objectClass: ipaOverrideTarget
           objectClass: top
           gidNumber: 1006800001
           gecos: First Last
           uidNumber: 1006800001
           ipaAnchorUUID: :IPA:ipa.example.com:8babb9a8-5aaf-11e7-9769-00505690319e
           loginShell: /bin/bash
           homeDirectory: /home/first.last2
           uid: first.last2

Automated Scripts
+++++++++++++++++

I at one point built a bunch of scripts to automate Solaris servers talking to IPA `here <https://github.com/nazunalika/useful-scripts/tree/master/freeipa>`__. This may or may not be of use to you. Though if you have problems, file a github issue and we can address it.

Legacy HBAC
+++++++++++

For HBAC to work on Solaris, you will need to compile the pam_hbac module found `here <https://github.com/jhrozek/pam_hbac>`__. I would clone the current master branch or download the master.zip to your Solaris system. Each OS has their set of instructions for compiling. 

First, create the following system account. We will need this when we are configuring our legacy clients.

::

   dn: uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectClass: account
   objectClass: simplesecurityobject
   objectClass: top
   uid: hbac
   userPassword: password

Solaris 10
''''''''''

.. code-block:: shell

   % /opt/csw/bin/pkgutil -i -y libnet ar binutils gcc4g++ glib2 libglib2_dev gmake
   % /opt/csw/bin/pkgutil -i -y libnet ar binutils gcc4g++ glib2 libglib2_dev gmake
   % PATH=$PATH:/opt/csw/bin
   % export M4=/opt/csw/bin/gm4
   % autoconf -o configure
   % autoreconf -i

   # Yes, SSL must be disabled for Solaris 10 to work. The libraries are too old.
   # You may or may not need to set CFLAGS, CXXFLAGS, and LDFLAGS with -m32
   % ./configure AR=/opt/csw/bin/gar --with-pammoddir=/usr/lib/security --sysconfdir=/etc/ --disable-ssl --disable-man-pages
   % make
   % make install

Solaris 11
''''''''''

.. code-block:: shell

   % pkg install autoconf libtool pkg-config automake gcc docbook
   % autoreconf -if
   % ./configure --with-pammoddir=/usr/lib/security --mandir=/usr/share/man --sysconfdir=/etc/
   % make
   % make install

Omnios
''''''

.. code-block:: shell

   % pkg install developer/build/autoconf developer/build/libtool \
                 developer/pkg-config developer/build/automake    \
                 developer/gcc48 system/header developer/object-file \
                 developer/linker
   % autoreconf -if
   % ./configure --with-pammoddir=/usr/lib/security --mandir=/usr/share/man --sysconfdir=/etc/
   % make
   % make install

pam_hbac.conf
'''''''''''''

.. code-block:: shell

   % vim /etc/pam_hbac.conf

   # Replace client with your server's FQDN
   URI = ldap://server.ipa.example.com
   BASE = dc=ipa,dc=example,dc=com
   BIND_DN = uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   BIND_PW = password
   SSL_PATH = /var/ldap
   HOST_NAME = client

PAM Configuration
'''''''''''''''''

.. code-block:: shell

   # Solaris 10 - /etc/pam.conf
   # Modify the other account section... It should come at the end of the account blocks.
   . . .
   other account required pam_hbac.so ignore_unknown_user ignore_authinfo_unavail

   # Solaris 11 - /etc/pam.d/other
   # Same here, only modify the account section
   . . .
   account required        pam_hbac.so ignore_unknown_user ignore_authinfo_unavail

In the event you cannot login or things aren't working the way you'd expect, add 'debug' to the end of the pam_hbac line and watch /var/log/authlog for errors.

Login with AD Users to Legacy Clients
+++++++++++++++++++++++++++++++++++++

For AD users to be able to login to legacy clients, you have to enable system-auth to the IPA servers. Without it, users will be denied access, regardless of HBAC controls or if you're using the pam_hbac module.

.. code-block:: shell

   % ipa hbacsvc-add system-auth
   % ipa hbacrule-add legacy_client_auth
   % ipa hbacrule-add-host --hostgroups=ipaservers legacy_client_auth
   % ipa hbacrule-mod --usercat=all legacy_client_auth

Legacy Active Directory Trust Notes
+++++++++++++++++++++++++++++++++++

This section isn't really a walk through, but it's more of notes and such.

Domain Resolution Order Oddness
'''''''''''''''''''''''''''''''

If using domain resolution order, AD users get double uid attributes - but only if they login with their shortname. If they login with fqdn, double uid's do not occur. But shortnames do not work anymore. Have to restart the directory server to make short names work again.

Solaris Weirdness
'''''''''''''''''

If using domain resolution order, Solaris 10 gets the group resolution correct for short named AD users. Solaris 11 does not unless you are on SRU 11.4.7.4.0 or newer.

Domain Options
--------------

This section goes over "situational" scenarios. These scenarios are reflective of the environment in which IPA is installed and not all will fit into your environment. These are more or less common situations that could occur during an IPA deployment or even post-deployment. 

Remove @realm for AD users
++++++++++++++++++++++++++

A common scenario is that IPA and AD will have a trust, but there will not be any IPA users with the exception of the engineering team for managing IPA itself. The common theme is that because of this, the engineers and customers would rather not login with username@realm.


.. note:: Info

   The following is only applicable in an IPA-AD trust. An IPA-only scenario would not require any of these steps and most pieces would work natively (no @realm, sudo, hbac).

   In the event that you are in an IPA-AD scenario, please take note that this can adversely affect legacy clients. This will cause ldapsearches that are done in the compat tree to display multiple uid attributes. In most cases, this is fine and the user can still login without the realm name. The whoami and id commands will show the domain. There's no workaround for this. 

On the IPA servers, you will need to set the domain resolution order. This was introduced in 4.5.0. 

.. code-block:: shell

   % kinit admin
   % ipa config-mod --domain-resolution-order="example.com:ipa.example.com"

After, you will need to clear out your SSSD cache.

.. code-block:: shell

   # sss_cache -E is insufficient for this.
   % systemctl stop sssd
   % rm -rf /var/lib/sss/db/*
   % systemctl start sssd

The below is optional. It will remove the @realm off the usernames, like on the prompt or id or whoami commands. Only do this if required. **Only do this on the clients. Do not make this change on an IPA replica.**

.. code-block:: shell

   # vi /etc/sssd/sssd.conf

   [domain/ipa.example.com]
   . . .
   full_name_format = %1$s

This will ensure EL7 and EL8 clients resolve the AD domain first when attempting logins and optionally drop the @realm off the usernames.

However, for EL6 clients, additional changes on the client side is required. Since the sssd in EL6 does not support domain resolution order, you will either need to modify /etc/sssd/sssd.conf with "default_domain_suffix" or install a later version of sssd from copr. Below assumes you are using 1.13.3 from the base.

.. code-block:: shell

   # vi /etc/sssd/sssd.conf
   
   [domain/ipa.example.com]
   . . .
   full_name_format = %1$s

   [sssd]
   . . .
   default_domain_suffix = example.com

AD and IPA group names with short names
+++++++++++++++++++++++++++++++++++++++

You may notice that your clients have intermittent issues with name resolution when the following are true:

* Groups (or users) have the same names in both IPA and AD
* You are using domain resolution order
* You are shortening names on the clients

You may want to actually search for them to identify the errant groups and then correct them. You can correct them either on the AD or IPA side. I would opt for the IPA side.

.. code:: shell

   % kinit admin@IPA.EXAMPLE.COM
   % vi /tmp/dupecheck.sh
   #!/bin/bash
   for x in ${ARRAY[*]} ; do
     ldapsearch -x -b "DC=example,DC=com" -h example.com -LLL -w 'PASSWORD' -D 'username@example.com' samaccountname="$x" samaccountname | grep -q $x
     if [[ $? -eq 0 ]]; then
       echo "$x: DUPLICATE"
     fi
   done

   % bash /tmp/dupecheck.sh

If you run into any duplicates, they should show up in a list for you address.

.. note:: sAMAccountName vs CN

   The "CN" and "sAMAccountName" attributes are not the same in AD, depending on who made the group or other factors. The sAMAccountName attribute is the value used to determine names from AD, whether you are enrolled with AD or the IPA server SSSD is pulling the information. This is why we are searching for that attribute, and not the CN.

Sites and AD DC's
+++++++++++++++++

By creating a subdomain section in `/etc/sssd/sssd.conf` on an IPA server, it is possible to set an AD Site or AD server(s) directly in SSSD. By default, sssd tries to do location based discovery. There may be a case where this isn't possible (eg, only a set of AD servers may only be contacted in certain "air gapped" networks).

.. code:: shell

   [domain/ipa.example.com/example.com]
   # If you want a site
   ad_site = Site_Name
   # If you want a server(s)
   ad_server = dc1.example.com, dc2.example.com
   # A backup?
   ad_backup_server = dc3.example.com, dc4.example.com

If you don't have access or a way to find the sites using the Windows tools, you can run an ldapsearch to find it (or an equivalent ldap browsing tool).

.. code:: shell

   % ldapsearch -x -h example.com -s one -WD 'CN=username,CN=Users,DC=example,DC=com' \
     -b 'CN=Sites,CN=Configuration,DC=example,DC=com' cn

This should report back your sites. If you want to know the servers for those sites (in case you don't want to deal with the sites, but just the DC's themselves), you use ldapsearch but use the base DN of the site name.

.. code:: shell

   % ldapsearch -x -h example.com -WD 'CN=username,CN=Users,DC=example,DC=com' \
     -b 'CN=Servers,CN=Site_Name,CN=Sites,CN=Configuration,DC=example,DC=com' dnsHostName

.. note:: Hardcoded DC's

   If the DC's change at any time and they are harded in your sssd.conf, it is up to you to know when new controllers are being added or removed as to not disrupt the connectivity from IPA to AD when performing user or group lookups.

RHEL 6 SUDO and Default Domain Suffix
+++++++++++++++++++++++++++++++++++++

This issue with the above section is that once you do this, sudo rules will begin failing, they will no longer work for RHEL 6. This is because sssd was changed to look for cn=sudo rather than ou=sudoers. To enable the compatibility fall back, you will need to install the latest SSSD from COPR.

Set Default Shell for AD Users
++++++++++++++++++++++++++++++

By default, after a trust has been established, the shell all AD users get is /bin/sh. To change this, you must change the sssd.conf on the IPA masters.

.. code:: shell

   % vi /etc/sssd/sssd.conf
   [domain/ipa.example.com]
   . . .
   default_shell = /bin/bash

   % systemctl restart sssd

Automated Kerberos Principals
-----------------------------

Once in a great while, we run into situations where we need to have an automated process for creating principals and keytabs. This section takes a look at some of those examples that we've ran into.

Hadoop/Cloudera
+++++++++++++++

This assumes you are using Cloudera Manager and not Ambari in any form.

.. warning:: DNS Information

   It is *highly* likely that if you are using AWS, your nodes are getting stupid names like compute.internal. While there is a `a way to change this <https://blog.cloudera.com/custom-hostname-for-cloud-instances/>`__ if you don't change it, you will need to rely on something like DNSMASQ to allow the nodes to communicate with FreeIPA. FreeIPA *will* be upset about the stupid names because it can't do a rDNS lookup.

Cloudera Manager Woes
'''''''''''''''''''''

It is likely you have Cloudera/Hadoop, it is also very likely you (or another team) are deploying and using Cloudera Manager (or Director?). You may be running into issues that involve direct Active Directory integration. Maybe you're moving away from a standalone LDAP system over to Active Directory or even FreeIPA. Maybe you have FreeIPA in an AD trust but the users or contractors absolutely insist on using AD against their better judgement, despite the problems they're running into. Whatever the scenario is, we feel your pain. Here are some things you should probably know:

* Cloudera Manager (or Director?) supports Active Directory out of the box and obviously not FreeIPA despite the devs wanting to work something out back in 2015

  * Ambari has support for FreeIPA, but we are focusing on Cloudera Manager here.
  * Cloudera Manager supports custom keytab retrieval scripts

* Hostnames that are longer than 15 characters, regardless of the cloud provider or onprem setup, will ultimately fail

  * The NETBIOS limit in AD is 16 characters, which is 15 + $ at the end - This means hosts will enroll on top of themselves and your cluster will be broken

FreeIPA does not have the name limitation and using an AD trust, AD users can freely use Hadoop when the cluster is properly setup. Enrolling the cluster nodes into FreeIPA and using a custom retrieval script will solve most (if not all) of the issues you may run into as well when it comes to keytabs, which Hadoop heavily relies on. The custom script is simply because Cloudera by default likes having direct access to the kerberos infrastructure, which is a no-go for FreeIPA.

The Solution
''''''''''''

To summarize, here is our proposed solution:

* Create an account called cdh
* Create a role called "Kerberos Managers" and apply the following privileges:

  * System: Manage Host Keytab
  * System: Manage Host Keytab Permissions
  * System: Manage Service Keytab
  * System: Manage Service Keytab Permissions
  * System: Manage User Principals (was not actually used, but who knows what we could use the role for later)

* Apply the role to the cdh account
* Create a custom script they could use to enroll the servers into FreeIPA (out of scope here)
* Create a custom script that utilizes the cdh account to create services

So let's create the necessary things we need.

.. code-block:: shell

   # Create the account
   # Note... you may want to make this account non-expiring since it's just a service account
   % ipa user-add --first="Cloudera" --last="Key Manager" cdh
   
   # Create the Kerberos Managers role
   % ipa role-add "Kerberos Managers"
   
   # Create the kerberos manager privilege
   % ipa privilege-add "Privileges - Kerberos Managers"
   % ipa privilege-add-permission "Privileges - Kerberos Managers" \
       --privileges="System: Manage Host Keytab" \
       --privileges="System: Manage Host Keytab Permissions" \
       --privileges="System: Manage Service Keytab" \
       --privileges="System: Manage Service Keytab Permissions" \
       --privileges="System: Manage User Principals"

   # Add the privilege to the role
   % ipa role-add-privilege "Kerberos Managers" \
       --privileges="Privileges - Kerberos Managers"

   # Add the user to the role
   % ipa role-add-member --users=cdh "Kerberos Managers"

   # Optionally, we can export the keytab for the user with a password
   # You will see why in the next script
   % ipa-getkeytab -p cdh@EXAMPLE.COM -k cdh.keytab -P

Now we need our special kerberos keytab retrieval script.

.. code-block:: shell

   #!/bin/bash
   # Created by: @nazunalika - Louis Abel
   # Purpose: To retrieve keytabs for Cloudera / Hadoop
   # https://github.com/nazunalika/useful-scripts

   # Disclaimer: We do not take responsibilities for breaches or misconfigurations of
   #             software. Use at your own risk

   # Variables
   # This can be anywhere, but it SHOULD be secure with at least 600 permissions
   CDHKT="/root/.cdh/cdh.keytab"
   CDHUSER="cdh"
   IPAREALM="EXAMPLE.COM"
   # This can be any server. You could make an array and have it randomly selected
   IPASERVER="ipa01.example.com"

   # Where is this going?
   DESTINATION="$1"
   # The full principal for the keytab in question
   FULLPRINC="$2"
   # Shortened name
   PRINC=$(echo $FULLPRINC | sed "s/\@$(echo $IPAREALM)//")

   00_kinitUser() {
     # Pick what suits you best, we prefer using a keytab
     # Password based kinit, based on the keytab we created prior!
     # You could also have this in a file somewhere, I guess. Just
     # has to be secured.
     echo ThisIsAWeakPassword | kinit $CDHUSER@$IPAREALM

     # Keytab based kinit, obviously we created it before right? It just needs to be
     # on the right system, deployed in some secure manner
     #kinit -kt $CDHKT $CDHUSER@$IPAREALM
     if [[ $? == "1" ]]; then
       echo FAILED TO KINIT
       exit
     fi
   }

   01_createPrinc() {
     echo "INFO: Checking for existing principle"
     if ipa service-find $FULLPRINC; then
       echo "INFO: Principle found"
     else
       echo "INFO: Not found, creating"
       ipa service-add $FULLPRINC
     fi
   }

   02_createServiceAllows() {
     # We need to allow the service to create and retrieve keytabs
     echo "INFO: Ensuring service allows to create and retrieve keytabs"
     ipa service-allow-create-keytab --users=$CDHUSER $FULLPRINC
     ipa service-allow-retrieve-keytab --users=$CDHUSER $FULLPRINC

     # Let's retrieve the keytabs
     if ipa service-show $FULLPRINC | grep 'Keytab' | grep 'False'; then
       echo "INFO: Creating keytab for $FULLPRINC to $DESTINATION"
       ipa-getkeytab -s $IPASERVER -p $PRINC -k $DESTINATION
     else
       echo "INFO: Retriving keytab for $FULLPRINC to $DESTINATION"
       ipa-getkeytab -r -s $IPASERVER -p $PRINC -k $DESTINATION
     fi
   }

   00_kinitUser
   01_createPrinc
   02_createServiceAllows

   kdestroy
   exit 0

Place the above script in a file that is accessible by the cloudera manager such as `/usr/local/bin/getKeytabsCDH.sh` and ensure it is owned by cloudera-scm with a permission set of 775.

During the kerberos wizard, stop when you are verifying the "cdh" user. You will need to set the configuration for "Custom Kerberos Keytab Retrieval Script" to `/usr/local/bin/getKeytabsCDH.sh` and then you're almost there. [#f3]_

An important tidbit is currently RHEL/CentOS 7+ and higher use memory based keytabs and java doesn't support them. [#f4]_ Because of this, the /etc/krb5.conf should be modified.

.. code-block:: shell

   % cat /etc/krb5.conf
   . . .
   # Make sure the below is commented
   # default_ccache_name = KEYRING:persistent:%{uid}
   . . .

DNS Forwarding
--------------

DNS Forwarding to DoT
+++++++++++++++++++++

Presently, FreeIPA does not support DoT (DNS over TLS) nor DoH (DNS over HTTPS) (this appears to be a bind limitation and we can't find documentation that says otherwise). However, it is possible to setup unbound to do the forwarding for you, in which you tell your bind servers (or in this case, the bind DNS servers in your IPA domain) to forward to that unbound server for all forwarding.

.. note:: Keep it Separate

   It is recommended to keep your unbound service separate from the IPA servers. Spin up another instance in your network that will run unbound or run it on a standalone bind server that you may have on a separate port.

To forward to the unbound service, modify the DNS global configuration in IPA:

.. code:: shell

   # Replace 10.100.0.224 with the IP of your unbound instance
   % ipa dnsconfig-mod --forward-policy=only --forwarder='10.100.0.224'

   # Add 'port xxxx' if you have set unbound to another port
   % ipa dnsconfig-mod --forward-policy=only --forwarder='10.100.0.224 port 9553'

.. rubric:: Footnotes

.. [#f1] For more information on DNS for FreeIPA, please read `this page <https://www.freeipa.org/page/DNS>`__ and `this page <https://www.freeipa.org/page/Deployment_Recommendations#DNS>`__
.. [#f2] The -P asks for the password of the username in question, that way it is cached right away. The directory service on the system then has credentials to compare to. I have found that sometimes if you don't use -P, even if you're logged in as the account, the password does not get cached and you'll get stuck at a background image the next time you login. Again, this is only sometimes. Your mileage may vary here.
.. [#f3] Please read `this page <https://www.cloudera.com/documentation/enterprise/latest/topics/sg_keytab_retrieval_script.html>`__ for more information.
.. [#f4] This may have changed. However it is up to you to test if this is the case.
