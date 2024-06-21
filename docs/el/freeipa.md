---
title: FreeIPA
---

This page is a series of notes and information that goes over how to
install and configure FreeIPA on Enterprise Linux 8/9 servers with
replicas, as well as configuring client machines to connect and utilize
FreeIPA resources, policies (eg sudo), and host based access control
methods. We will also go over a scenario of configuring a trust with an
Active Directory domain. The client setup will work for Fedora users as
the packages are the same, just newer versions.

## Overview

FreeIPA is an integrated security information management system
combining Linux, a Directory Server (389), Kerberos, NTP, DNS, DogTag.
It's a system that can be loosely compared to Active Directory in what
it attempts to solve for Linux and UNIX clients and even mixed
environments. While it is **not** an active directory, it is an
integrated Identity and Authentication solution for Linux/UNIX
environments, which means it does not support Windows clients. One
problem that FreeIPA attempts to solve is giving back control to the
Linux/UNIX administration teams of access, authentication, and
authorization rather than trying to integrate directly into Active
Directory, where the controls do not work the same or do not work at
all. And because of this, no third party software is required to be
installed.

## Requirements

Here are the list of requirements below.

* Enterprise Linux 8+ or Fedora Linux
* An active internet connection to install the packages required or
  available internal mirrors
* 2 core, 4GB system with at least 10GB+ disk for /var/lib/dirsrv
* DNS domain delegation (if a DNS appliance or server already exists)

## Tutorial Preface, Notes, and Recommendations
!!! warning "Potential Pitfalls!"
    * Leave SELinux enabled at all times. You will not run into SELinux
      issues
    * FreeIPA runs better when it controls the DNS domain that it is
      given - It is recommended DNS is delegated or that FreeIPA run DNS
      entirely
    * FreeIPA does not run DHCP. ISC DHCP can be configured to do dynamic
      DNS updates to FreeIPA or hosts can be configured to perform dynamic
      DNS updates

!!! note "Recommended Information"
    * Keep selinux set to **enforcing**
    * DNS - You **must** be careful when using DNS. Here are
      recommendations.[^1]

        * Recommendation 1: FreeIPA runs your entire DNS for your
          network - This requires the DHCP servers to set the DNS servers
          to the IPA servers. This will be useful in the case that your
          clients will have their SSH keys added as SSHFP records to DNS
          when enrolled as clients. This also gives you the added benefit
          of a client updating its own DNS entries (A and PTR records) if
          the client is DHCP enabled and the IP changes if you so choose.
        * Recommendation 2: FreeIPA is delegated a subdomain of a domain
          used already in the network - It's not required for hosts to
          live in the subdomain to be a member of the IPA domain, but you
          will lose out on kerberos SSO. Do not try to hijack a domain.

    * Consider setting up a trust with Active Directory if you are in a
      mixed environment, eg Active Directory already exists.
    * IPA servers should have static assigned addresses - Configured via
      nmcli or directly in /etc/sysconfig/network-scripts/ifcfg-\*
    * Try to avoid running FreeIPA without DNS - while possible, you are
      creating higher maintenance

!!! note "Trust Information"
    If you are in a mixed environment (both Windows and Linux/UNIX), it
    may prove useful to setup a trust between FreeIPA and Active Directory.
    If this is the case, they will need to be in different domains (e.g., 
    example.com and ipa.example.com, or example.com and example.net).

    If you are in a larger environment, it may be detrimental instead. In
    this case, having a way to keep users in sync between AD and IPA might
    be the better option. This is because AD lookups can be resource
    intensive, and a large AD environment can slow down performance or not
    work at all without sssd tuning.

    All trust information is in [this section](#active-directory-trust)

## DNS

As noted in the previous section, you must try not to hijack a domain.
You can migrate records over to FreeIPA's DNS if you'd like, but care
must be taken with that approach.

While FreeIPA can do the typical DNS server work such as forward/reverse
zones and various types of records, it should not be considered a full
solution. It does not support views (eg, you can't have internal and
external views). In the event you need to have views, that's when you
need a different DNS server or service to provide this to you.

There are two ways you can have DNS entries updated dynamically for
clients, `--enable-dns-updates` for ipa-client-install and DHCP dynamic
DNS updates. Both are sufficient. The latter requires additional work
and is outside the scope of this document.

### External DNS Server

It is possible to run FreeIPA without a DNS server and have all records
handled from an external source. This is a reasonable configuration and
many users of FreeIPA actively use this setup.

When updating records, or determining what the records will need to look
like on the DNS server, you will need to run the following command:

```
ipa dns-update-system-records --dry-run --out=nsupdate.out
```

This will show the records needed for your IPA domain and it will also
produce an nsupdate file for you to view or use as needed.

### Delegation

Throughout this guide, you may find or see examples of domain delegation,
assuming there is an AD trust or perhaps it's just a separate domain.
This is because it might be a real world example for some environments. It
is also a result of doing a lab work to maintain this document. Regardless
of what it is, it may be realistic that some environments have AD or a
separate DNS appliance already in place.

With delegation, it is not required for clients to have records in the IPA
DNS domain. They can be in other domains, as long as they have all required
record types (e.g., A/AAAA/PTR), with the caveat that SSO via kerberos will
fail.

When setting up delegation, refer to the documentation for your appliance
or software. There may be differences between delegating a whole domain or
delegating a subdomain.

See below for a subdomain delegation example in bind.

```
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
```

!!! note "nsupdates"
    Note that AD can send nsupdates to a DNS server if given the permissions. As of
    this writing, FreeIPA does not do this, which is why DNS delegation is recommended.

## Server Setup

### Required Packages

* ipa-server
* ipa-client (required as an IPA server is technically a client of the
  domain)
* ipa-server-dns (required for using the internal DNS)
* sssd/sssd-ipa (pulled in as dependencies)

### Optional Packages

* ipa-server-trust-ad if using an AD trust

### Installation

To install the server, make sure the hostname is set to the A records
and NS delegations you've put in DNS (which won't respond to a DNS
lookup). If these are stand-alone, then you can just keep it at the top
level (eg, example.com). You'll also need to modify /etc/hosts, set
static IP addresses, and then run the ipa-server-install command.

```
% hostnamectl set-hostname server1.ipa.example.com
% nmcli con mod ens192 ipv4.address 10.200.0.230/24
% nmcli con mod ens192 ipv4.gateway 10.200.0.1
% nmcli con mod ens192 ipv4.method manual
% nmcli con up ens192
% vi /etc/hosts
. . .
10.200.0.230 server1.ipa.example.com
10.200.0.231 server2.ipa.example.com

# Fedora
% dnf install freeipa-server{,-common,-dns} -y

# Enterprise Linux 8
% dnf module enable idm:DL1/{dns,adtrust,client,server,common}
% dnf install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y

# Enterprise Linux 9 (there appears to be no modules)
% dnf install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y

# Setup
# Enterprise 8 / 9
% firewall-cmd --permanent --add-service={freeipa-4,ntp,dns}
% firewall-cmd --complete-reload
% ipa-server-install \
    --no_hbac_allow \ <-- If you want to have HBAC allow_all disabled initially
    --no-ntp \ <-- If you want to host NTP from IPA, take off --no-ntp
    --setup-dns \
    --realm IPA.EXAMPLE.COM \
    --domain example.com 

. . . (show steps here)
```

While not officially recommended, you could have two accounts. One for
administration of servers and the domain and one for your workstation,
similar to separating domain users and domain administrators in active
directory. You don't have to follow this, but at least there's a form
of separation.

```
% kinit admin
% ipa user-add --first=First --last=Last --cn="First Last Admin" --gecos="First Last Admin" flast2
% ipa group-add-member --users=flast2 admins
```

### Replica

On the replica, ensure you repeat the same steps as above.

```
% hostnamectl set-hostname server2.ipa.example.com
% nmcli con mod ens192 ipv4.address 10.200.0.231/24
% nmcli con mod ens192 ipv4.gateway 10.200.0.1
% nmcli con mod ens192 ipv4.method manual
% nmcli con up ens192
% vi /etc/hosts
. . .
10.200.0.230 server1.ipa.example.com
10.200.0.231 server2.ipa.example.com

% dnf install ipa-server ipa-server-dns ipa-client sssd sssd-ipa -y
# Enterprise 8 / 9
% firewall-cmd --permanent --add-service={freeipa-4,ntp,dns}
% firewall-cmd --complete-reload
% ipa-replica-install --no-forwarders --setup-ca --setup-dns --no-ntp --principal admin --admin-password "ChangePass123" --domain ipa.example.com
. . . (show steps)
```

You should now be able to see your replicas.

```
% ipa-replica-manage list
server1.ipa.example.com: master
server2.ipa.example.com: master
```

### Replica Automation

It is possible to automate the replica installation. To automate the
replica installation, the following requirements would need to be met:

* Server must be added as a client (ipa-client-install) with an IP
  address on the commandline
* Server must be added to the ipaservers host group
* ipa-replica-install ran without principal and passwords

Once you have a server added as a client and then added to the
ipaservers host group, you would run a command like this:

```
% ipa-replica-install --ssh-trust-dns --unattended --setup-ca --mkhomedir --setup-dns --no-forwarders
```

If you have forwarders, use the `--forwarders` option instead.

## Server Migration/Upgrade

Performing a migration is a multi-step process. Typically you are going
from one major version of Enterprise Linux (such as 7 or 8) to another
(such as 9). Regardless of which version you are migrating from, the
typical beginning steps are:

* System's time is verified for time synchronization like using
  ntpstat or equivalent
* Server roles are verified in the current environment using
  `ipa server-role-find --status enabled --server ipa.example.com`
* New system is installed and enrolled as a client
* New system is added as a replica with required server roles

!!! note "EL7 to EL9 / Two Major Version Jumps"
    When jumping from EL7 to EL9 or two major versions in general, it is
    recommended that you have an "in between" machine. This means that you
    need to add the in between version first and then you can add the latest
    version. See [this page](https://lists.fedoraproject.org/archives/list/freeipa-users@lists.fedorahosted.org/thread/5VGR7DFU4XO63X6KB4ETKSGLKP4A2LWP/)
    for an example.

The below is in the case of a single master installation and doesn't
take into account of multiple version jumps. Let's say you have two old
Enterprise Linux replicas instead. There are two approaches you can
take:

* Install a new Enterprise Linux system, add it, reinstall old system
  to the new version, add it back.
* Install two new Enterprise Linux systems, add them as needed, power
  off old systems.

Below is an example, with X being the old version, and Y being the new.

* Enterprise Linux Y system is installed and enrolled as a client
* Enterprise Linux Y system is added as a replica
* Change CRL to Enterprise Linux Y system and adjust settings on
  Enterprise Linux X CA master and new Enterprise Linux Y replica for
  pki-tomcatd and httpd
* Test user is created to ensure DNA range is adjusted
* Verify DNA range
* Stop first Enterprise Linux X IPA services, remove replica,
  uninstall, power off.
* Second Enterprise Linux Y system is installed and enrolled as a
  client
* Second Enterprise Linux Y system is added as a replica
* Test user is created again to ensure DNA range is adjusted
* Verify DNA range
* Stop second Enterprise Linux X IPA services, remove replica,
  uninstall, power off.

### EL7 to EL8

```
# Enterprise Linux 8
% dnf module enable idm:DL1

# Install necessary packages, ie AD trust packages if you need them
% dnf install ipa-server ipa-server-dns -y
% ipa-client-install --realm EXAMPLE.COM --domain example.com
% kinit admin

# Add other switches that you feel are necessary, such as forwarders, kra, ntp...
% ipa-replica-install --setup-dns --setup-ca --ssh-trust-dns --mkhomedir

# Verify all services are in a RUNNING state
% ipactl status
Directory Service: RUNNING
. . .

% ipa-csreplica-manage list
elX.example.com: master
elY.example.com: master

% ipa-csreplica-manage list --verbose elY.example.com
Directory Manager password:

elX.example.com
  last init status: None
  last init ended: 1970-01-01 00:00:00+00:00
  last update status: Error (0) Replica acquired successfully: Incremental update succeeded
  last update ended: 2019-11-07 22:46:15+00:00
```

* Change CRL to new Enterprise Linux system and adjust settings on
  both replicas for pki-tomcatd and httpd

```
# Change CA master to elY
% ipa config-mod --ca-renewal-master-server elY.example.com

# Shut down all CRL generation on ELX
elX% ipa-crlgen-manage status
CRL generation: enabled
. . .

elX% ipa-crlgen-manage disable
Stopping pki-tomcatd
Editing /var/lib/pki/pki-tomcat/conf/ca/CS.cfg
Starting pki-tomcatd
Editing /etc/httpd/conf.d/ipa-pki-proxy.conf
Restarting httpd
CRL generation disabled on the local host. Please make sure to configure CRL generation on another master with ipa-crlgen-manage enable.
The ipa-crlgen-manage command was successful

# Verify that the /etc/httpd/conf.d/ipa-pki-proxy.conf file's RewriteRule is not commented
# If it is, remove the comment and restart httpd. ipa-crlgen-manage should take care of this.
% tail -n 1 /etc/httpd/conf.d/ipa-pki-proxy.conf
RewriteRule ^/ipa/crl/MasterCRL.bin https://elX.example.com/ca/ee/ca/getCRL?op=getCRL&crlIssuingPoint=MasterCRL [L,R=301,NC]

# Turn it on with ELY
elY% systemctl stop pki-tomcatd@pki-tomcat.service

# The values should be changed from false to true
elY% vi /etc/pki/pki-tomcat/ca/CS.cfg
ca.crl.MasterCRL.enableCRLCache=true
ca.crl.MasterCRL.enableCRLUpdates=true

elY% systemctl start pki-tomcatd@pki-tomcat.service

# Make sure the rewrite rule has a comment on elY
elY% vi /etc/httpd/conf.d/ipa-pki-proxy.conf
. . .
#RewriteRule ^/ipa/crl/MasterCRL.bin https://elY.example.com/ca/ee/ca/getCRL?op=getCRL&crlIssuingPoint=MasterCRL [L,R=301,NC]

elY% systemctl restart httpd
```

* Test user is created to ensure DNA range is adjusted and replication
  is working

```
% ipa user-add --first=testing --last=user testinguser1

# Test on both systems
elX% ipa user-find testinguser1
elY% ipa user-find testinguser1
```

* Verify DNA range

```
# There should be ranges for both replicas
% ipa-replica-manage dnarange-show
elX.example.com: ...
elY.example.com: ...
```

* Stop old Enterprise Linux IPA services, remove replica, uninstall

```
# Stop all elX services
elX% ipactl stop

# Delete the elX system from the topology
elY% ipa server-del elX.example.com

# Uninstall and/or power down system
elX% ipa-server-install --uninstall
elX% init 0
```

### EL8 to EL9

```
# Enterprise Linux 9
% dnf install ipa-server ipa-server-dns -y
% ipa-client-install --realm EXAMPLE.COM --domain example.com
% kinit admin

# Add other switches that you feel are necessary, such as forwarders, kra, ntp...
% ipa-replica-install --setup-dns --setup-ca --ssh-trust-dns --mkhomedir

# Verify all services are in a RUNNING state
% ipactl status
Directory Service: RUNNING
. . .

% ipa-csreplica-manage list
elX.example.com: master
elY.example.com: master

% ipa-csreplica-manage list --verbose elY.example.com
Directory Manager password:

elX.example.com
  last init status: None
  last init ended: 1970-01-01 00:00:00+00:00
  last update status: Error (0) Replica acquired successfully: Incremental update succeeded
  last update ended: 2022-08-12 18:11:11+00:00
```

Set the CA renewal master to the new system and change the CRL settings

```
% ipa config-mod --ca-renewal-master-server elY.example.com

# Remove the ca.certStatusUpdateInterval entry or set it to 600 (default) on elY
elY% vim /etc/pki/pki-tomcat/ca/CS.cfg

# Restart the ipa services
elY% ipactl restart

# Set the value of ca.certStatusUpdateInterval on elX to 0
elX% vim /etc/pki/pki-tomcat/ca/CS.cfg
ca.certStatusUpdateInterval=0

elX% ipactl restart

elX% ipa-crlgen-manage status
CRL generation: enabled
. . .

elX% ipa-crlgen-manage disable
Stopping pki-tomcatd
Editing /var/lib/pki/pki-tomcat/conf/ca/CS.cfg
Starting pki-tomcatd
Editing /etc/httpd/conf.d/ipa-pki-proxy.conf
Restarting httpd
CRL generation disabled on the local host. Please make sure to configure CRL generation on another master with ipa-crlgen-manage enable.
The ipa-crlgen-manage command was successful

elX% ipa-crlgen-manage status
CRL generation: disabled
```

Create a test user to ensure DNA range is adjusted and replication is
working

```
elY% ipa user-add --first=testing --last=user testinguser1

# Test on both systems
elX% ipa user-find testinguser1
elY% ipa user-find testinguser1
```

Verify DNA range.

```
# There should be ranges for both replicas
% ipa-replica-manage dnarange-show
elX.example.com: ...
elY.example.com: ...
```

Stop old Enterprise Linux IPA services, remove replica, uninstall.

```
# Stop all elX services
elX% ipactl stop

# Delete the elX system from the topology
elY% ipa server-del elX.example.com

# Uninstall and/or power down system
elX% ipa-server-install --uninstall
elX% init 0
```

See [this page](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/migrating_to_identity_management_on_rhel_9/index#migrating_idm_from_rhel_8_to_rhel_9)
for more information.

## Disable Anonymous Bind

In some cases, it is a requirement to disable *all* anonymous binds. If
this is the case, you will need to modify cn=config on each master as it
is not replicated.

!!! warning "rootdse"
    Some applications do anonymous binds to the directory server to
    determine its version and it supported controls. While it is possible to
    disable anonymous binds completely, it is important to know that if you
    disable the rootdse binds, applications that do anonymous lookups to get
    server information will fail.

```
% ldapmodify -xZZ -D "cn=Directory Manager" -W -h server.ipa.example.com
Enter LDAP Password:
dn: cn=config
changetype: modify
replace: nsslapd-allow-anonymous-access
nsslapd-allow-anonymous-access: rootdse

modifying entry "cn=config"
```

## Client Setup

### Enterprise Linux & Fedora

Ensure your /etc/resolv.conf (or other dns settings) are set correctly.
Ensure your hostname is also set correctly.

```
% dnf install ipa-client -y
% ipa-client-install --realm EXAMPLE.COM --domain example.com --mkhomedir
```

### Mac Clients

MacOS Clients are an interesting workstation to setup as a FreeIPA
client. It takes a little bit of fighting and troubleshooting, but it
can work with the right settings. **Note that as of Catalina, you may
not be able to login to your account nor will creating a mobile account
function as you would expect. This may have changed in recent macos
releases, so YMMV.**

!!! note "Other Guides"
    There are a couple of guides out there that you may have found before
    (if you looked) that help setup IPA for Mac. There's one for much older
    (I think Lion) and one for Sierra. This section was made mostly for my
    own reference because I found some things in both of those guides
    didn't address issues I ran into one way or another and couldn't find
    any information on. The FreeIPA users mail list didn't have any
    archives with people having similar issues.

    If you are interested in the other guides to compare to, you may see
    them [here (recent)](https://www.freeipa.org/page/HowTo/Setup_FreeIPA_Services_for_Mac_OS_X_10.12)
    and [here (older)](https://annvix.com/using_freeipa_for_user_authentication#Mac_OS_X_10.7.2F10.8)

!!! warning "AD Users"
    You cannot login as AD users on a Mac when going through FreeIPA with
    a trust. You can, in theory, point to the cn=compat tree and set the
    attribute mapping to rfc2307. In my tests, I have never been able to
    get this to work. This section, I am going to assume you are going to
    be logging in as a user in IPA. If you are in a mixed environment,
    add your Mac to your AD domain instead.

!!! warning "Anonymous Bind"
    There may be cases where if you have disabled anonymous binds in IPA,
    this setup may not work, even if you do use a bind account. You will
    need to experiment with this if you plan on using a bind account and
    plan on or currently have IPA not allowing anonymous binds.

Check your system's hostname. You want to make sure it has a hostname
defined for it in the domain the mac sits in, even if it's dynamic via
DHCP/DNS.

```
% sudo scutil --set HostName mac.example.com
```

Get the IPA certificate. You'll need to double click it after you get
it and import it.

```
% cd ~/Desktop && curl -OL http://server1.ipa.example.com/ipa/config/ca.crt
% sudo mkdir /etc/ipa
% sudo cp ca.crt /etc/ipa/ca.crt
% sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /etc/ipa/ca.crt
```

On the IPA server, you will need to create a host and get the keytab.

```
% ipa host-add mac.example.com --macaddress="00:00:00:00:00:00"
% ipa-getkeytab -s server1.ipa.example.com -p host/mac.example.com -k /tmp/krb5.keytab
```

You will need to transfer that keytab to your mac.

```
% cd ~
% scp user@server1.ipa.example.com:/tmp/krb5.keytab .
% sudo mv krb5.keytab /etc/krb5.keytab
% sudo chmod 640 /etc/krb5.keytab
% sudo chown root:_keytabusers /etc/krb5.keytab
```

Configure /etc/krb5.conf

```
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
```

You'll want to do a kinit to verify. If it works, you should be able to
go to the FreeIPA webui and check that the host is "enrolled"
(Identity -> Hosts).

```
% kinit username@IPA.EXAMPLE.COM
```

You need to modify a couple of pam files. I'll explain why they need to
be changed.

```
% sudo vi /etc/pam.d/authorization
# authorization: auth account
# Originally we used default_principal but it was found it can cause issues on
# Sonoma and newer. As a result, the below file may appear to be close to the
# default. You may still use default_principal if you wish.
#auth          optional       pam_krb5.so use_first_pass use_kcminit default_principal
auth          optional       pam_krb5.so use_first_pass use_kcminit no_auth_ccache
auth          optional       pam_ntlm.so use_first_pass
auth          required       pam_opendirectory.so use_first_pass nullok
account       required       pam_opendirectory.so

% sudo vi /etc/pam.d/screensaver
# screensaver: auth account
# Originally we used default_principal but it was found it can cause issues on
# Sonoma and newer. As a result, the below file may appear to be close to the
# default if you wish.
#auth       optional       pam_krb5.so use_first_pass use_kcminit default_principal
auth       optional       pam_krb5.so use_first_pass use_kcminit
auth       required       pam_opendirectory.so use_first_pass nullok
account    required       pam_opendirectory.so
account    sufficient     pam_self.so
account    required       pam_group.so no_warn group=admin,wheel fail_safe
account    required       pam_group.so no_warn deny group=admin,wheel ruser fail_safe

% sudo vi /etc/pam.d/passwd
# Originally the line below was required. There may be issues with
# having it on Sonoma and newer. YMMV.
# password   sufficient     pam_krb5.so
auth       required       pam_permit.so
account    required       pam_opendirectory.so
password   required       pam_opendirectory.so
session    required       pam_permit.so 
```

After these changes, you'll need to go into make some changes with the
directory utility. This depends on your macOS version.

#### Ventura and likely newer

1. Go to system preferences -> users & groups
2. Set "automatic login" to "off"
3. Click "edit" next to "Network account server"
4. Type in one of your IPA servers (you can duplicate it later for
   backup purposes). Press enter and wait for it to be "green".
5. Click "Open Directory Utility"
6. Click the "lock" to unlock the utility
7. Click "LDAPv3" and click the pencil at the bottom left corner
8. Select the "from server" portion under LDAP mappings and clck
   RFC2307. You may also leave it as custom.

* If you select rfc2307, it will ask for your base DN (eg,
  dc=ipa,dc=example,dc=com)
* If you select "custom", you will need to do this manually for each
  record type. **You're better off using rfc2307 and working from
  there**

1. Click "edit"
2. Click the "+" to add a groups record type or scroll and find
   "groups" and select it. Add the following object classes

| Record Type             | ObjectClasses   |
|-------------------------|-----------------|
| Groups                  | posixGroup      |
|                         | ipausergroup    |
|                         | groupOfNames*   |

!!! note
    "groupOfNames" is optional here, because it seems that the directory
    utility doesn't understand this concept.

3. Expand "groups" and ensure the following for each record type. You
   can click the "+" to add the attribute types as needed.

| Attribute               | Mapping         |
|-------------------------|-----------------|
| PrimaryGroupID          | gidNumber       |
| RecordName              | cn              |

4. Click the "+" to add a users record type or scroll and find
   "users".
5. Select "users" and ensure the following object classes exist. You
   can click the "+" to add them when needed.

| Record Type             | ObjectClasses  |
|-------------------------|----------------|
| Users                   | inetOrgPerson  |
|                         | posixAccount   |
|                         | shadowAccount  |
|                         | apple-user     |

6. Expand "users" and ensure the following for each record type. You
   can click the "+" to add the attribute types as needed. **Do not
   set homeDirectory otherwise you will fail to login.**

| Attribute               | Mapping                         |
|-------------------------|---------------------------------|
| AuthenticationAuthority | uid                             |
| GeneratedUID            | GeneratedUID or ipaUniqueID     |
| NFSHomeDirectory        | #/Users/$uid$                   |
| PrimaryGroupID          | gidNumber                       |
| RealName                | cn                              |
| RecordName              | uid                             |
| UniqueID                | uidNumber                       |
| UserShell               | loginShell                      |
| AltSecurityIdentities   | #Kerberos:$krbPrincipalName$    |

7. If using custom mapping, click reach record type you created and
   ensure the base DN is set.
8. Make sure each record type is set to all subtrees if needed.
9. Click "security" and set an authentication bind DN if needed
10. Click OK.
11. Click Search Policy
12. Double check that "/LDAPV3/server1.ipa.example.com" is listed
   beneath "/Local/Default". If it is not, select "search patch"
   and set it to custom and add it. Click Apply after.
13. Close everything until you're back to the users & groups section of
   preferences
14. Go to Lock Screen.
15. Set "login window shows" to "name and password"
16. Open a terminal.

```
% dscacheutil -flushcache
% dscacheutil -q user -a name username
```

You should get a return.

Login to the account for the first time from the login screen. Once the
setup has complete, log out and back to a login account. In a terminal,
you will need to make a mobile account.[^3]

```
% sudo /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P
# Press enter, enter the user's password. sudo may hang if you don't do this.
# OPTIONAL: Allow the mobile account to be an administrator
% sudo dscl . -append /Groups/admin GroupMembership username
```

Go to system preferences and ensure the account is a mobile account.

#### Monterey and older

1. Go to system preferences -\> users & groups -\> login options -
   Click the 'lock' to make changes
2. Set the following:

```
Automatic login: Off
Display login window as: Name and Password
Show fast user switching menu as: Full Name
```

1. Click "Join" next to "Network Account Server"
2. Enter one of your IPA servers (you can duplicate it later for backup
   purposes) and click Continue.
3. Ensure "Allow network users to log in at login window" is
   checked - Make sure it's set to all users
4. Click "edit" next to the "Network Account Server"
5. Click "Open Directory Utility"
6. Click the lock, edit LDAPv3
7. Select your server and click "edit"
8. Set the following options:

```
Open/close times out in 5 seconds
Query times out in 5 seconds
Connection idles out in 1 minute (this can't be changed)
Encrypt using SSL (selected)
```

9. Click "Search & Mappings"
10. You may either select "rfc2307" from the dropdown or select
    custom. It will ask your base DN (eg, dc=ipa,dc=example,dc=com)

* If you select rfc2307, it will ask for your base DN (eg,
  dc=ipa,dc=example,dc=com)
* If you select "custom", you will need to do this manually for each
  record type. **You're better off using rfc2307 and working from
  there**

11. Click the "+" to add a groups record type or scroll and find
    "groups".
12. Select "groups", and ensure the following object classes exist.
    You can click the "+" to add them when needed.

| Record Type             | ObjectClasses   |
|-------------------------|-----------------|
| Groups                  | posixGroup      |
|                         | ipausergroup    |
|                         | groupOfNames*   |

!!! note
    "groupOfNames" is optional here, because it seems that the directory
    utility doesn't understand this concept.

13. Expand "groups" and ensure the following for each record type. You
    can click the "+" to add the attribute types as needed.

| Attribute               | Mapping        |
|-------------------------|----------------|
| PrimaryGroupID          | gidNumber      |
| RecordName              | cn             |

14. Click the "+" to add a users record type or scroll and find
    "users".
15. Select "users" and ensure the following object classes exist. You
    can click the "+" to add them when needed.

| Record Type             | ObjectClasses  |
|-------------------------|----------------|
| Users                   | inetOrgPerson  |
|                         | posixAccount   |
|                         | shadowAccount  |
|                         | apple-user     |

16. Expand "users" and ensure the following for each record type. You
    can click the "+" to add the attribute types as needed. **Do not
    set homeDirectory otherwise you will fail to login.**

| Attribute               | Mapping                         |
|-------------------------|---------------------------------|
| AuthenticationAuthority | uid                             |
| GeneratedUID            | GeneratedUID or ipaUniqueID     |
| HomeDirectory           | #/Users/$uid$                   |
| NFSHomeDirectory        | #/Users/$uid$                   |
| PrimaryGroupID          | gidNumber                       |
| RealName                | cn                              |
| RecordName              | uid                             |
| UniqueID                | uidNumber                       |
| UserShell               | loginShell                      |
| AltSecurityIdentities   | #Kerberos:$krbPrincipalName$    |

17. If using custom mapping, click reach record type you created and
    ensure the base DN is set.
18. Make sure each record type is set to all subtrees.
19. Click "security" and set an authentication bind DN if needed
20. Click OK
21. Click OK
22. Click on Search Policy.
23. Double check that "/LDAPV3/server1.ipa.example.com" is listed
    beneath "/Local/Default"
24. Close everything until you're back to the users & groups section of
    preferences
25. Open a terminal.

```
% dscacheutil -flushcache
% dscacheutil -q user -a name username
```

You should get a return.

If you want to further verify users and groups after the above succeeds,
open up the directory utility again. Click "Directory Editor", ensure
you are searching for "users" and check that they appear in a list on
the right hand side, optionally doing a search. In a default setup, you
shouldn't need an account to do (some) anonymous lookups. If you
changed that in any way, you will need to create a readonly system
account in cn=sysaccounts,cn=etc.

Login to the account for the first time from the login screen. Once the
setup has complete, log out and back to a login account. In a terminal,
you will need to make a mobile account.[^2]

```
% sudo /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P
# Press enter and put in the password. sudo may not function if you don't do this step.
# OPTIONAL: Allow the mobile account to be an administrator
% sudo dscl . -append /Groups/admin GroupMembership username
```

Go to system preferences, users & groups and ensure the account is a
mobile account.


#### General macOS Notes

!!! note "Group Resolution"
    If you want groups from IPA to resolve to the system, you'll need to
    enable the compat tree when using this setup (RFC2307).

!!! warning "Password Notes"
    There are a couple of potential issues with this setup that you should
    be aware of as it pertains to mobile accounts.

    * If you do a mobile account, changing your password through the
      FreeIPA gui does not change your passwords on your system.
    * If your account does not have any keytabs (eg, you haven't had your
      mac on or haven't logged in in over 24 hours), you can login with
      the new password and it will suceed. The system will cache the new
      password right away. However, your keychain the first time will ask
      for the old passwords and this is normal. So you can change them by
      hand or you can log out and back in and the system will ask you if
      you want to update the password and it will just update
      automatically.
    * There have been reports in a github issue that states you can change
      the password in the system preferences but I've been unable to
      confirm this.

!!! warning "/Library no longer accessible"
    It is no longer possible to access /Library by normal means on macOS.
    This unfortunately means you will need to do some steps, in particular
    the plist deployment steps, in a different way. You may need to do it
    manually in the directory utility after deploying everything else.

!!! note "User from IPA is not the owner"
    Users *not* created by the first user on macOS are not able to run
    software updates, in any capacity. This means your IPA user, as you
    login to your system, will *not* be able to run `softwareupdate` nor
    run updates normally from system settings.

    To get around this, you will need to run:

    `/usr/sbin/sysadminctl -secureTokenOn label - -adminUser nazu -adminPassword -`

Below is a script that can be adapted for you. It has not been tested on
Monterey and up. This assumes that you took one mac and set it up
properly and you created a tarball with the proper configuration. You
could optionally setup a temporary NFS or samba mount that gets mounted
as root and then unmounted at the end, if you so wish.

```
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
```

If you want to move your local files, you will need to tread lightly
here. I personally believe it's always good to start fresh though. Look
into the ditto command. I suppose something like this can work:

```
# make sure you're logged in as a different account away from your local account
% sudo su -
root# cd /Users
root# ditto localfolder networkfolder (or maybe an mv?)
root# chown -R user:user folder
root# /System/Library/CoreServices/ManagedClient.app/Contents/Resources/createmobileaccount -n username -P
```

Another issue you may run into, if you have been using your Mac with a
local account for a while, a lot of directories in /Applications will be
owned by localuser:staff or localuser:admin. It's recommended to fix
those too.

!!! note "Discovery"
    The directory framework in MacOS has the ability to discover settings
    for a particular LDAP server that it is being connected to. FreeIPA does
    not contain the schema, plugins, nor the infrastructure to provide the
    same things (for example, mDNS/Avahi, among other things). There was a
    (WIP) plugin created in 2017 by abbra. However, it is unclear if this
    works at all, nor is it clear if it ever did and will in python3 (abbra
    noted at the time that it "installs" into python 2 directories, which
    hints to not being tested or working on python 3). Please see the
    following resources for discussion and information.

    * [Pagure](https://pagure.io/freeipa/issue/4813)
    * [freeipa-macosx-support](https://github.com/abbra/freeipa-macosx-support)

### SUSE

To setup openSUSE with FreeIPA, we'll need to do some manual work. This
applies to SUSE 12 and up where the freeipa-client packages don't exist
in the main repositories.

!!! note "freeipa repos"
    There are OpenSUSE repos with the freeipa packages, though they are
    considered "experimental". If they show up in the base, then the below
    steps will be removed. However, if you are willing to use the
    [repo](https://software.opensuse.org/download/package?package=freeipa-client&project=openSUSE%3Ainfrastructure%3Aipsilon),
    a lot of the steps below may not be needed. We have not tested this.

```
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
% sed -i '/netgroup/ s/nis/sss/g' /etc/nsswitch.conf

# Depending on your suse version, you may want to set the nisdomainname
# It does not hurt to set this
% sed -i.bak '/NETCONFIG_NIS_STATIC_DOMAIN/ s/""/"example.com"/g' /etc/sysconfig/network/config
% netconfig update -f

# Start sssd
% systemctl enable sssd --now

# Verify
% id admin
```

In the case of having an IPA-AD trust, you may need to change a line in
your pam configuration.

```
% sed -i 's/use_first_pass/forward_pass/g' /etc/pam.d/common-auth-pc

# The affected line should appear like the below
auth    sufficient      pam_sss.so      forward_pass
```

## HBAC

When we first setup our IPA servers, we had an option set to make it so
hbac wasn't allowed for everyone. This way we have to create HBAC rules
for our systems. I personally do this out of habit when working with
IPA. What we need to do though is create an "admin" group that can
login to all machines.

```
% ipa idrange-show IPA.EXAMPLE.COM_id_range
  Range name: IPA.EXAMPLE.COM_id_range
  First Posix ID of the range: 686600000
  Number of IDs in the range: 200000
  First RID of the corresponding RID range: 1000
  First RID of the secondary RID range: 100000000
  Range type: local domain range
% ipa group-add --gid=686610000 linuxadm
% ipa group-add-member --users=flast linuxadm
```

Now, let's create an HBAC for our Linux Administrator account for our
group.

```
% ipa hbacrule-add --hostcat=all --servicecat=all --desc='linux admins all access' linuxadm
% ipa hbacrule-add-user --groups=linuxadm linuxadm
% ipa hbactest --rules=All_Systems --user=flast --host=server1.ipa.example.com --service=sshd
% ipa hbactest --rules=All_Systems --user=aduser1@example.com --host=server1.ipa.example.com --service=sshd
```

You might want to create an HBAC rule specifically for your IPA admin
accounts to have ssh access to the IPA servers too. You can follow
something like the above to make it possible. Or you can just add the
IPA admins group into the HBAC rule we just made above.

### SUDO

Setting up sudo is relatively easy. SSSD (1.16.x and 2.X) supports IPA
as a provider for sudo. Based on the last section, let's create a
sample rule for our Linux admins that can login to every system, we want
to ensure they can run all commands.

```
% ipa sudorule-add --runasusercat=all --hostcat=all --cmdcat=all --desc='linux admins all sudo' all_linux_sudo
% ipa sudorule-add-user --groups=linuxadm all_linux_sudo
```

You can make this a little more specific, such as /bin/bash as everyone
or otherwise. It's your call here. If you want to create a sudo rule
and add some commands to it, you can do something like this.

```
% ipa sudorule-add sudo_rule
% ipa sudorule-add-allow-command --sudocmds="/usr/bin/less" sudo_rule
```

## Legacy Client Setup

This applies to Solaris, OpenIndiana, others based on Illumos.

### Solaris 11

Solaris 11 shares similar configuration to Solaris 10. There are a
couple of manual things we have to do, but they are trivial. Solaris
11/Illumos will use TLS and sudo should just work.

!!! note "AD Groups"
    In Solaris 10, users who logged in with AD users (with their short name)
    would appear as their full name (<name@domain>). This allowed their
    groups to fully resolve. However, in Solaris 11.4, this was not the
    case. Short name logins will work but your groups will not resolve as
    the compat tree uses the full name. To avoid running into this problem,
    you should be on at least SRU 11.4.7.4.0. Note that on a later SRU, you
    may need to setup an ID view (without overrides) for groups and sudo to
    work again.

Below is for the service account like in the previous section, here as a
reference.

```
dn: uid=solaris,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
objectclass: account
objectclass: simplesecurityobject
uid: solaris
userPassword: secret123
passwordExpirationTime: 20380119031407Z
nsIdleTimeout: 0
```

```
% ldapadd -xWD 'cn=Directory Manager' -f /tmp/solaris.ldif
```

Now, set the nisdomain.

```
% defaultdomain ipa.example.com
% echo 'ipa.example.com' > /etc/defaultdomain
```

Configure kerberos.

```
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
```

Generate a keytab and bring it over.

```
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
```

Create the LDAP configurations, bring the certificate, and create an NSS
database.

!!! note "Solaris 11.3 vs 11.4"
    Previously we had 11.3 and 11.4 configurations. We have removed 11.3 as
    we no longer support it.

```
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
TLS_CACERTDIR /var/ldap
ssl start_tls
tls_checkpeer no
```

Now init the ldap client. We actually get to use a secure connection
here. Kerberos is hit or miss, could never get sasl/GSSAPI to work.

!!! note "Different Trees - Trust or not?"
    There are multiple examples of how to setup the trees. If using an AD
    trust, you should use the second example, where it looks at the compat
    tree for users. However, if you do not have trusts, then it is perfectly
    possible to still use the AD Trust example. Try both and see which works
    better for your environment.

!!! warning "No Service Account"
    If you have configured FreeIPA to not allow any anonymous connections,
    you will need to use a proxy account. We have provided the examples for
    this configuration.

**Without AD Trust**

```
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

# Without AD Trust (Kerberos) - Only works if Solaris is in the same DNS domain as IPA
% ldapclient manual -a authenticationMethod=sasl/GSSAPI \
                    -a credentialLevel=self \
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
```

**With AD Trust**

```
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

# With AD Trust (Kerberos) - Only works if Solaris is in the same DNS domain as IPA
% ldapclient manual -a authenticationMethod=sasl/GSSAPI \
                    -a credentialLevel=self \
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
```

This should succeed. Once it succeeds, you need to configure pam and
nsswitch.

```
% /usr/sbin/svccfg -s name-service/switch setprop config/sudoer = astring: "files ldap"
% /usr/sbin/svccfg -s name-service/switch setprop config/password = astring: "files ldap [NOTFOUND=return]"
% /usr/sbin/svccfg -s name-service/switch setprop config/group = astring: "files ldap [NOTFOUND=return]"

% /usr/sbin/svcadm refresh svc:/system/name-service/switch
% /usr/sbin/svcadm restart svc:/system/name-service/switch
% /usr/sbin/svcadm restart ldap/client
```

!!! note "AD Trust Information"
    In the event you don't have an AD trust, you can change the "binding"
    lines to required and remove the pam_ldap lines. Optionally, you can
    set pam_krb5 to "required", however sufficient should work just fine.

**Without an AD Trust**

```
% vi /etc/pam.d/login
auth definitive         pam_user_policy.so.1
auth requisite          pam_authtok_get.so.1
auth required           pam_dhkeys.so.1
auth sufficient         pam_krb5.so.1
auth required           pam_unix_cred.so.1
auth sufficient         pam_unix_auth.so.1 server_policy

% vi /etc/pam.d/other
auth definitive         pam_user_policy.so.1
auth requisite          pam_authtok_get.so.1
auth required           pam_dhkeys.so.1
auth sufficient         pam_krb5.so.1
auth required           pam_unix_cred.so.1
auth sufficient         pam_unix_auth.so.1 server_policy

account requisite       pam_roles.so.1
account definitive      pam_user_policy.so.1
account required        pam_unix_account.so.1 server_policy
account sufficient      pam_krb5.so.1

session definitive      pam_user_policy.so.1
session required        pam_unix_session.so.1

password definitive     pam_user_policy.so.1
password include        pam_authtok_common
password sufficient     pam_krb5.so.1
password required       pam_authtok_store.so.1 server_policy

% vi /etc/pam.d/sshd-pubkey
account required        pam_unix_account.so.1
```

**With an AD Trust**

```
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
```

You can test now if you'd like.

```
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
```

### Automated Scripts

I at one point built a bunch of scripts to automate Solaris servers
talking to IPA
[here](https://github.com/nazunalika/useful-scripts/tree/master/freeipa).
However, it is likely the scripts no longer work or contain outdated
information.

### AD Trust Double UID

Solaris 11 once in a while gets random regressions when it comes to
authentication and ID's, among many other things they randomly decide
to break. Big shout out to Oracle.

In a brief discussion with a user in the #freeipa IRC channel, the user
was trying to find a way to chop off the domain name for logins but also
have sudo still work as there were some random issues in general. We
both discovered that in SRU 11.4.20.4.0, even though both UID's are
present from ldaplist -l passwd, sudo was no longer working properly.
The first thing we tried was to create an ID view and override a user
with a new username. This successfully removed the domain, but did not
solve the sudo problem. He instead got "no account present for that
user". However, I wasn't able to replicate this.

However, later, one thing he noticed is after creating an ID view with
no overrides and pointing Solaris 11 to the view in the compat tree,
Solaris 10-esque authentication ID reporting started to occur. Running
ldaplist -l passwd user reported back the double UID as expected, but
the FQDN comes first which resolved his group/sudo issues.

```
# Create a view... no id overrides required here
% ipa idview-add solaris
# On Solaris...
# Take EXTREME care with the group and passwd base DN's, they need to point
# to the view properly
# This example uses kerberos to authenticate.
% ldapclient manual -a authenticationMethod=self \
                    -a credentialLevel=sasl/GSSAPI \
                    -a defaultSearchBase=dc=ipa,dc=example,dc=com \
                    -a domainName=ipa.example.com \
                    -a defaultServerList="server1.angelsofclockwork.net server2.angelsofclockwork.net" \
                    -a followReferrals=true \
                    -a objectClassMap=shadow:shadowAccount=posixAccount \
                    -a objectClassMap=passwd:posixAccount=posixaccount \
                    -a objectClassMap=group:posixGroup=posixgroup \
                    -a serviceSearchDescriptor=group:cn=groups,cn=solaris,cn=views,cn=compat,dc=angelsofclockwork,dc=net \
                    -a serviceSearchDescriptor=passwd:cn=users,cn=solaris,cn=views,cn=compat,dc=angelsofclockwork,dc=net \
                    -a serviceSearchDescriptor=netgroup:cn=ng,cn=compat,dc=ipa,dc=example,dc=com \
                    -a serviceSearchDescriptor=ethers:cn=computers,cn=accounts,dc=ipa,dc=example,dc=com \
                    -a serviceSearchDescriptor=sudoers:ou=sudoers,dc=ipa,dc=example,dc=com \
                    -a bindTimeLimit=5
# Make sure you set your props...
% /usr/sbin/svccfg -s name-service/switch setprop config/sudoer = astring: "files ldap"
% /usr/sbin/svccfg -s name-service/switch setprop config/password = astring: "files ldap [NOTFOUND=return]"
% /usr/sbin/svccfg -s name-service/switch setprop config/group = astring: "files ldap [NOTFOUND=return]"

% /usr/sbin/svcadm refresh svc:/system/name-service/switch
% /usr/sbin/svcadm restart svc:/system/name-service/switch
% /usr/sbin/svcadm restart ldap/client
# Verify...
% ldaplist -l passwd adusername
. . .
% id -a adusername
. . .
```

Thank you to "mewho" on libera for finding this interesting workaround.

### Illumos

Some steps from Solaris 11 can be followed to make Illumos systems work.
However, we have been unable to resolve why sudo will not work when
using an AD trust. If you are using a standalone FreeIPA and no trust,
sudo should work just fine.

### Legacy HBAC

For HBAC to work on OpenIndiana or Solaris, you will need to compile the
pam_hbac module found [here](https://github.com/jhrozek/pam_hbac). I
would clone the current master branch or download the master.zip to your
system. Each OS has their set of instructions for compiling.

First, create the following system account. We will need this when we
are configuring our legacy clients.

    dn: uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
    objectClass: account
    objectClass: simplesecurityobject
    objectClass: top
    uid: hbac
    userPassword: password

#### Solaris 11

```
% pkg install autoconf libtool pkg-config automake gcc docbook
% autoreconf -if
% ./configure --with-pammoddir=/usr/lib/security --mandir=/usr/share/man --sysconfdir=/etc/
% make
% make install
```

#### Illumos

```
% pkg install developer/build/autoconf developer/build/libtool \
              developer/pkg-config developer/build/automake    \
              developer/gcc48 system/header developer/object-file \
              developer/linker
% autoreconf -if
% ./configure --with-pammoddir=/usr/lib/security --mandir=/usr/share/man --sysconfdir=/etc/
% make
% make install
```

#### pam_hbac.conf

```
% vim /etc/pam_hbac.conf

# Replace client with your server's FQDN
URI = ldap://server.ipa.example.com
BASE = dc=ipa,dc=example,dc=com
BIND_DN = uid=hbac,cn=sysaccounts,cn=etc,dc=ipa,dc=example,dc=com
BIND_PW = password
SSL_PATH = /var/ldap
HOST_NAME = client
```

#### PAM Configuration

```
# Solaris 11 - /etc/pam.d/other
# only modify the account section
. . .
account required        pam_hbac.so ignore_unknown_user ignore_authinfo_unavail
```

In the event you cannot login or things aren't working the way you'd
expect, add 'debug' to the end of the pam_hbac line and watch
/var/log/authlog for errors.

### Login with AD Users to Legacy Clients

For AD users to be able to login to legacy clients, you have to enable
system-auth to the IPA servers. Without it, users will be denied access,
regardless of HBAC controls or if you're using the pam_hbac module.

```
% ipa hbacsvc-add system-auth
% ipa hbacrule-add legacy_client_auth
% ipa hbacrule-add-host --hostgroups=ipaservers legacy_client_auth
% ipa hbacrule-mod --usercat=all legacy_client_auth
```

### Legacy Active Directory Trust Notes

Just a section of notes in IPA-AD trust scenarios.

#### Domain Resolution Order Oddness

If using domain resolution order, AD users get double uid attributes -
but only if they login with their shortname. If they login with fqdn,
double uid's do not occur. But shortnames do not work anymore. Have to
restart the directory server to make short names work again.

#### Solaris Weirdness

If using domain resolution order, Solaris 10 gets the group resolution
correct for short named AD users. Solaris 11 does not unless you are on
SRU 11.4.7.4.0 or newer. There is a way to chop off the domain name from
the uid using views.

## Domain Options

The next sections go over "situational" scenarios. These scenarios are
reflective of the environment in which IPA is installed and not all will
fit into your environment. These may be less common situations that could
occur during or post IPA deployment.

## DNS Configurations

### DNS Forwarding to DoT

Presently, FreeIPA does not support DoT (DNS over TLS) nor DoH (DNS over
HTTPS) (this appears to be a bind limitation and we can't find
documentation that says otherwise). However, it is possible to setup
unbound to do the forwarding for you, in which you tell your bind
servers (or in this case, the bind DNS servers in your IPA domain) to
forward to that unbound server for all forwarding.

!!! note "Keep it Separate"
    It is recommended to keep your unbound service separate from the IPA
    servers. Spin up another instance in your network that will run unbound
    or run it on a standalone bind server that you may have on a separate
    port.

To forward to the unbound service, modify the DNS global configuration
in IPA:

```
# Replace 10.100.0.224 with the IP of your unbound instance
% ipa dnsconfig-mod --forward-policy=only --forwarder='10.100.0.224'

# Add 'port xxxx' if you have set unbound to another port
% ipa dnsconfig-mod --forward-policy=only --forwarder='10.100.0.224 port 9553'
```

### DNS Locations

FreeIPA has the ability to do "locations". Locations are a way to distribute
load from clients and as a way of performing discovery, without the need to use
special client code or IP subnet configurations. These locations are set up as
SRV records with proper priorities set alongside CNAME records. Depending on the
location in which an IPA DNS server resides, they will serve different
information to the requesting client.

For example, let's say you have two locations: Phoenix, Salt Lake City. You name
these locations "phx" and "slc" respectively in FreeIPA.

```
% ipa location-add phx --description="Phoenix"
% ipa location-add slc --description="Salt Lake City"
```

You then add the specific IPA servers to those given locations. Let's say we
have two servers per location.

```
% ipa server-mod ipa01.phx.example.com --location=phx
% ipa server-mod ipa02.phx.example.com --location=phx
% ipa server-mod ipa01.slc.example.com --location=slc
% ipa server-mod ipa02.slc.example.com --location=slc
```

If you want to lower the TTL, you can as well.

```
% ipa dnszone-mod example.com. --default-ttl=3600
```

After performing these changes, all servers will need the `named` service
restarted.

```
# On EL8, this will be named-pkcs11
% systemctl restart named
```

This is when you can then test what comes back from a lookup. Notice that when
we query a Phoenix-based server, we get a different result from the Salt Lake
City-based server. Also notice that `_ldap._tcp.example.com` is a CNAME to the
location SRV record, which makes this all happen.

```
% dig @10.100.0.231 _ldap._tcp.example.com SRV
. . .
;; ANSWER SECTION:
_ldap._tcp.example.com. 86400 IN     CNAME   _ldap._tcp.phx._locations.example.com.
_ldap._tcp.phx._locations.example.com. 86400 IN SRV 0 100 389 ipa01.phx.example.com.
_ldap._tcp.slc._locations.example.com. 86400 IN SRV 50 100 389 ipa01.slc.example.com.
_ldap._tcp.phx._locations.example.com. 86400 IN SRV 0 100 389 ipa02.phx.example.com.
_ldap._tcp.slc._locations.example.com. 86400 IN SRV 50 100 389 ipa02.slc.example.com.

% dig @10.100.1.231 _ldap._tcp.example.com SRV
. . .
;; ANSWER SECTION:
_ldap._tcp.example.com. 86400 IN     CNAME   _ldap._tcp.slc._locations.example.com.
_ldap._tcp.slc._locations.example.com. 86400 IN SRV 0 100 389 ipa01.slc.example.com.
_ldap._tcp.slc._locations.example.com. 86400 IN SRV 0 100 389 ipa02.slc.example.com.
_ldap._tcp.phx._locations.example.com. 86400 IN SRV 50 100 389 ipa01.phx.example.com.
_ldap._tcp.phx._locations.example.com. 86400 IN SRV 50 100 389 ipa02.phx.example.com.
```

### DNS Locations for non-IPA Services

As of this writing, DNS location records for non-IPA services is not directly
supported. However, it is possible to set it up using the `ipa` utility to do
so.

The way the location system works (at its most basic level) is by utilizing
templates on the LDAP objects. For example, if you have locations setup, and you
look at a DNS record's LDAP object, you'll see this:

```
dn: idnsname=_ldap._tcp,idnsname=example.com.,cn=dns,dc=angelsofclockwork,dc=net
objectClass: top
objectClass: idnsrecord
objectClass: idnsTemplateObject
idnsName: _ldap._tcp
idnsTemplateAttribute;cnamerecord: _ldap._tcp.\{substitutionvariable_ipalocation\}._locations
sRVRecord: 0 100 389 ipa01.phx.example.com.
sRVRecord: 0 100 389 ipa02.phx.example.com.
sRVRecord: 0 100 389 ipa01.slc.example.com.
sRVRecord: 0 100 389 ipa02.slc.example.com.

dn: idnsname=_ldap._tcp.phx._locations,idnsname=example.com.,cn=dns,dc=example,dc=com
objectClass: top
objectClass: idnsrecord
idnsname: _ldap._tcp.phx._locations
srvrecord: 50 100 389 ipa01.slc.example.com.
srvrecord: 50 100 389 ipa02.slc.example.com.
srvrecord: 0 100 389 ipa01.phx.example.com.
srvrecord: 0 100 389 ipa02.phx.example.com.

dn: idnsserverid=ipa01.phx.example.com,cn=servers,cn=dns,dc=rockylinux,dc=com
objectClass: top
objectClass: idnsServerConfigObject
idnsServerid: ipa01.phx.example.com
idnsSOAmName: ipa01.phx.example.com.
idnsforwardpolicy: only
idnsSubstitutionVariable;ipalocation: phx
```

When location services are turned on, the `substitutionvariable_ipalocation` is
filled in for the CNAME record, per the DNS server configuration. Using a
similar setup to `_ldap._tcp`, location services can be setup easily for non-IPA
services.

Let's say that you have a multi-node XMPP service, where each server is in each
location you have setup and you want to make sure that the XMPP server closest
to your clients will have higher priority. If you haven't made the service
records already, now is the time to do so.

```
% ipa dnsrecord-add example.com _xmpp-client \
  --srv-priority=0 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.phx.example.com.

% ipa dnsrecord-add example.com _xmpp-client \
  --srv-priority=0 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.slc.example.com.

% ipa dnsrecord-add example.com _xmpp-server \
  --srv-priority=0 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.phx.example.com.

% ipa dnsrecord-add example.com _xmpp-server \
  --srv-priority=0 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.slc.example.com.
```

Now you should be able to verify that they exist.

```
% dig @10.100.0.231 _xmpp-client._tcp.example.com SRV +short
0 100 5222 xmpp01.phx.example.com.
0 100 5222 xmpp01.slc.example.com.

% dig @10.100.0.231 _xmpp-server._tcp.example.com SRV +short
0 100 5269 xmpp01.phx.example.com.
0 100 5269 xmpp01.slc.example.com.
```

Now that the records exist, we need to make the "location" versions of them. In
this scenario, we have two locations, so in total we'll have four records with
differing priorities.

```
# Phoenix
% ipa dnsrecord-add example.com _xmpp-client.phx._locations \
  --srv-priority=0 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.phx.example.com.

% ipa dnsrecord-add example.com _xmpp-client.phx._locations \
  --srv-priority=50 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.slc.example.com.

% ipa dnsrecord-add example.com _xmpp-server.phx._locations \
  --srv-priority=0 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.phx.example.com.

% ipa dnsrecord-add example.com _xmpp-server.phx._locations \
  --srv-priority=50 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.slc.example.com.

# Salt Lake City
% ipa dnsrecord-add example.com _xmpp-client.slc._locations \
  --srv-priority=0 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.slc.example.com.

% ipa dnsrecord-add example.com _xmpp-client.slc._locations \
  --srv-priority=50 --srv-weight=100 --srv-port=5222 \
  --srv-target=xmpp01.phx.example.com.

% ipa dnsrecord-add example.com _xmpp-server.slc._locations \
  --srv-priority=0 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.slc.example.com.

% ipa dnsrecord-add example.com _xmpp-server.slc._locations \
  --srv-priority=50 --srv-weight=100 --srv-port=5269 \
  --srv-target=xmpp01.phx.example.com.
```

For the location mechanism to work, now we have to modify the original SRV
record with the correct object class and attribute.

```
% ipa dnsrecord-mod --setattr=objectclass=top
  --addattr=objectclass=idnsrecord \
  --addattr=objectclass=idnstemplateobject example.com _xmpp-client._tcp  \
  --setattr="idnsTemplateAttribute;cnamerecord=_xmpp-client._tcp.\{substitutionvariable_ipalocation\}._locations"
```

The DNS servers will now provide the appropriate priorities to the services.

## Logging

### Audit Logs

By default, the audit logs in /var/log/dirsrv/slapd-INSTANCE/audit do
not get populated. And the access logs don't show much in terms of
modifications and what is being changed. There is also `/var/log/httpd/*`
logs, but it may be useful to see ldif style logging for changes against
FreeIPA.

```
# Modify the DSE configuration by turning on audit logging
[label@ipa01 ~]# ldapmodify -D "cn=directory manager" -W -p 389 -h localhost
Enter LDAP Password:
dn: cn=config
changetype: modify
replace: nsslapd-auditlog-logging-enabled
nsslapd-auditlog-logging-enabled: on
# Press CTRL+d here
modifying entry "cn=config"

# To test, I'll add a user to a group
[label@ipa01 ~]$ ipa group-add-member --users=jbaskets aocusers
  Group name: aocusers
  GID: 686600003
  Member users: ..., jbaskets
-------------------------
Number of members added 1
-------------------------
# Let's verify the log
[label@ipa01 ~]$ sudo su -
[sudo] password for label:
Last login: Sun Mar 29 16:42:36 MST 2020 on pts/0
[root@ipa01 ~]# cd /var/log/dirsrv/slapd-EXAMPLE-NET/
[root@ipa01 slapd-EXAMPLE-NET]# cat audit
time: 20200329223754
dn: cn=config
result: 0
changetype: modify
replace: nsslapd-auditlog-logging-enabled
nsslapd-auditlog-logging-enabled: on
-
replace: modifiersname
modifiersname: cn=directory manager
-
replace: modifytimestamp
modifytimestamp: 20200330053754Z
-

        389-Directory/1.4.1.3 B2019.323.229
        ipa01.example.net:636 (/etc/dirsrv/slapd-EXAMPLE-NET)

# Looks like right here the modification happened 
time: 20200329224007
dn: cn=aocusers,cn=groups,cn=accounts,dc=example,dc=net
result: 0
changetype: modify
add: member
member: uid=jbaskets,cn=users,cn=accounts,dc=example,dc=net
-
replace: modifiersname
modifiersname: uid=label,cn=users,cn=accounts,dc=example,dc=net
-
replace: modifytimestamp
modifytimestamp: 20200330054006Z
-
replace: entryusn
entryusn: 900028
-
```

## Certificates

These are notes of things I've ran into before while dealing with
certificates.

### Renewed IPA HTTP Certificate Stuck

This was something I discovered sort of on accident but never really
"noticed" - Though I'm sure I would've noticed sometime in 2021 when
my certificate expired. I was running ipa-healthcheck \--failures-only
as I do sometimes, and noticed some weird certmonger things pop up. But
it made me look at my certificate list\...

```
[root@ipa01 ~]# ipa-getcert list
Number of certificates and requests being tracked: 9.
Request ID '20191106025922':
        status: MONITORING
        stuck: no
        key pair storage: type=FILE,location='/var/kerberos/krb5kdc/kdc.key'
        certificate: type=FILE,location='/var/kerberos/krb5kdc/kdc.crt'
        CA: IPA
        issuer: CN=Certificate Authority,O=ANGELSOFCLOCKWORK.NET
        subject: CN=ipa01.angelsofclockwork.net,O=ANGELSOFCLOCKWORK.NET
        expires: 2021-11-05 19:59:27 MST
        principal name: krbtgt/ANGELSOFCLOCKWORK.NET@ANGELSOFCLOCKWORK.NET
        key usage: digitalSignature,nonRepudiation,keyEncipherment,dataEncipherment
        eku: id-kp-serverAuth,id-pkinit-KPKdc
        pre-save command:
        post-save command: /usr/libexec/ipa/certmonger/renew_kdc_cert
        track: yes
        auto-renew: yes
Request ID '20200123075636':
        status: MONITORING
        stuck: no
        key pair storage: type=NSSDB,location='/etc/dirsrv/slapd-ANGELSOFCLOCKWORK-NET',nickname='Server-Cert',token='NSS Certificate DB',pinfile='/etc/dirsrv/slapd-ANGELSOFCLOCKWORK-NET/pwdfile.txt'
        certificate: type=NSSDB,location='/etc/dirsrv/slapd-ANGELSOFCLOCKWORK-NET',nickname='Server-Cert',token='NSS Certificate DB'
        CA: IPA
        issuer: CN=Certificate Authority,O=ANGELSOFCLOCKWORK.NET
        subject: CN=ipa01.angelsofclockwork.net,O=ANGELSOFCLOCKWORK.NET
        expires: 2021-11-05 19:55:33 MST
        dns: ipa01.angelsofclockwork.net
        principal name: ldap/ipa01.angelsofclockwork.net@ANGELSOFCLOCKWORK.NET
        key usage: digitalSignature,nonRepudiation,keyEncipherment,dataEncipherment
        eku: id-kp-serverAuth,id-kp-clientAuth
        pre-save command:
        post-save command: /usr/libexec/ipa/certmonger/restart_dirsrv ANGELSOFCLOCKWORK-NET
        track: yes
        auto-renew: yes
Request ID '20200123075639':
        status: NEWLY_ADDED_NEED_KEYINFO_READ_PIN
        stuck: yes
        key pair storage: type=FILE,location='/var/lib/ipa/private/httpd.key'
        certificate: type=FILE,location='/var/lib/ipa/certs/httpd.crt'
        CA: IPA
        issuer: CN=Certificate Authority,O=ANGELSOFCLOCKWORK.NET
        subject: CN=ipa01.angelsofclockwork.net,O=ANGELSOFCLOCKWORK.NET
        expires: 2021-11-05 19:55:48 MST
        dns: ipa01.angelsofclockwork.net
        principal name: HTTP/ipa01.angelsofclockwork.net@ANGELSOFCLOCKWORK.NET
        key usage: digitalSignature,nonRepudiation,keyEncipherment,dataEncipherment
        eku: id-kp-serverAuth,id-kp-clientAuth
        pre-save command:
        post-save command: /usr/libexec/ipa/certmonger/restart_httpd
        track: yes
        auto-renew: yes
```

Interestingly, I wasn't sure what
NEWLY_ADDED_NEED_KEYINFO_READ_PIN meant and I couldn't really find
much on what would cause this to happen. And I know my certificate
isn't expired, according to the output. In fact, I checked with openssl
just in case.

```
[root@ipa01 ~]# openssl x509 -text -noout -in /var/lib/ipa/certs/httpd.crt | grep 'Not After'
            Not After : Nov  6 02:55:48 2021 GMT
```

I'm not sure if this is just a result of migrating from Enterprise
Linux 7 to 8 at the time, but it seemed easy enough to remove the
tracking and put it back in, which ultimately fixed the monitoring state
and now it was no longer "stuck".

```
[root@ipa01 ~]# ipa-getcert stop-tracking -i 20200123075639
Request "20200123075639" removed.
[root@ipa01 ~]# ipa-getcert start-tracking -f /var/lib/ipa/certs/httpd.crt -k /var/lib/ipa/private/httpd.key -p /var/lib/ipa/passwds/ipa01.angelsofclockwork.net-443-RSA -C /usr/libexec/ipa/certmonger/restart_httpd -K HTTP/ipa01.angelsofclockwork.net@ANGELSOFCLOCKWORK.NET
New tracking request "20200504003758" added.
[root@ipa01 ~]# ipa-getcert list -i "20200504003758"
Number of certificates and requests being tracked: 9.
Request ID '20200504003758':
        status: MONITORING
        stuck: no
        key pair storage: type=FILE,location='/var/lib/ipa/private/httpd.key',pinfile='/var/lib/ipa/passwds/ipa01.angelsofclockwork.net-443-RSA'
        certificate: type=FILE,location='/var/lib/ipa/certs/httpd.crt'
        CA: IPA
        issuer: CN=Certificate Authority,O=ANGELSOFCLOCKWORK.NET
        subject: CN=ipa01.angelsofclockwork.net,O=ANGELSOFCLOCKWORK.NET
        expires: 2021-11-05 19:55:48 MST
        dns: ipa01.angelsofclockwork.net
        principal name: HTTP/ipa01.angelsofclockwork.net@ANGELSOFCLOCKWORK.NET
        key usage: digitalSignature,nonRepudiation,keyEncipherment,dataEncipherment
        eku: id-kp-serverAuth,id-kp-clientAuth
        pre-save command:
        post-save command: /usr/libexec/ipa/certmonger/restart_httpd
        track: yes
        auto-renew: yes
```

### CA Related Certificates Stuck

Like with the IPA httpd certificates, I noticed at least 4 certificates
stuck because a PIN was missing. Turns out that it's actually easy to
modify the tracking request and fix the issue entirely. Below is my
example doing this on the auditSigningCert. This seems to only occur on
Enterprise Linux 8.

```
[root@ipa01 alias]# getcert list -i 20200615180351
Number of certificates and requests being tracked: 9.
Request ID '20200615180351':
        status: NEWLY_ADDED_NEED_KEYINFO_READ_PIN
        stuck: yes
        key pair storage: type=NSSDB,location='/etc/pki/pki-tomcat/alias',nickname='auditSigningCert cert-pki-ca'
        certificate: type=NSSDB,location='/etc/pki/pki-tomcat/alias',nickname='auditSigningCert cert-pki-ca'
        CA: dogtag-ipa-ca-renew-agent
        issuer:
        subject:
        expires: unknown
        pre-save command: /usr/libexec/ipa/certmonger/stop_pkicad
        post-save command: /usr/libexec/ipa/certmonger/renew_ca_cert "auditSigningCert cert-pki-ca"
        track: yes
        auto-renew: yes

[root@ipa01 alias]# getcert start-tracking -i 20200615180351 -p /etc/pki/pki-tomcat/alias/pwdfile.txt
Request "20200615180351" modified.
[root@ipa01 alias]# getcert list -i 20200615180351
Number of certificates and requests being tracked: 9.
Request ID '20200615180351':
        status: MONITORING
        stuck: no
        key pair storage: type=NSSDB,location='/etc/pki/pki-tomcat/alias',nickname='auditSigningCert cert-pki-ca',token='NSS Certificate DB',pinfile='/etc/pki/pki-tomcat/alias/pwdfile.txt'
        certificate: type=NSSDB,location='/etc/pki/pki-tomcat/alias',nickname='auditSigningCert cert-pki-ca',token='NSS Certificate DB'
        CA: dogtag-ipa-ca-renew-agent
        issuer: CN=Certificate Authority,O=ANGELSOFCLOCKWORK.NET
        subject: CN=CA Audit,O=ANGELSOFCLOCKWORK.NET
        expires: 2021-03-13 23:15:41 MST
        key usage: digitalSignature,nonRepudiation
        pre-save command: /usr/libexec/ipa/certmonger/stop_pkicad
        post-save command: /usr/libexec/ipa/certmonger/renew_ca_cert "auditSigningCert cert-pki-ca"
        track: yes
        auto-renew: yes
```

### Default Certificates with SAN

A question that arises now and again is how to setup a load balancer for
FreeIPA's LDAP servers whether it's an actual load balancer (layer 4)
or some sort of DNS record with multiple A records, or perhaps with some
sort of round robin DNS. The issue is that the certificate verification
fails, because the certificate being presented is of the IPA server
itself with no SAN. To address this, you have to create a host that has
the name of the load balancer or DNS record you plan on using and allow
the IPA servers to manage the host.

### CMS Communication Issues (403)

This isn't necessarily certificate issue, but more or less an issue as
it pertains to the certificate system itself. There may be cases where
during upgrades, a configuration in /etc/pki/pki-tomcat/server.xml is
not properly reconfigured. In that file, you'll notice Connector lines
that have a secret and a requiredSecret parameter and they both have
different values.

```
<Connector port="8009" protocol="AJP/1.3" redirectPort="8443" address="localhost4" secret="AAA" requiredSecret="BBB"/>
<Connector address="localhost6" port="8009" protocol="AJP/1.3" redirectPort="8443" secret="AAA" requiredSecret="BBB"/>
```

The issue may be that these aren't correct. This generally comes down
to IPA and pki-core conflicting on these attributes. To correct this,
you will need to find the secret in /etc/httpd/conf.d/ipa-pki-proxy.conf
(on the ProxyPass line) and ensure that's the same secret in both
fields.

```
ProxyPassMatch ajp://localhost:8009 secret=AAA
```

Make sure they're the same in server.xml

```
<Connector port="8009" protocol="AJP/1.3" redirectPort="8443" address="localhost4" secret="AAA" requiredSecret="AAA"/>
<Connector address="localhost6" port="8009" protocol="AJP/1.3" redirectPort="8443" secret="AAA" requiredSecret="AAA"/>
```

After changing, restart the service with
systemctl restart pki-tomcat@pki-tomcatd.service.

## Kerberos

This section goes over some stuff about kerberos that we've ran into
and might find useful someday.

### Accounts with OTP Enabled

When logging into a machine with a password (first factor) and an OTP
token (second factor), this generally works without a problem. You can
easily run klist and you'll see that you have a ticket and everything.
In the cases where you're calling kinit all by itself, this doesn't
work as expected at the time of this writing.

```
% kinit account@REALM
kinit: Pre-authentication failed: Invalid argument while getting initial credentials
```

A [bugzilla](https://bugzilla.redhat.com/show_bug.cgi?id=1510734) was
opened about this issue in 2017, a
[pagure](https://pagure.io/freeipa/issue/4411) issue was opened in 2014
about this exact scenario, where IPA is configured for password+OTP and
a user has an assigned token. There is currently one workaround, which
is using kinit -n to perform anonymous processing.

## Active Directory Trust

To initiate a trust with your active directory domain, ensure the
following requirements are met.

!!! note "Requirements"
    Package installed: ipa-server-trust-ad

    DNS: Properly configured that FreeIPA can resolve the AD servers A and
    SRV records

    This can either be forwarders to AD, a subdomain that IPA manages, or
    delegated subdomain from the master DNS servers in your network. This is
    completely dependent on your infrastructure.

    DNS: AD forest has sites and SRV records, including priorities, are set
    correctly

When the following requirements are met, you have two choices before
continuning. You can either use POSIX or have the id range generated
automatically.

!!! note "POSIX vs Non-POSIX"
    If you decide to use POSIX, your AD users are expected to have
    uidNumber, gidNumber, loginShell, unixHomeDirectory set. Else, you will
    need to setup ID overrides if you already have that information for
    current users (assuming this is not a new setup for the environment, ie
    you already have UID's for people). If you are not planning a migration
    from pure AD over to IPA with a trust, it is recommended to note that
    information so you can setup the ID overrides. Afterwards, any new users
    will get UID/GID's that you will not have to manage yourself.

You will need to prep your master(s) for the trust. We will be enabling
compat, adding sids, and adding agents so both masters can provide AD
information.

```
% ipa-adtrust-install --add-sids --add-agents --enable-compat
```

This will do what we need. If you do not have legacy clients (Enterprise
Linux 5, Solaris, HP-UX, AIX, SLES 11.4, FreeBSD, the list goes on), then you do
not need to enable compat mode. Though, it could be useful to have it for
certain apps or scenarios.

You will now need to open the necessary ports. Do this on all IPA servers.

!!! note "Ports"
    **TCP**: 135, 138, 139, 389, 445, 1024-1300, 3268
    
    **UDP**: 138, 139, 389, 445

```
% firewall-cmd --add-service=freeipa-trust --permanent
% firewall-cmd --complete-reload
```

Now you can initiate the trust. The admin account you use should be part
of the domain admins group or at least have permissions to initiate a
trust. The former is path of least resistance.

```
# If you are using POSIX ID, use ipa-ad-trust-posix.
% ipa trust-add --type=ad example.com --range-type=ipa-ad-trust --admin adminaccount --password 
```

Once the trust is up, verify it.

```
% ipa trust-show example.com
 Realm name: example.com
 Domain NetBIOS name: AD
 Domain Security Identifier: S-X-X-XX-XXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX
 Trust direction: Trusting forest
 Trust type: Active Directory domain
 UPN suffixes: example.com
```

You should be able to test for the users now.

```
% id aduser1@example.com
uid=XXXXX(aduser1@example.com) gid=XXXXX(aduser1@example.com) groups=XXXXX(aduser1@example.com)
```

### External Groups

!!! note "Group Types"
    Groups in Active Directory have three types. These three types can
    actually change the behavior of how SSSD on the IPA domain controllers
    resolve them or if they'll even be resolvable at all. The three types
    are 'Domain Local', 'Global', and 'Universal'. If at all possible,
    avoid groups being 'Global'. Domain Local or Universal is recommended.

In the event you are using a trust, your AD user and group of users will
need external groups to map the user or users over. This is required if
you are trying to setup some form of permissions with HBAC and SUDO.

```
# Create an external group that the AD user/group goes into
% ipa group-add --external linuxadm_external
# Add the user (or group) into the external group
% ipa group-add-member --users=aduser1@example.com linuxadm_external
% ipa group-add-member --users=adgroup1@example.com linuxadm_external
# Add the external group as a member of the IPA posix group.
# aduser1 and adgroup1 are now effectively members of the linuxadm group in IPA.
% ipa group-add-member --groups=linuxadm_external linuxadm
```

### AD Domain Options

This section goes over "situational" scenarios for AD trusts. These scenarios
are reflective of the environment in which IPA is installed and not all will
fit into your environment. These are more or less common situations that
could occur during an IPA deployment or even post-deployment.

#### Remove @realm for AD users

A common scenario is that IPA and AD will have a trust, but there will
not be any IPA users with the exception of the engineering team for
managing IPA itself. The common theme is that because of this, the
engineers and customers would rather not login with <username@realm>.

!!! note "Info"
    The following is only applicable in an IPA-AD trust. An IPA-only
    scenario would not require any of these steps and most pieces would work
    natively (no @realm, sudo, hbac).

    In the event that you are in an IPA-AD scenario, please take note that
    this can adversely affect legacy clients. This will cause ldapsearches
    that are done in the compat tree to display multiple uid attributes. In
    most cases, this is fine and the user can still login without the realm
    name. The whoami and id commands will show the domain. There's no
    workaround for this.

On the IPA servers, you will need to set the domain resolution order.
This was introduced in 4.5.0.

```
% kinit admin
% ipa config-mod --domain-resolution-order="example.com:ipa.example.com"
```

After, you will need to clear out your SSSD cache.

```
# sss_cache -E is insufficient for this.
% systemctl stop sssd
% rm -rf /var/lib/sss/db/*
% systemctl start sssd
```

The below is optional. It will remove the @realm off the usernames, like
on the prompt or id or whoami commands. Only do this if required. **Only
do this on the clients. Do not make this change on an IPA replica.**

```
# vi /etc/sssd/sssd.conf

[domain/ipa.example.com]
. . .
full_name_format = %1$s
```

This will ensure EL7, EL8, EL9 clients resolve the AD domain first when
attempting logins and optionally drop the @realm off the usernames.

#### AD and IPA group names with short names

You may notice that your clients have intermittent issues with name
resolution when the following are true:

* Groups (or users) have the same names in both IPA and AD
* You are using domain resolution order
* You are shortening names on the clients

You may want to actually search for them to identify the errant groups
and then correct them. You can correct them either on the AD or IPA
side. I would opt for the IPA side.

```
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
```

If you run into any duplicates, they should show up in a list for you
address.

!!! note "sAMAccountName vs CN"
    The "CN" and "sAMAccountName" attributes are not the same in AD,
    depending on who made the group or other factors. The sAMAccountName
    attribute is the value used to determine names from AD, whether you are
    enrolled with AD or the IPA server SSSD is pulling the information. This
    is why we are searching for that attribute, and not the CN.

#### Sites and AD DC's

By creating a subdomain section in /etc/sssd/sssd.conf on an IPA server,
it is possible to set an AD Site or AD server(s) directly in SSSD. By
default, sssd tries to do location based discovery. There may be a case
where this isn't possible (eg, only a set of AD servers may only be
contacted in certain "air gapped" networks).

```
[domain/ipa.example.com/example.com]
# If you want a site
ad_site = Site_Name
# If you want a server(s)
ad_server = dc1.example.com, dc2.example.com
# A backup?
ad_backup_server = dc3.example.com, dc4.example.com
```

If you don't have access or a way to find the sites using the Windows
tools, you can run an ldapsearch to find it (or an equivalent ldap
browsing tool).

```
% ldapsearch -x -h example.com -s one -WD 'CN=username,CN=Users,DC=example,DC=com' \
  -b 'CN=Sites,CN=Configuration,DC=example,DC=com' cn
```

This should report back your sites. If you want to know the servers for
those sites (in case you don't want to deal with the sites, but just
the DC's themselves), you use ldapsearch but use the base DN of the
site name.

```
% ldapsearch -x -h example.com -WD 'CN=username,CN=Users,DC=example,DC=com' \
  -b 'CN=Servers,CN=Site_Name,CN=Sites,CN=Configuration,DC=example,DC=com' dnsHostName
```

!!! note "Hardcoded DC's"
    If the DC's change at any time and they are harded in your sssd.conf,
    it is up to you to know when new controllers are being added or removed
    as to not disrupt the connectivity from IPA to AD when performing user
    or group lookups.

### Set Default Shell for AD Users

By default, after a trust has been established, the shell all AD users
get is /bin/sh. To change this, you must change the sssd.conf on the IPA
masters.

```
% vi /etc/sssd/sssd.conf
[domain/ipa.example.com]
. . .
default_shell = /bin/bash

% systemctl restart sssd
```

## Footnotes

[^1]: For more information on DNS for FreeIPA, please read [this page](https://www.freeipa.org/page/DNS) and [this page](https://www.freeipa.org/page/Deployment_Recommendations#DNS)

[^2]: The -P asks for the password of the username in question, that way it is cached right away. The directory service on the system then has credentials to compare to. I have found that sometimes if you don't use -P, even if you're logged in as the account, the password does not get cached and you'll get stuck at a background image the next time you login. Again, this is only sometimes. Your mileage may vary here.  

[^3]: The -P asks for the password of the username in question, that way it is cached right away. The directory service on the system then has credentials to compare to. I have found that sometimes if you don't use -P, even if you're logged in as the account, the password does not get cached and you'll get stuck at a background image the next time you login. Again, this is only sometimes. Your mileage may vary here.

[^4]: Please read [this page](https://www.cloudera.com/documentation/enterprise/latest/topics/sg_keytab_retrieval_script.html) for more information.

[^5]: This may have changed. However it is up to you to test if this is the case.
