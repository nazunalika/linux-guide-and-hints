FreeIPA
^^^^^^^

.. meta::
    :description: How to install/configure FreeIPA on CentOS 7 with replicas, configuring clients for FreeIPA, policies (eg sudo), and host based access control methods.

This tutorial goes over how to install and configure FreeIPA on CentOS 7 servers with replicas, as well as configuring client machines to connect and utilize FreeIPA resources, policies (eg sudo), and host based access control methods. We will also go over a scenario of configuring a trust with an Active Directory domain. The client setup will work for Fedora users as the packages are the same, just newer versions.

.. contents::

Overview
--------

FreeIPA is an integrated security information management system combining Linux, a Directory Server (389), Kerberos, NTP, DNS, DogTag. It's a system that can be loosely compared to Active Directory in what it attempts to solve for Linux and UNIX clients and even mixed environments. While it is **not** an active directory, it is an integrated Identity and Authentication solution for Linux/UNIX environments, which means it does not support Windows clients. One problem that FreeIPA attempts to solve is giving back control to the Linux/UNIX administration teams of access, authentication, and authorization rather than trying to integrate directly into Active Directory, where the controls do not work the same or do not work at all. And because of this, no third party software is required to be installed.

Requirements
------------

Here are the list of requirements below.
 
* CentOS 7 or Fedora 29+
* An active internet connection to install the packages required or available internal mirrors
* DNS delegation (if a DNS appliance or server already exists)

Tutorial Preface, Notes, and Recommendations
--------------------------------------------

.. warning:: Potential Pitfalls!

   * Leave SELinux enabled at all times. You will not run into SELinux issues.
   * FreeIPA runs a lot better when it controls the DNS domain that it is given - It is recommended DNS is delegated or that FreeIPA run DNS entirely.
   * FreeIPA does not run DHCP. ISC DHCP can be configured to do dynamic DNS updates to FreeIPA if FreeIPA has full control over DNS.

.. note:: Recommended Information

   * Keep selinux set to **enforcing**
   * DNS - You **must** be careful when using DNS. Here are recommendations. [#f1]_

     * Recommendation 1: FreeIPA runs your entire DNS for your network - This requires the DHCP servers to set the DNS servers to the IPA servers. This will be useful in the case that your clients will have their SSH keys added as SSHFP records to DNS when enrolled as clients. This also gives you the added benefit of a client updating its own DNS entries (A and PTR records) if the client is DHCP enabled and the IP changes.
     * Recommendation 2: FreeIPA is delegated a subdomain of a domain used already in the network - Do not attempt to hijack a domain already being used. This assumes you may have Dynamic DNS enabled in the current DNS infrastructure or perhaps everything is static addressing where A/AAAA/PTR records do not change too often.
     * Recommendation 3: If the above is not possible, the IPA servers won't need control of DNS. Instead, it will spit out the necessary zone information for IPA for the zone you will have IPA in.

   * Consider setting up a trust with Active Directory if you are in a mixed environment, eg Active Directory already exists
   * IPA servers should have static assigned addresses - Configured via nmcli or directly in /etc/sysconfig/network-scripts/ifcfg-*

.. note:: Trust Information

   If you are in a mixed environment (both Windows and Linux/UNIX), it is recommended to setup a trust between FreeIPA and Active Directory. Because of this, they will need to be in different domains (eg, ad.example.com and ipa.example.com or example.com and ipa.example.com, depending on what the current DNS controllers or appliances are). This way, you do not have to create duplicate users if a windows user logs into Linux resources. 
.. note:: NOFILE limits

   You may run into file descriptor limit problems depending on the IPA version you are using and/or patch level. Ensure that /etc/sysconfig/dirsrv.systemd has LimitNOFILE set to at least 16384.


DNS
---

As noted in the previous section, you must keep in mind that you should not hijack a domain. While FreeIPA does have DNS capabilities and will allow you to do some things like create zones (forward/reverse) and many types of records, FreeIPA should not be considered a full on DNS solution for a network. It does not support "views", meaning you cannot have an internal view and an external view, assuming your domain is both an external and internally routable domain. In the event that you do need to have "views", you should setup a separate DNS server and perform delegation of your domain.

Here are some common ways you can setup FreeIPA and DNS.

In this setup, it would allow clients that are DHCP to automatically update their own IP address as they come online or get a new IP automatically. They would have their own permissions to make such changes in the zones (where sssd+kerberos do the work). 

Delegation
++++++++++

Throughout this guide, you will find we will be using DNS delegation as it would be a more real world example of bringing in FreeIPA to an environment that is already in place, working, with a DNS hosted by AD or by an appliance. The guide will assume you have a DNS server/appliance that controls a domain like example.com and delegates ad.example.com and ipa.example.com. Using this type of setup, it is not required for clients to have entries in the IPA domain. In fact, they can be in other domains as long as they have A/AAAA/PTR records associated with them. This assumes that there could be dynamic dns associated with DHCP or everything is static and lives in the parent zone (eg example.com outside of ipa.example.com).

You can setup already existing DNS servers to delegate an entire domain or a subdomain for FreeIPA. This way, you don't overlap with a domain that's already in use. So for example, if AD owns example.com, you could have AD delegate ipa.example.com or even example.net. If AD is not the DNS provider for the environment, you can have the appliance delegate the domain in the same manner. 

Let's say I'm using bind, I own a domain called example.com that's already being used. My AD servers are delegated ad.example.com and IPA servers are delegated ipa.example.com. My example.com zone would have these records to deal with it:

.. code-block:: none

   $ORIGIN angelsofclockwork.net.
   ipa                     NS      np-ipa01.ipa
                           NS      np-ipa02.ipa
   ad                      NS      np-ad01.ad
                           NS      np-ad02.ad
   $ORIGIN ipa.angelsofclockwork.net.
   np-ipa01                A       10.200.0.230
   np-ipa02                A       10.200.0.231
   $ORIGIN ad.angelsofclockwork.net.
   np-ad01                 A       10.200.0.232
   np-ad02                 A       10.200.0.233

It is recommended that your DNS server does not perform forwarding. If you are performing any forwarding, you will need to put forwarders { }; inside the zone's configuration in the named.conf.

This way, both AD and IPA are both delegated their own subdomains that they control. This ensures both AD and IPA can do what they need to do, DNS wise. 

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

.. code-block:: bash

   % hostnamectl set-hostname server1.ipa.example.com
   % nmcli con mod ens192 ipv4.address 10.200.0.230/24
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
   % ipa-server-install --no_hbac_allow --no-ntp --setup-dns  <-- If you want to host NTP from IPA, take off --no-ntp
   . . . (show steps here)

Once this is complete, it's recommended you create an admin account for yourself. Me personally, I like to have a "2" at the end of my login name, that way I have an obvious difference. I don't like my IPA admin account to also be used to login to systems and have full root privileges. I personally believe it's better to have separate admin accounts away from the defaults. But this is ultimately your call.

.. code-block:: bash
   
   % kinit admin
   % ipa user-add --first=First --last=Last --cn="First Last Admin" --gecos="First Last Admin" flast2
   % ipa group-add-member --users=flast2 admins

Replica
+++++++

On the replica, ensure you repeat the same steps as above.

.. code-block:: bash

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
   % ipa-replica-install --auto-forwarders --setup-ca --setup-dns --no-ntp --principal admin --admin-password "ChangePass123" --domain ipa.example.com
   . . . (show steps)

You should now be able to see your replicas.

.. code-block:: bash

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

.. code-block:: bash

   % ipa-replica-install --no-ntp --sh-trust-dns --unattended --setupca --mkhomedir --setup-dns --no-forwarders

If you have forwarders, use the --forwarders option instead.

Active Directory Trust
----------------------

To initiate a trust with your active directory domain, ensure the following requirements are met.

.. note:: Requirements

   Package installed: ipa-server-trust-ad
   DNS: Properly configured that FreeIPA can resolve the AD servers A and SRV records
    -> This can either be forwarders to AD, a subdomain that IPA manages, or delegated subdomain from the master DNS servers in your network. This is completely dependent on your infrastructure.

When the following requirements are met, you have two choices before continuning. You can either use POSIX or have the id range generated automatically.

.. note:: POSIX vs Non-POSIX

   If you decide to use POSIX, your AD users are expected to have uidNumber, gidNumber, loginShell, unixHomeDirectory set. Else, you will need to setup ID overrides if you already have that information for current users (assuming this is not a new setup for the environment, ie you already have UID's for people). If you are not planning a migration from pure AD over to IPA with a trust, it is recommended to note that information so you can setup the ID overrides. Afterwards, any new users will get UID/GID's that you will not have to manage yourself.

You will need to prep your master(s) for the trust. We will be enabling compat, adding sids, and adding agents so both masters can provide AD information. 

.. code-block:: bash

   % ipa-adtrust-install --add-sids --add-agents --enable-compat

This will do what we need. If you do not have legacy clients (RHEL 5, Solaris, HP-UX, AIX, SLES 11.4, the list goes on), then you do not need to enable compat mode. Though, it could be useful to have it for certain apps.

You will now need to open the necessary ports. Do this on both masters.

.. note:: Ports

   TCP: 135, 138, 139, 389, 445, 1024-1300, 3268
   UDP: 138, 139, 389, 445

.. code-block:: bash

   % firewall-cmd --add-service=freeipa-trust --permanent
   % firewall-cmd --complete-reload

Now you can initiate the trust. The admin account you use must be part of the domain admins group.

.. code-block:: bash

   # If you are using POSIX ID, use ipa-ad-trust-posix.
   % ipa trust-add --type=ad ad.example.com --range-type=ipa-ad-trust --two-way=true --admin adminaccount --password 

Once the trust is up, verify it.

.. code-block:: bash

   % ipa trust-show ad.example.com
    Realm name: ad.example.com
    Domain NetBIOS name: AD
    Domain Security Identifier: S-X-X-XX-XXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX
    Trust direction: Two-way trust
    Trust type: Active Directory domain
    UPN suffixes: ad.example.com

You should be able to test for the users now.

.. code-block:: bash

   % id first.last@ad.example.com
   uid=XXXXX(first.last@ad.example.com) gid=XXXXX(first.last@ad.example.com) groups=XXXXX(first.last@ad.example.com)

Client Setup
------------

RHEL 7
++++++

RHEL 6
++++++

Mac Clients
+++++++++++

Mac Clients are an interesting workstation to setup as a FreeIPA client. It takes a little bit of fighting and troubleshooting, but it can work with the right settings.

.. note:: Other Guides

   There are a couple of guides out there that you may have found before (if you looked) that help setup IPA for Mac. There's one for much older (I think Lion) and one for Sierra. This section was made mostly for my own reference because I found some things in both of those guides didn't address issues I ran into one way or another and couldn't find any information on. The FreeIPA users mail list didn't have any archives with people having similar issues. 

   If you are interested in the other guides to compare to, you may see them `here (recent) <https://www.freeipa.org/page/HowTo/Setup_FreeIPA_Services_for_Mac_OS_X_10.12>`_ and `here (older) <https://annvix.com/using_freeipa_for_user_authentication#Mac_OS_X_10.7.2F10.8>`_

.. warning:: AD Users

   You cannot login as AD users on a Mac when going through FreeIPA. You can, in theory, point to the cn=compat tree and set the attribute mapping to rfc2307. In my tests, I have never been able to get this to work. This section, I am going to assume you are going to be logging in as a user in IPA. If you are in a mixed environment, add your Mac to your AD domain instead.

Check your system's hostname. You want to make sure it has a hostname defined for it in the domain the mac sits in, even if it's dynamic via DHCP/DNS.

.. code-block:: bash

   % sudo scutil --set HostName mac.example.com

Get the IPA certificate. You'll need to double click it after you get it and import it.

.. code-block:: bash

   % cd ~/Desktop && curl -OL http://server1.ipa.example.com/ipa/config/ca.crt
   % sudo mkdir /etc/ipa
   % sudo cp ca.crt /etc/ipa/ca.crt

On the IPA server, you will need to create a host and get the keytab.

.. code-block:: bash

   % ipa host-add mac.example.com --macaddress="00:00:00:00:00:00"
   % ipa-getkeytab -s server1.ipa.example.com -p host/mac.example.com -k /tmp/krb5.keytab

You will need to transfer that keytab to your mac.

.. code-block:: bash

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

.. code-block:: bash

   % kinit username@IPA.EXAMPLE.COM

You need to modify a couple of pam files. I'll explain why they need to be changed.

.. code-block:: bash

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

+-------------------------+---------------+
| Attribute               | Mapping       |
+=========================+===============+
| AuthenticationAuthority | uid           |
+-------------------------+---------------+
| GeneratedUID            | GeneratedUID  |
+-------------------------+---------------+
| HomeDirectory           | #/Users/$uid$ |
+-------------------------+---------------+
| NFSHomeDirectory        | #/Users/$uid$ |
+-------------------------+---------------+
| PrimaryGroupID          | gidNumber     |
+-------------------------+---------------+
| RealName                | cn            |
+-------------------------+---------------+
| RecordName              | uid           |
+-------------------------+---------------+
| UniqueID                | uidNumber     |
+-------------------------+---------------+
| UserShell               | loginShell    |
+-------------------------+---------------+

#. If using custom mapping, click reach record type you created and ensure the base DN is set. 
#. Make sure each record type is set to all subtrees.
#. Click OK
#. Click OK
#. Click on Search Policy.
#. Double check that "/LDAPV3/server1.ipa.example.com" is listed beneath "/Local/Default"
#. Close everything until you're back to the users & groups section of preferences
#. Open a terminal.

.. code-block:: bash

   % dscacheutil -flushcache
   % dscacheutil -q user -a name username

You should get a return.

If you want to further verify users and groups after the above succeeds, open up the directory utility again. Click "Directory Editor", ensure you are searching for "users" and check that they appear in a list on the right hand side, optionally doing a search. In a default setup, you shouldn't need an account to do (some) anonymous lookups. If you changed that in any way, you will need to create a readonly system account in cn=sysaccounts,cn=etc.

In a terminal, you will need to create the home directories via the createmobileaccount command. [#f2]_

.. code-block:: bash

   % sudo /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P

Log out and login as your IPA user. It should succeed. It takes a few moments, but you will eventually see the first login prompts that require you to hit next a couple of times. You'll get a fresh desktop.

Log out and go back to your local account. Go to system preferences, users & groups, find the account, set it as an administrator of the machine.

.. warning:: Password Notes

   There are a couple of problems with this setup that you should be aware of. 
   
   * If you do a mobile account, changing your password through the FreeIPA gui does not change your passwords on your system.
   * If your account does not have any keytabs (eg, you haven't had your mac on or haven't logged in in over 24 hours), you can login with the new password and it will suceed. The system will cache the new password right away. However, your keychain the first time will ask for the old passwords and this is normal. So you can change them by hand or you can log out and back in and the system will ask you if you want to update the password and it will just update automatically.

And that's it! My own script that I made (as a reference) is below to do the work. It's highly recommended that you do the mapping first and make a tar file of the content from /Library/Preferences/OpenDirectory and just untar it to other Mac's.

.. code-block:: bash

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

.. code-block:: bash

   # make sure you're logged in as a different account away from your local account
   % sudo su -
   root# cd /Users
   root# ditto localfolder networkfolder (or maybe an mv?)
   root# chown -R user:user folder
   root# /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P

Another issue you may run into, if you have been using your Mac with a local account for a while, a lot of directories in /Applications will be owned by localuser:staff or localuser:admin. It's recommended to fix those too. 

HBAC
----

When we first setup our IPA servers, we had an option set to make it so hbac wasn't allowed for everyone. This way we have to create HBAC rules for our systems. I personally do this out of habit when working with IPA. What we need to do though is create an "admin" group that can login to all machines.

.. code-block:: bash

   % ipa idrange-show IPA.ANGELSOFCLOCKWORK.NET_id_range
     Range name: IPA.ANGELSOFCLOCKWORK.NET_id_range
     First Posix ID of the range: 686600000
     Number of IDs in the range: 200000
     First RID of the corresponding RID range: 1000
     First RID of the secondary RID range: 100000000
     Range type: local domain range
   % ipa group-add --gid=686610000 linuxadm
   % ipa group-add-member --users=flast linuxadm

In the event that your AD user will be an admin or what have you, you need to create an "external" group to map the user or users over. This isn't required if you don't have an AD trust.

.. code-block:: bash

   % ipa group-add --external linuxadm_external
   % ipa group-add-member --users=flast@ad.example.com linuxadm_external
   % ipa group-add-member --groups=linuxadm_external linuxadm

Now, let's create an HBAC for our Linux Administrator account for our group.

.. code-block:: bash

   % ipa hbacrule-add --hostcat=all --servicecat=all --desc='linux admins all access' all_linux
   % ipa hbacrule-add-user --groups=linuxadm all_linux
   % ipa hbactest --rules=All_Systems --user=flast --host=server1.ipa.example.com --service=sshd
   # or set it to user@domain to test your external users

You might want to create an HBAC rule specifically for your IPA admin accounts to have ssh access to the IPA servers too. You can follow something like the above to make it possible.

SUDO
----

Setting up sudo is relatively easy. RHEL 6 and newer for sssd supports IPA as a provider for sudo. Based on the last section, let's create a sample rule for our Linux admins that can login to every system, we want to ensure they can run all commands.

.. code-block:: bash

   % ipa sudorule-add --runasusercat=all --hostcat=all --cmdcat=all --desc='linux admins all sudo' all_linux_sudo
   % ipa sudorule-add-user --groups=linuxadm all_linux_sudo

You can make this a little more specific, such as /bin/bash as everyone or otherwise. It's your call here. If you want to create a sudo rule and add some commands to it, you can do something like this.

.. code-block:: bash

   % ipa sudorule-add sudo_rule
   % ipa sudorule-add-allow-command --sudocmds="/usr/bin/less" sudo_rule

Legacy Client Setup
-------------------

Solaris 10
++++++++++

Setting up Solaris 10 as an IPA client is... different. In fact, it's a whole kind of different that plagued me for days trying to unravel how to do all of it. So here are the steps I took to make it work.

Create an ldif for your service account.

.. code-block:: ldif

   dn: uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectclass: account
   objectclass: simplesecurityobject
   uid: solaris
   userPassword: secret123
   passwordExpirationTime: 20380119031407Z
   nsIdleTimeout: 0

The solaris system account is required. So now, add it in.

.. code-block:: bash

   % ldapadd -xWD 'cn=Directory Manager' -f /tmp/solaris.ldif

Now, set the nisdomain.

.. code-block:: bash

   % defaultdomain ipa.example.com
   % echo 'ipa.example.com' > /etc/defaultdomain

Configure kerberos.

.. code-block:: bash

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

.. code-block:: bash

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

.. code-block:: bash

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

   When using this, you are not creating a secure connection. The Solaris 10 SSL libraries are so old that they cannot work with the ciphers that FreeIPA has turned on. Kerberos is hit or miss.

.. code-block:: bash

   % ldapclient manual -a credentialLevel=proxy \
                       -a authenticationMethod=simple \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com"
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5 \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123"

This should succeed. Once it succeeds, you need to configure pam and nsswitch. 

.. note:: AD Trust Information

   In the event you don't have an AD trust, you can change the "binding" lines to required and remove the pam_ldap lines.

.. code-block:: bash

   % vi /etc/pam.conf

   # Console
   # We are not using pam_ldap because there's a SVC login crash
   login auth requisite pam_authtok_get.so.1
   login auth sufficient pam_krb5.so.1
   login auth required pam_unix_cred.so.1
   login auth required pam_dial_auth.so.1
   login auth sufficient pam_unix_auth.so.1 server_policy
   login auth required pam_ldap.so.1
   rlogin auth sufficient pam_rhosts_auth.so.1
   rlogin auth requisite pam_authtok_get.so.1
   rlogin auth sufficient pam_krb5.so.1
   rlogin auth required pam_dhkeys.so.1
   rlogin auth required pam_unix_cred.so.1
   rlogin auth sufficient pam_unix_auth.so.1 server_policy
   rlogin auth required pam_ldap.so.1
   
   # Needed for krb
   krlogin auth required pam_unix_cred.so.1
   krlogin auth sufficient pam_krb5.so.1
   
   # Remote Shell
   rsh auth sufficient pam_rhosts_auth.so.1
   rsh auth required pam_unix_cred.so.1
   rsh auth sufficient pam_unix_auth.so.1 server_policy
   rsh auth required pam_ldap.so.1
   
   # Needed for krb
   krsh auth required pam_unix_cred.so.1
   krsh auth required pam_krb5.so.1
   
   # ?
   ppp auth requisite pam_authtok_get.so.1
   ppp auth required pam_dhkeys.so.1
   ppp auth required pam_dial_auth.so.1
   ppp auth binding pam_unix_auth.so.1 server_policy
   ppp auth required pam_ldap.so.1
   
   # Other, used by sshd and "others" as a fallback
   other auth requisite pam_authtok_get.so.1
   other auth sufficient pam_krb5.so.1
   other auth required pam_dhkeys.so.1
   other auth required pam_unix_cred.so.1
   other auth sufficient pam_unix_auth.so.1 server_policy
   other auth required pam_ldap.so.1
   other account requisite pam_roles.so.1
   other account required pam_projects.so.1
   other account binding pam_unix_account.so.1 server_policy
   other account required pam_krb5.so.1
   other account required pam_ldap.so.1
   other session required pam_unix_session.so.1
   other password required pam_dhkeys.so.1
   other password requisite pam_authtok_get.so.1
   other password requisite pam_authtok_check.so.1
   other password required pam_authtok_store.so.1 server_policy
   
   # passwd and cron
   passwd auth binding pam_passwd_auth.so.1 server_policy
   passwd auth required pam_ldap.so.1
   cron account required pam_unix_account.so.1
   
   # SSH Pubkey - Needed for openldap and still probably needed
   sshd-pubkey account required pam_unix_account.so.1

.. code-block:: bash

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

.. code-block:: bash

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

Solaris 11
++++++++++

Solaris 11 is sort of similar to 10. We need to make a couple of manual changes but then the rest require us to work with the svcprop commands (thanks Oracle). Sudo should just work as well, no OpenCSW required. And, we should be able to use TLS without much of a fuss. No certificate databases are required.

Below is a copy of Solaris 10 for the service account, here as a reference.

.. code-block:: ldif

   dn: uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectclass: account
   objectclass: simplesecurityobject
   uid: solaris
   userPassword: secret123
   passwordExpirationTime: 20380119031407Z
   nsIdleTimeout: 0

.. code-block:: bash

   % ldapadd -xWD 'cn=Directory Manager' -f /tmp/solaris.ldif

Now, set the nisdomain.

.. code-block:: bash

   % defaultdomain ipa.example.com
   % echo 'ipa.example.com' > /etc/defaultdomain

Configure kerberos.

.. code-block:: bash

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

.. code-block:: bash

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
   % kinit flast2@IPA.EXAMPLE.COM

Create the LDAP configurations, bring the certificate, and create an NSS database.

.. note:: Solaris 11.3 vs 11.4

   11.3 and 11.4 require different configurations. Please take note of that if you still have 11.3 or earlier systems.


.. code-block:: bash

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

.. code-block:: bash

   % ldapclient manual -a credentialLevel=proxy \
                       -a authenticationMethod=tls:simple \
                       -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                       -a domainName=ipa.example.com
                       -a defaultServerList="server1.ipa.example.com server2.ipa.example.com"
                       -a followReferrals=true \
                       -a objectClassMap=shadow:shadowAccount=posixAccount \
                       -a objectClassMap=passwd:posixAccount=posixaccount \
                       -a objectClassMap=group:posixGroup=posixgroup \
                       -a serviceSearchDescriptor=group:cn=groups,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=passwd:cn=users,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                       -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                       -a bindTimeLimit=5 \
                       -a proxyDN="uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com" \
                       -a proxyPassword="secret123"

This should succeed. Once it succeeds, you need to configure pam and nsswitch.

.. code-block:: bash

   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/sudoer = astring: "files ldap"' 
   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/password = astring: "files ldap [NOTFOUND=return]"' 
   % /usr/sbin/svccfg -s svc:/system/name-service/switch 'setprop config/group = astring: "files ldap [NOTFOUND=return]"' 

   % /usr/sbin/svcadm refresh svc:/system/name-service/switch
   % /usr/sbin/svcadm restart svc:/system/name-service/switch
   % /usr/sbin/svcadm restart ldap/client

.. note:: AD Trust Information

   In the event you don't have an AD trust, you can change the "binding" lines to required and remove the pam_ldap lines.

.. code-block:: bash

   % vi /etc/pam.d/krlogin
   auth required           pam_unix_cred.so.1
   auth required           pam_krb5.so.1

   % vi /etc/pam.d/krsh
   auth required           pam_unix_cred.so.1
   auth required           pam_krb5.so.1

   % vi /etc/pam.d/login
   auth definitive         pam_user_policy.so.1
   auth requisite          pam_authtok_get.so.1
   auth sufficient         pam_krb5.so.1
   auth required           pam_dhkeys.so.1
   auth required           pam_unix_cred.so.1
   auth required           pam_dial_auth.so.1
   auth sufficient         pam_unix_auth.so.1 server_policy
   auth required           pam_ldap.so.1

   % vi /etc/pam.d/other
   auth definitive         pam_user_policy.so.1
   auth requisite          pam_authtok_get.so.1
   auth required           pam_dhkeys.so.1
   auth required           pam_unix_cred.so.1
   auth sufficient         pam_unix_auth.so.1 server_policy
   auth sufficient         pam_krb5.so.1
   auth required           pam_ldap.so.1
   
   account requisite       pam_roles.so.1
   account definitive      pam_user_policy.so.1
   account required        pam_tsol_account.so.1
   account binding         pam_unix_account.so.1 server_policy
   account required        pam_krb5.so.1
   account required        pam_ldap.so.1
   
   session definitive      pam_user_policy.so.1
   session required        pam_unix_session.so.1
   
   password definitive     pam_user_policy.so.1
   password include        pam_authtok_common
   password sufficient     pam_krb5.so.1
   password required       pam_authtok_store.so.1 server_policy
   
   % vi /etc/pam.d/passwd
   auth binding            pam_passwd_auth.so.1 server_policy
   auth required           pam_ldap.so.1
   account requisite       pam_roles.so.1
   account definitive      pam_user_policy.so.1
   account required        pam_unix_account.so.1

   % vi /etc/pam.d/sshd-pubkey
   account required        pam_unix_account.so.1

You can test now if you'd like.

.. code-block:: bash

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

I at one point built a bunch of scripts to automate Solaris servers talking to IPA `here <https://github.com/nazunalika/useful-scripts/tree/master/freeipa>`__. The problem is that it doesn't create the host objects because of how curl was compiled in OpenCSW and Solaris 11. I can't think of useful way around this (yet). I'm thinking at some point I'll make that portion python.

Legacy HBAC
+++++++++++

For HBAC to work on Solaris, you will need to compile the pam_hbac module found `here <https://github.com/jhrozek/pam_hbac>`__. I would clone the current master branch or download the master.zip to your Solaris system. The instructions are different between Solaris 10 and Solaris 11 for compiling it. Solaris 10 requires some `OpenCSW <https://www.opencsw.org/>`__ packages. Solaris 11 just needs you to install a few packages and then the rest is pretty straight forward.

First, create the following system account. We will need this when we are configuring our legacy clients.

::

   dn: uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   objectClass: account
   objectClass: simplesecurityobject
   objectClass: top
   uid: hbac
   userPassword: password

For Solaris 10, these are the steps to compile the HBAC module:

.. code-block:: bash

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

For Solaris 11, these are the steps:

.. code-block:: bash

   % pkg install autoconf libtool pkg-config automake gcc docbook
   % export CFLAGS="-m32 -gstabs"
   % export CXXFLAGS="-m32"
   % export LDFLAGS="-m32"
   % autoreconf -if
   % ./configure --with-pammoddir=/usr/lib/security --mandir=/usr/share/man --sysconfdir=/etc/
   % make
   % make install

Now configure pam_hbac.conf:

.. code-block:: bash

   % vim /etc/pam_hbac.conf

   # Replace client with your server's FQDN
   URI = ldap://server.ipa.example.com
   BASE = dc=ipa,dc=chotel,dc=com
   BIND_DN = uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
   BIND_PW = password
   SSL_PATH = /var/ldap
   HOST_NAME = client

Now add the line to your pam configuration.

.. code-block:: bash

   # Solaris 10 - /etc/pam.conf
   # Modify the other account section... It should come after pam_ldap
   other account requisite pam_roles.so.1
   other account required pam_projects.so.1
   other account binding pam_unix_account.so.1 server_policy
   other account required pam_ldap.so.1
   other account required pam_hbac.so ignore_unknown_user ignore_authinfo_unavail

   # Solaris 11 - /etc/pam.d/other
   # Same here, only modify the account section
   account requisite       pam_roles.so.1
   account definitive      pam_user_policy.so.1
   account required        pam_tsol_account.so.1
   account binding         pam_unix_account.so.1 server_policy
   account required        pam_krb5.so.1
   account required        pam_ldap.so.1
   account required        pam_hbac.so ignore_unknown_user ignore_authinfo_unavail

In the event you cannot login or things aren't working the way you'd expect, add 'debug' to the end of the pam_hbac line and watch /var/log/authlog for errors.

Legacy Active Directory Trust
+++++++++++++++++++++++++++++

This section isn't really a walk through, but it's more of an explanation of my experiences and what I've noticed. First and foremost, I'm going to be assuming you have a domain resolution order set for AD to be first. If this is truly the case, then the cn=compat tree changes slightly from what it traditionally does. 

What it initially does is it takes all the IPA users, makes them compat objects on the fly (virtual objects). And then, if they are from AD, they only appear on request, but they usually only appear when you query them as uid=username@domain. When domain resolution order is set on the IPA side, it changes this behavior slightly. Instead, what happens is if you request uid=username, you will get the response back with your AD user, but the difference is that there are multiple 'uid' attributes. One is part of the RDN of the object (uid=username) and the other is the fully qualified username. Now, this is actually RFC compliant. But let's say the compat tree never had the user in there and you searched the tranditional way, uid=username@domain. You now have behavior as if domain resolution order was never set in the first place. While this occurs for AD users, IPA users are unaffected. 

You might think to yourself though 'this doesn't seem too bad' and you would be mostly right, it's rfc compliant. However, legacy clients sometimes don't play too well with this. In fact, there's some weirdness that occurs.

To explain, this is what appears to happen:

* User doesn't exist initially in cn=compat
* User is queried as username (instead of username@domain)
* User is checked against Active Directory
* Virtual object is created in cn=compat in the form of uid=username,cn=users,cn=compat,...
* Virtual object has two uid's, uid: username and uid: username@domain

If a user is queried as username@domain, that object is created on the fly as uid=username@domain, which can throw a wrench in your plans of trying to login without the realm name. When you query for a user that way, only ONE uid attribute appears, basically how it would act if you didn't have domain resolution order set. Fixing this requires you to restart dirsrv.

Where I'm going with this is this: It's *always* better to search or login without the domain name when you have domain resolution order set.

Another weird thing is this:

* If you do su - username on a system and run `id`, groups do not appear.
* If you login (via ssh for example), groups do appear as long as the former wasn't done first (this seems to be intermittent from my tests)
* After you login via ssh or console, groups will always show with `id` from now on

What's interesting is that if you login with first.last, your name shows up as the fully qualified name, and this is probably how the group membership is applied in some way.

Also, the caveat to all of this is if the directory servers restart, the objects disappear. So be careful when you're logging in or doing `id`. It might cause you some trouble down the road. And *always* try to use first.last when using domain resolution order.

The good news though is sudo and HBAC still work perfectly fine on Solaris (RHEL 5 HBAC, not so much).

Situational Options
-------------------

This section goes over "situational" scenarios. These scenarios are reflective of the environment in which IPA is installed and not all will fit into your environment. These are more or less common situations that could occur during an IPA deployment or even post-deployment. 

Remove @realm for AD users
++++++++++++++++++++++++++

A common scenario is that IPA and AD will have a trust, but there will not be any IPA users with the exception of the engineering team for managing IPA itself. The common theme is that because of this, the engineers and customers would rather not login with username@realm.


.. note:: Info

   The following is only applicable in an IPA-AD trust. An IPA-only scenario would not require any of these steps and most pieces would work natively (no @realm, sudo, hbac).

   In the event that you are in an IPA-AD scenario, please take note that this can adversely affect legacy clients. This will cause ldapsearches that are done in the compat tree to display multiple uid attributes. In most cases, this is fine and the user can still login without the realm name. The whoami and id commands will show the domain. There's no workaround for this. 

On the IPA servers, you will need to set the domain resolution order. This was introduced in 4.5.0. 

.. code-block:: bash

   % kinit admin
   % ipa config-mod --domain-resolution-order="ad.example.com:ipa.example.com"


The below is optional. It will remove the @realm off the usernames, like on the prompt or id or whoami commands. Only do this if required.

.. code-block:: bash

   # vi /etc/sssd/sssd.conf

   [domain/ipa.example.com]
   . . .
   full_name_format = %1$s

This will ensure EL7 clients resolve the AD domain first when attempting logins and optionally drop the @realm off the usernames. However, for EL6 clients, additional changes on the client side is required. Since the sssd in EL6 does not support domain resolution order, you will either need to modify /etc/sssd/sssd.conf with "default_domain_suffix" or install a later version of sssd from copr. Below assumes you are using 1.13.3 from the base.

.. code-block:: bash

   # vi /etc/sssd/sssd.conf
   
   [domain/ipa.example.com]
   . . .
   full_name_format = %1$s

   [sssd]
   . . .
   default_domain_suffix = ad.example.com


RHEL 6 SUDO and Default Domain Suffix
+++++++++++++++++++++++++++++++++++++

This issue with the above section is that once you do this, sudo rules will begin failing, they will no longer work for RHEL 6. This is because sssd was changed to look for cn=sudo rather than ou=sudoers. To enable the compatibility fall back, you will need to install the latest SSSD from COPR.

.. rubric:: Footnotes

.. [#f1] For more information on DNS for FreeIPA, please read `this page <https://www.freeipa.org/page/DNS>`__ and `this page <https://www.freeipa.org/page/Deployment_Recommendations#DNS>`__
.. [#f2] The -P asks for the password of the username in question, that way it is cached right away. The directory service on the system then has credentials to compare to. I have found that sometimes if you don't use -P, even if you're logged in as the account, the password does not get cached and you'll get stuck at a background image the next time you login. Again, this is only sometimes. Your mileage may vary here.
