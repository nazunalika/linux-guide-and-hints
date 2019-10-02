OpenLDAP
^^^^^^^^

.. note:: Deprecation

   Please note that the OpenLDAP server is considered deprecated in RHEL (and thusly CentOS). This document will stay here as a reference for those who are still using the server software on RHEL 7 and/or potentially using the OpenLDAP LTB version of the software. It may apply to Fedora users in some contexts, but there are some differences they may never be documented here. If you see a need for corrections, please open up an issue on our github.

.. meta::
    :description: How to install OpenLDAP on RHEL 7, configure and set up accounts for host access, etc. RHEL 7 and Fedora users will have the ability to use SSSD for SUDO.

This tutorial goes over how to install OpenLDAP to a RHEL 7 Server and options on configuring and setting up accounts for host access, etc. This how-to is the method of implementation that I used, and can be modified/changed to any users preferences if preferred. RHEL 7 and Fedora users will have the ability to use SSSD for SUDO (and it's relatively easy to set it up).

Overview
--------

Simply put, LDAP is a directory service for authentication across a network. Rather than have local accounts on a bunch of machines, LDAP can be used to have one account across a bunch of machines. LDAP was once an easy setup in RHEL 5 but has changed in RHEL 6/7, and here provides the necessary information needed to get a simple LDAP system running with possible SUDO support and various options of how to support your LDAP system.

Requirements
------------

First and foremost, we have a list of requirements. Keep in mind, if you do not fulfill these requirements, you may run into some issues down the road.

* RHEL 7 or Derivative like CentOS
* DNS Server (LDAP does NOT appreciate IP addresses for the URI)
* An active internet connection to install the packages required

Tutorial Preface, Notes, and Recommendations
--------------------------------------------

.. warning:: Potential Pitfalls!

   * The incorrect -The incorrect configuration in your firewall or other settings can cause login failures 
   * Not using certificates (TLS/SSL) will cause you not to be able to login (This is a RHEL 6/7 LDAP Client Requirement) 
   * SELinux is a pain when using mounted home directories or certificates (primarily in RHEL 7, will you have problems with certificates/home directories) 
   * If you use /home as an NFS mount, you'll see some nasty side effects if you have local users.

.. note:: Recommended Information

   * It's recommended to use colored vim syntax. Root doesn't use vim when vim-enhanced is installed. You can make an alias for vi to run vim.
   * Turn on syntaxing in ~/.vimrc -- syntax on
   * Make the vim colors brighter in ~/.vimrc -- set background=dark
   * Export your EDITOR variable in ~/.bash_profile -- export EDITOR=vim
   * Keep selinux set to **enforcing**

.. note:: Database Information

   We will be using lmdb, which is recommended over using hdb or bdb. 

.. note:: RHEL 8 OpenLDAP

   RHEL 8 will be dropping OpenLDAP. You will need to use the RPM's from LTB in that case. Please see the deprecation notice at the top of the page.


Installation
------------

Below details the process for installing OpenLDAP to our system(s). This includes installing the packages, setting up certificates, and configuring the LDAP server via LDIF files.

Packages
++++++++
You will need the following packages. A couple of them may already be installed. If you don't plan on migrating local accounts to LDAP, you can leave out migrationtools. 

.. code-block:: bash

   yum install openldap openldap-servers migrationtools nss-tools -y


Certificates
++++++++++++
RHEL 7 clients and other newer distributions that are non-el require TLS/SSL for authentication when going toward LDAP. because of this, we will need to create certificates, regardless if you are in a lab or not. 

.. note:: Certificate Information

   Because of the way Red Hat compiled OpenLDAP, it relies on NSS. Do not attempt to use regular base64 certificates. When 7.5 is released and you ahve followed this guide, the RPM will automatically perform an LDIF modification and pull all the NSS pieces apart. When this happens, the guide will be partially changed to deal with this.

I have two ways of doing it, we can do it manually or through a script. I prefer using my script to take care of it. First the manual way.

.. code-block:: bash 
   
   mkdir /etc/pki/ldap 
   cd /etc/pki/ldap
   openssl genrsa -des3 -out ca.key 4096  # Remember the password you put here

   openssl genrsa -out ldapserver.key 4096

   openssl req -new -x509 -key ca.key -out ca.pem -days 3650
   Country Name (2 letter code) [XX]:US
   State or Province Name (full name) []:Arizona
   Locality Name (eg, city) [Default City]:Phoenix
   Organization Name (eg, company) [Default Company Ltd]:SSN Studio
   Organizational Unit Name (eg, section) []:Channel Maintainers
   Common Name (eg, your name or your server's hostname) []:SSN     # If you want to use a server name here, perform this step on another server first
   Email Address []:youremail@mail.com
   
   openssl req -new -key ldapserver.key -out ldapserver.csr
   Country Name (2 letter code) [XX]:US
   State or Province Name (full name) []:Arizona
   Locality Name (eg, city) [Default City]:Phoenix
   Organization Name (eg, company) [Default Company Ltd]:SSN Studio
   Organizational Unit Name (eg, section) []:LDAP Server Maintainer
   Common Name (eg, your name or your server's hostname) []:zera1.angelsofclockwork.net    # Set your common name to your server name for this certificate 
   Email Address []:youremail@mail.com
   
   openssl x509 -req -in ldapserver.csr -out ldapserver.pem -CA ca.pem -CAkey ca.key -days 3650 -set_serial 01
   
   ln -s ca.pem `openssl x509 -hash -in ca.pem -noout`.0
   # Do an ls on the directory and save the hashed name including the .0 somewhere
   
   certutil -N -d /etc/pki/ldap
   # Do not enter any passwords. When asked, just hit enter beyond this point.
   
   openssl pkcs12 -export -inkey ldapserver.key -in ldapserver.pem -out ldapserver_crt-key.p12 -nodes -name "zera1.angelsofclockwork.net" 
   
   certutil -A -d /etc/pki/ldap -n "SSN" -t CT,, -ai ca.pem            # Here, if you used a hostname in your CA cert, make sure you put it in place of "SSN" here.
   pk12util -i ldapserver_crt-key.p12 -d /etc/pki/ldap
   chown root:ldap *
   chmod 640 *

The scripted way.

.. code-block:: bash
   
   #!/bin/bash
   # CA Information
   CAcountry="US"
   CAstate="Arizona"
   CAlocale="Phoenix"
   CAorganization="SSN Studio"
   CAorganizationalunit="Channel Maintainers"
   # If you set the below to a hostname, you’re screwed. Don’t do it!
   # Only do it if you have an actual hostname you will do CA signing on!
   CAconicalname="SSN"
   CAemail="tucklesepk@gmail.com"
   # LDAP Server information
   country="US"
   state="Arizona"
   locale="Phoenix"
   organization="SSN Studio"
   organizationalunit="LDAP Server Maintainer"
   conicalname="zera1.angelsofclockwork.net"
   email="pc68xl@gmail.com"

   certdir="/etc/pki/ldap"

   mkdir $certdir ; cd $certdir
   echo "Enter a password when asked."
   openssl genrsa -des3 -out ca.key 4096
   openssl genrsa -out ldapserver.key 4096
   # Create the self-signed CA cert
   openssl req -new -x509 -key ca.key -out ca.pem -days 3650 -subj /C="$CAcountry"/ST="$CAstate"/L="$CAlocale"/O="$CAorganization"/OU="$CAorganizationalunit"/CN="$CAconicalname"/emailAddress="$CAemail"/
   # Create the LDAP server cert
   openssl req -new -key ldapserver.key -out ldapserver.csr -subj /C="$country"/ST="$state"/L="$locale"/O="$organization"/OU="$organizationalunit"/CN="$conicalname"/emailAddress="$email"/
   # Sign it
   openssl x509 -req -in ldapserver.csr -out ldapserver.pem -CA ca.pem -CAkey ca.key -days 3650 -set_serial 01
   ln -s ca.pem `openssl x509 -hash -in ca.pem -noout`.0
   echo "DO NOT ENTER A PASSWORD! JUST PRESS ENTER!"
   certutil -N -d $certdir
   openssl pkcs12 -export -inkey ldapserver.key -in ldapserver.pem -out ldapserver_crt-key.p12 -nodes -name "$conicalname"
   certutil -A -d $certdir -n "$CAconicalname" -t CT,, -ai ca.pem
   pk12util -i ldapserver_crt-key.p12 -d $certdir
   chown root:ldap *
   chmod 640 *

Make sure to obtain your hash. Your hash will be different from mine.

.. code-block:: bash

   ls -l /etc/pki/ldap | grep '0'
   39642ab3.0

LDAP Server Configuration
+++++++++++++++++++++++++

.. attention:: Current Show-stopping Bug
   In releases older than openldap-servers-2.4.39-6, there were two problems: A missing object class and an invalid olcDatabase value. In release -6, the objectClass sets should be fixed. But, the olcDatabase attribute is not.

   .. code-block:: bash 
      
      egrep 'objectClass|olcDatabase' /etc/openldap/slapd.d/cn\=config/olcDatabase\=\{-1\}frontend.ldif
      dn: olcDatabase={-1}frontend
      objectClass: olcDatabaseConfig
      objectClass: olcFrontendConfig
      olcDatabase: frontend
      sed -i 's/olcDatabase: frontend/olcDatabase: {-1}frontend/g' /etc/openldap/slapd.d/cn\=config/olcDatabase\=\{-1\}frontend.ldif

   For more information, you can check this `bugzilla report <https://bugzilla.redhat.com/show_bug.cgi?id=1132094>`_.

Configurations done in OpenLDAP are done via LDIF. Your passwords should be hashed as well. Before we begin, let's start by generating a password for our root DN. **This is required.**

.. code-block:: bash

   slappasswd 
   New password:
   Re-enter new password: 
   {SSHA}CuaKctEx7rl/+ldG0EjktMzJdrxNc46+

Keep this SSHA output for our configuration files. Next, we'll need to make a couple LDIFs.

This is our suffix.ldif file. This file helps to create the mdb database for our LDAP structure. It also sets our DIT suffix, root password, etc. You should change the olcSuffix, olcRootDN, and olcRootPW to whatever you plan on using. The olcDbMaxSize is set to 20GB. This is normally sufficient and can be changed. The olcDbEnvFlags can be changed as well. 

.. code-block:: none

   dn: olcDatabase=mdb,cn=config
   objectClass: olcDatabaseConfig
   objectClass: olcMdbConfig
   olcDatabase: mdb
   olcDbDirectory: /var/lib/ldap
   olcSuffix: dc=angelsofclockwork,dc=net
   olcRootDN: cn=manager,dc=angelsofclockwork,dc=net
   olcRootPW: {SSHA}CuaKctEx7rl/+ldG0EjktMzJdrxNc46+   
   olcDbIndex: objectClass eq,pres
   olcDbIndex: ou,cn,mail,surname,givenname eq,pres,sub
   olcLastMod: TRUE
   olcDbEnvFlags: nometasync
   olcDbEnvFlags: writemap
   olcDbMaxSize: 21474836480

Now, below we have our primary modification ldif. Comments describe what each one does.

.. code-block:: none

   # Sets our cert path and information
   # The "CertificateFile" has to be set to the hostname of the LDAP server
   dn: cn=config
   changetype: modify
   replace: olcTLSCACertificatePath
   olcTLSCACertificatePath: /etc/pki/ldap
   -
   replace: olcTLSCertificateFile
   olcTLSCertificateFile: zera1.angelsofclockwork.net
   -
   replace: olcTLSCertificateKeyFile
   olcTLSCertificateKeyFile: /etc/pki/ldap/ldapserver.key
   
   # Adding a rootDN for the config.
   # Note that this isn't fully necessary as you can use -Y EXTERNAL -H ldapi:/// instead
   # So, treat this as an optional thing. If you do want it, consider a different password.
   dn: olcDatabase={0}config,cn=config
   changetype: modify
   replace: olcRootDN
   olcRootDN: cn=config
   -
   replace: olcRootPW
   olcRootPW: {SSHA}CuaKctEx7rl/+ldG0EjktMzJdrxNc46+
    
   # Set the password again in the mdb database
   # This is because sometimes the password set when making the database doesn't 'work' sometimes
   dn: olcDatabase={2}mdb,cn=config
   changetype: modify
   replace: olcRootPW
   olcRootPW: {SSHA}CuaKctEx7rl/+ldG0EjktMzJdrxNc46+ 
   
   # Sets the default password hash to SSHA -- Refer to the 'bug' information if this does not work
   dn: olcDatabase={-1}frontend,cn=config
   changetype: modify
   replace: olcPasswordHash
   olcPasswordHash: {SSHA}
   
   # Changes the rootdn information in the monitor database
   dn: olcDatabase={1}monitor,cn=config
   changetype: modify
   replace: olcAccess
   olcAccess: {0}to * by dn.base="gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth" read by dn.base="cn=manager,dc=angelsofclockwork,dc=net" read by * none 

Let's make sure we turn on ldaps. It's recommended to use TLS, but some applications insist on SSL. (Very few, but they are out there.)

.. code-block:: none
   
   # vi /etc/sysconfig/slapd

   . . .
   SLAPD_URLS="ldapi:/// ldap:/// ldaps:///"

   # slaptest -u
   Config file testing succeeded

   # /etc/openldap/ldap.conf
   . . .
   TLS_CACERTDIR /etc/pki/ldap

Now, we need to add our LDIFs into LDAP.

.. code-block:: bash

   rm -f /etc/openldap/slapd.d/cn\=config/olcDatabase\=\{2\}hdb.ldif
   chown -R ldap:ldap /var/lib/ldap
   systemctl enable slapd
   systemctl start slapd
   ldapadd -Y EXTERNAL -H ldapi:/// -f suffix.ldif
   ldapmodify -Y EXTERNAL -H ldapi:/// -f info.ldif

You may end up getting a checksum error in your logs. To solve this, you need to do a simple operation against the configuration.

.. code-block:: bash

   ldapmodify -h localhost -xWD "cn=config"
   Enter LDAP Password:
   dn: olcDatabase={0}config,cn=config
   changetype: modify
   replace: olcRootDN
   olcRootDN: cn=config
   modifying entry "olcDatabase={0}config,cn=config"
   slaptest -u
   config file testing succeeded

That should do it. You can do a -Y EXTERNAL -H ldapi:/// instead if you wanted to. I did the above to show passwords will work for config.

LDAP Structure
++++++++++++++

The next piece is to get our backend structure built. In EL7, core is the only schema that is there. In EL6, it's a good chunk of these. I like to put them in a file so I can loop through them.

.. code-block:: none

   /etc/openldap/schema/corba.ldif
   /etc/openldap/schema/cosine.ldif
   /etc/openldap/schema/duaconf.ldif
   /etc/openldap/schema/dyngroup.ldif
   /etc/openldap/schema/inetorgperson.ldif
   /etc/openldap/schema/java.ldif
   /etc/openldap/schema/misc.ldif
   /etc/openldap/schema/nis.ldif
   /etc/openldap/schema/openldap.ldif
   /etc/openldap/schema/ppolicy.ldif
   /etc/openldap/schema/collective.ldif 

.. note:: rfc2307

   If you want to be able to combine groupOfNames and posixGroup together (similar to Active Directory, other open source, and commercial offerings), don't use nis. Use the `rfc2307bis <https://raw.githubusercontent.com/ptman/ldap-tools/master/rfc2307bis.ldif>`_ schema instead. 

Once you have your list of schema to put in, we can loop through them. 

.. code-block:: bash

   for x in $(cat schemaorder) ; do ldapadd -Y EXTERNAL -H ldapi:/// -f $x ; done
   adding new entry "cn=corba,cn=schema,cn=config"
   adding new entry "cn=cosine,cn=schema,cn=config"
   adding new entry "cn=duaconf,cn=schema,cn=config"
   adding new entry "cn=dyngroup,cn=schema,cn=config"
   adding new entry "cn=inetorgperson,cn=schema,cn=config"
   adding new entry "cn=java,cn=schema,cn=config"
   adding new entry "cn=misc,cn=schema,cn=config"
   adding new entry "cn=nis,cn=schema,cn=config"
   adding new entry "cn=openldap,cn=schema,cn=config"
   adding new entry "cn=ppolicy,cn=schema,cn=config"
   adding new entry "cn=collective,cn=schema,cn=config"
   
I normally like to keep all LDIFs in a folder by themselves to avoid clutter (non-configuration LDIF).

.. code-block:: bash 

   mkdir ldif ; cd ldif

Let's get our base created. Make sure to replace my DN with your DN that you chose earlier. Call this base.ldif.

.. code-block:: none

   dn: dc=angelsofclockwork,dc=net
   dc: angelsofclockwork
   objectClass: top
   objectClass: domain
   
   dn: ou=People,dc=angelsofclockwork,dc=net
   ou: People
   objectClass: top
   objectClass: organizationalUnit
   
   dn: ou=Group,dc=angelsofclockwork,dc=net
   ou: Group
   objectClass: top
   objectClass: organizationalUnit

.. code-block:: bash

   ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f base.ldif
   Enter LDAP Password:
   adding new entry "dc=angelsofclockwork,dc=net"
   adding new entry "ou=People,dc=angelsofclockwork,dc=net"
   adding new entry "ou=Group,dc=angelsofclockwork,dc=net"

**If this doesn't add, make sure your LDAP server is running, check /var/log/messages, and ensure you've completed all steps before this.**

.. code-block:: bash 

   ldapsearch -x -LLL -b 'dc=angelsofclockwork,dc=net'
   dn: dc=angelsofclockwork,dc=net
   dc: angelsofclockwork
   objectClass: top
   objectClass: domain

   dn: ou=People,dc=angelsofclockwork,dc=net
   ou: People
   objectClass: top
   objectClass: organizationalUnit
   
   dn: ou=Group,dc=angelsofclockwork,dc=net
   ou: Group
   objectClass: top
   objectClass: organizationalUnit

Add Users via Migration
+++++++++++++++++++++++

.. note:: But... I don't want to add my users locally

   You don't have to add your users locally to the system. This just aids in the creation of users. Go to the next section if you want to add users and do permissions by hand. 

This is the fun part. We'll need to add some users, set some passwords and migrate them into the LDAP system. I'll make three users as an example, give them an ID starting at 10000, home directories in /lhome, set a password, and proceed to migrate them. **If you don't want to use /lhome, keep them set to /home and their home directories should get created automatically when logging into another machine.**

.. code-block:: none
   
   # mkdir /lhome
   # mkdir ldif/user
   # semanage fcontext -a -t home_root_t "/lhome(/.*)?"
   # restorecon -v /lhome
   restorecon reset /lhome context unconfined_u:object_r:default_t:s0->unconfined_u:object_r:home_root_t:s0
   # groupadd -g 10000 sokel
   # groupadd -g 10001 suree
   # groupadd -g 10002 ranos
   # useradd -u 10000 -g 10000 -d /lhome/sokel sokel
   # useradd -u 10001 -g 10001 -d /lhome/suree suree
   # useradd -u 10002 -g 10002 -d /lhome/ranos ranos
   # passwd sokel ; passwd suree ; passwd ranos
   # cat /etc/passwd | grep sokel > ldif/user/passwd.sokel
   # cat /etc/passwd | grep suree > ldif/user/passwd.suree
   # cat /etc/passwd | grep ranos > ldif/user/passwd.ranos
   # cat /etc/group | grep sokel > ldif/user/group.sokel
   # cat /etc/group | grep suree > ldif/user/group.suree
   # cat /etc/group | grep ranos > ldif/user/group.ranos

We'll set some aliases for our migration scripts too

.. code-block:: none

   # alias miguser='/usr/share/migrationtools/migrate_passwd.pl'
   # alias miggroup='/usr/share/migrationtools/migrate_group.pl'

Before we continue, we need to modify our migration scripts. This is extremely important, otherwise our LDIFs will come out incorrect. Change them to your DN.

.. code-block:: none

   # sed -i.bak "s/padl.com/angelsofclockwork.net/g" /usr/share/migrationtools/migrate_common.ph
   # sed -i.bak "s/padl,dc=com/angelsofclockwork,dc=net/g" /usr/share/migrationtools/migrate_common.ph

Now we can use a loop to convert them. You can do it by hand also, but that's up to you.

.. code-block:: none

   # for x in sokel suree ranos ; do miguser ldif/user/passwd.$x > ldif/user/$x.ldif ; done
   # for x in sokel suree ranos ; do miggroup ldif/user/group.$x >> ldif/user/$x.ldif ; done
   # cd ldif/user/
   # cat *.ldif >> /tmp/ourusers.ldif
   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f /tmp/ourusers.ldif
   Enter LDAP Password:
   adding new entry "uid=ranos,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=ranos,ou=Group,dc=angelsofclockwork,dc=net"
   
   adding new entry "uid=sokel,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=sokel,ou=Group,dc=angelsofclockwork,dc=net"
   
   adding new entry "uid=suree,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=suree,ou=Group,dc=angelsofclockwork,dc=net"

The manual way. 

.. code-block:: none

   # /usr/share/migrationtools/migrate_passwd.pl ldif/user/passwd.sokel > ldif/user/sokel.ldif 
   # /usr/share/migrationtools/migrate_group.pl ldif/user/group.sokel >> ldif/user/sokel.ldif
   # /usr/share/migrationtools/migrate_passwd.pl ldif/user/passwd.suree > ldif/user/suree.ldif 
   # /usr/share/migrationtools/migrate_group.pl ldif/user/group.suree >> ldif/user/suree.ldif
   # /usr/share/migrationtools/migrate_passwd.pl ldif/user/passwd.ranos > ldif/user/ranos.ldif 
   # /usr/share/migrationtools/migrate_group.pl ldif/user/group.ranos >> ldif/user/ranos.ldif
   
   # cd ldif/user/
   # ls
   group.ranos  group.suree   passwd.sokel  ranos.ldif  suree.ldif
   group.sokel  passwd.ranos  passwd.suree  sokel.ldif
   
   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f sokel.ldif
   Enter LDAP Password:
   adding new entry "uid=sokel,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=sokel,ou=Group,dc=angelsofclockwork,dc=net"
   
   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f suree.ldif
   Enter LDAP Password:
   adding new entry "uid=suree,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=suree,ou=Group,dc=angelsofclockwork,dc=net"
   
   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f ranos.ldif
   Enter LDAP Password:
   adding new entry "uid=ranos,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=ranos,ou=Group,dc=angelsofclockwork,dc=net"

Add Users via LDIF
++++++++++++++++++

This is for those who don't want to create the account locally. For each user, you need to create an LDIF that satisfies their account information such as UID, GID and their group information. If you plan on having NFS exports to /lhome, make sure homeDirectory is correctly pointing as such. Otherwise, keep it as /home/username.

.. code-block:: none

   dn: uid=zera,ou=People,dc=angelsofclockwork,dc=net
   objectClass: posixAccount
   objectClass: top
   objectClass: shadowAccount
   objectClass: inetOrgPerson
   cn: Zera Nalika
   gidNumber: 11000
   sn: Nalika
   uidNumber: 11000
   givenName: Zera
   uid: zera
   loginShell: /bin/bash
   homeDirectory: /home/zera
   displayName: Zera Nalika
   userPassword: changeme2

   dn: cn=zera,ou=Group,dc=angelsofclockwork,dc=net
   objectClass: posixGroup
   objectClass: top
   cn: zera
   gidNumber: 11000

That's about it for that. You create these for each user as needed and then add them into ldap. 

.. code-block:: none

   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f zera.ldif
   adding new entry "uid=zera,ou=People,dc=angelsofclockwork,dc=net"
   
   adding new entry "cn=zera,ou=Group,dc=angelsofclockwork,dc=net"

For users who are doing the /lhome thing, make their directories. When you are changing ownership, do it by UID and GID number. 

.. code-block:: none

   # mkdir /lhome
   # semanage fcontext -a -t home_root_t "/lhome(/.*)?"
   # mkdir /lhome/zera
   # cp /etc/skel/.* /lhome/zera
   # chown -R 11000:11000 /lhome/zera
   # restorecon -Rv /lhome

NFS Export Home Directories
+++++++++++++++++++++++++++

.. caution:: /home vs /lhome

   If you used /lhome and you want to use NFS mounts, you may continue here. Otherwise, skip this section entirely. If you use /home and still want to do NFS, you will need to do persistent NFS to say /export/home, and then setup AutoFS to use /export/home as a way to automount into /home.

.. warning:: Potential Pitfall

   Do NOT use NFSv3. The steps below show how to prevent user squashing to allow the user to have access to their home directories. Typically, in an NFSv4 fashion, it tends to mount it with permissions set to nobody. Other solutions have been to force NFSv3. This is **NOT** recommended. **YOU HAVE BEEN WARNED.**

First, we'll need to install nfs-utils, set up our exports, and modify our id map file.

.. code-block:: none

   # yum install nfs-utils libnfsidmap -y

   # vi /etc/exports
   /lhome *(rw,sync,root_squash,no_all_squash)

   # vi /etc/idmapd.conf

   # Comment out the first Domain line and make your own
   Domain = zera1.angelsofclockwork.net

   # systemctl start nfs-server
   # systemctl enable nfs-server

Sometimes you'll still run into the nobody problem. Sometimes this helps.

.. code-block:: none

   # vi /etc/sysconfig/nfs
   NEED_IDMAPD=yes
   NFSMAPID_DOMAIN=library.angelsofclockwork.net

Firewall
++++++++

.. warning:: Keep your firewall on

   It is bad practice to turn your firewall off. Don't do it. 

We need to open up our firewall.

.. note:: Port Reference

   * LDAP Ports: 389/tcp 636/tcp
   * NFS Ports: 111/tcp 111/udp 2049/tcp

If using firewalld, you can add these ports by service. 

.. code-block:: none

   # firewall-cmd --add-service=ldap --zone=public --permanent
   # firewall-cmd --add-service=ldaps --zone=public --permanent
   # firewall-cmd --add-service=nfs --zone=public --permanent
   # firewall-cmd --reload

Client
------

Setting up the client can be straight-forward or troubling, depending on the distribution you're using. We'll be going over RHEL 6 and 7. Fedora also works here as well. 

.. warning:: Third-party Repositories

   If you use third-party repositories, you may want to disable them, at least temporarily. Depending on the repository, there may be conflicts when installing the appropriate packages. You may want to consider on setting up priorities, and ensure your base and updates are higher than the rest.

.. note:: Slight Command Difference

   On RHEL 7, service has been superceded by systemctl. If you are used to the service command, you should be fine. It will automatically redirect to systemctl appropriately. 

RHEL 6/RHEL 7/Fedora 20+
++++++++++++++++++++++++

We'll be using SSSD for this. We need to install some key packages first. Some of these packages may not install because they were either superceded or obsoleted.

.. code-block:: none

   # yum install pki-{ca,common,silent} openldap-clients nss-pam-ldapd policycoreutils-python sssd sssd-common sssd-client sssd-ldap

Make sure to use authconfig to setup your LDAP information. I like to do an authconfig command (rather than authconfig-tui) to get me started.

.. code-block:: none

   # authconfig --enableldap --enableshadow --enableldapauth --enablesssd --enablesssdauth --enablelocauthorize --enablemkhomedir --ldapserver='ldaps://zera1.angelsofclockwork.net' --ldapbasedn="dc=angelsofclockwork,dc=net" --updateall

Now, let's get our CA cert that we made way long ago and download it. If you used a real CA to sign your certificate, obtain their certificate.

.. note:: Hash

   Remember your hash from when you were making your certificates? You need to obtain it. In both examples, we created it while using a symbolic link. 

.. code-block:: none

   # scp zera1.angelsofclockwork.net:/etc/pki/ldap/ca.pem /etc/openldap/certs/ca.pem
   # cd /etc/openldap/certs
   # ln -s ca.pem 39642ab3.0

Now, modify /etc/openldap/ldap.conf and add the following to the bottom, ensuring your BASE is set correctly.

.. code-block:: none

   URI ldap://library.angelsofclockwork.net
   BASE dc=angelsofclockwork,dc=net
   ssl start_tls

You can attempt an ldapsearch and it should work. Search for one of your users.

.. code-block:: none

   # ldapsearch -x -LLL uid=zera

   dn: uid=zera,ou=People,dc=angelsofclockwork,dc=net
   cn: Zera Nalika
   gidNumber: 11000
   uidNumber: 11000
   givenName: Zera
   objectClass: posixAccount
   objectClass: top
   objectClass: shadowAccount
   objectClass: hostObject
   objectClass: radiusprofile
   objectClass: inetOrgPerson
   objectClass: ldapPublicKey
   uid: zera
   loginShell: /bin/bash
   homeDirectory: /lhome/zera
   displayName: Zera Nalika

Automounting Home Directories
+++++++++++++++++++++++++++++

If you chose to do /lhome NFS mounting, proceed here.

.. code-block:: none

   # mkdir /lhome
   # semanage fcontext -a -t autofs_t "/lhome(/.*)?"
   # restorecon -v /lhome
   # setsebool use_nfs_home_dirs 1

Now, let's get our automounting setup. 

.. code-block:: none

   # vi /etc/auto.master
   . . .
   /lhome /etc/auto.lhome # Add this under the /misc line

Let's copy the misc template and make a change to it. 

.. code-block:: none

   # cp /etc/auto.misc /etc/auto.lhome
   # vi /etc/auto.lhome
   
   # Comment the cd line, and add our mount under it.
   #cd             -fstype=iso9660,ro,nosuid,nodev :/dev/cdrom
   *               -rw,soft,intr       zera1.angelsofclockwork.net:/lhome/&

   # restorecon -v /etc/auto.lhome
   # systemctl enable autofs
   # systemctl start autofs
   
Let's make our change to the idmapd configuration.
   
.. code-block:: none

   # vi /etc/idmapd.conf
   
   #Domain = local.domain.edu
   Domain = zera1.angelsofclockwork.net

   # systemctl restart sssd autofs

LDAP Structure Add-ons
----------------------

Here you'll find my value-added portions of getting LDAP going further than what the above presented.

SUDO
++++

Getting SUDO to work in LDAP can be a real pain. It doesn't have to be. 

The default sudo schema provided by the LDAP packages, which I have taken and converted into the proper olc format.

.. code-block:: none

   dn: cn=sudo,cn=schema,cn=config
   objectClass: olcSchemaConfig
   cn: sudo
   olcAttributeTypes: {0}( 1.3.6.1.4.1.15953.9.1.1 NAME 'sudoUser' DESC 'User(s)
    who may  run sudo' EQUALITY caseExactIA5Match SUBSTR caseExactIA5SubstringsMa
    tch SYNTAX 1.3.6.1.4.1.1466.115.121.1.26 )
   olcAttributeTypes: {1}( 1.3.6.1.4.1.15953.9.1.2 NAME 'sudoHost' DESC 'Host(s)
    who may run sudo' EQUALITY caseExactIA5Match SUBSTR caseExactIA5SubstringsMat
    ch SYNTAX 1.3.6.1.4.1.1466.115.121.1.26 )
   olcAttributeTypes: {2}( 1.3.6.1.4.1.15953.9.1.3 NAME 'sudoCommand' DESC 'Comma
    nd(s) to be executed by sudo' EQUALITY caseExactIA5Match SYNTAX 1.3.6.1.4.1.1
    466.115.121.1.26 )
   olcAttributeTypes: {3}( 1.3.6.1.4.1.15953.9.1.4 NAME 'sudoRunAs' DESC 'User(s)
     impersonated by sudo (deprecated)' EQUALITY caseExactIA5Match SYNTAX 1.3.6.1
    .4.1.1466.115.121.1.26 )
   olcAttributeTypes: {4}( 1.3.6.1.4.1.15953.9.1.5 NAME 'sudoOption' DESC 'Option
    s(s) followed by sudo' EQUALITY caseExactIA5Match SYNTAX 1.3.6.1.4.1.1466.115
    .121.1.26 )
   olcAttributeTypes: {5}( 1.3.6.1.4.1.15953.9.1.6 NAME 'sudoRunAsUser' DESC 'Use
    r(s) impersonated by sudo' EQUALITY caseExactIA5Match SYNTAX 1.3.6.1.4.1.1466
    .115.121.1.26 )
   olcAttributeTypes: {6}( 1.3.6.1.4.1.15953.9.1.7 NAME 'sudoRunAsGroup' DESC 'Gr
    oup(s) impersonated by sudo' EQUALITY caseExactIA5Match SYNTAX 1.3.6.1.4.1.14
    66.115.121.1.26 )
   olcAttributeTypes: {7}( 1.3.6.1.4.1.15953.9.1.8 NAME 'sudoNotBefore' DESC 'Sta
    rt of time interval for which the entry is valid' EQUALITY generalizedTimeMat
    ch ORDERING generalizedTimeOrderingMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.24
     )
   olcAttributeTypes: {8}( 1.3.6.1.4.1.15953.9.1.9 NAME 'sudoNotAfter' DESC 'End
    of time interval for which the entry is valid' EQUALITY generalizedTimeMatch
    ORDERING generalizedTimeOrderingMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.24 )
   olcAttributeTypes: {9}( 1.3.6.1.4.1.15953.9.1.10 NAME 'sudoOrder' DESC 'an int
    eger to order the sudoRole entries' EQUALITY integerMatch ORDERING integerOrd
    eringMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 )
   olcObjectClasses: {0}( 1.3.6.1.4.1.15953.9.2.1 NAME 'sudoRole' DESC 'Sudoer En
    tries' SUP top STRUCTURAL MUST cn MAY ( sudoUser $ sudoHost $ sudoCommand $ s
    udoRunAs $ sudoRunAsUser $ sudoRunAsGroup $ sudoOption $ sudoOrder $ sudoNotB
    efore $ sudoNotAfter $ description ) )

Save this as sudoschema.ldif and add it in.

.. code-block:: none

   # ldapadd -Y EXTERNAL -H ldapi:/// -f sudoschema.ldif

Let's create our defaults. This will start our sudo OU and give it some defaults. You may change these if you so desire.

.. code-block:: none
   
   # vi sudo.ldif

   dn: ou=SUDOers,dc=angelsofclockwork,dc=net
   objectClass: top
   objectClass: organizationalUnit
   ou: SUDOers
   
   dn: cn=defaults,ou=SUDOers,dc=angelsofclockwork,dc=net
   objectClass: top
   objectClass: sudoRole
   cn: defaults
   description: SUDOers Default values
   sudoOption: requiretty
   sudoOption: env_reset
   sudoOption: env_keep =  "COLORS DISPLAY HOSTNAME HISTSIZE INPUTRC KDEDIR LS_COLORS"
   sudoOption: env_keep += "MAIL PS1 PS2 QTDIR USERNAME LANG LC_ADDRESS LC_CTYPE"
   sudoOption: env_keep += "LC_COLLATE LC_IDENTIFICATION LC_MEASUREMENT LC_MESSAGES"
   sudoOption: env_keep += "LC_MONETARY LC_NAME LC_NUMERIC LC_PAPER LC_TELEPHONE"
   sudoOption: env_keep += "LC_TIME LC_ALL LANGUAGE LINGUAS _XKB_CHARSET XAUTHORITY"

   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f sudo.ldif

Now, let's create our first SUDO container. It will be for our "admins". We could specify "sudoHost: ALL" if we wanted. But for the example, I chose a couple of hosts.

.. code-block:: none

   # vi admins.ldif

   dn: cn=ADMINS,ou=SUDOers,dc=angelsofclockwork,dc=net
   objectClass: sudoRole
   cn: ADMINS
   description: Administration Role
   sudoCommand: ALL
   sudoHost: zera2.angelsofclockwork.net
   sudoHost: zera3.angelsofclockwork.net
   sudoRunAs: ALL
   sudoRunAsGroup: ALL
   sudoRunAsUser: ALL
   sudoUser: zera
   
   # ldapadd -xWD "cn=manager,dc=angelsofclockwork,dc=net" -f admins.ldif

We need to make a couple of config changes on our clients. You're configurations may be slightly different than mine. 

.. code-block:: none

   # vi /etc/nsswitch.conf
   . . .
   passwd:     files sss
   shadow:     files sss
   group:      files sss
   sudoers:    files sss  # Add this

   # vi /etc/sssd/sssd.conf

   [domain/default]

   cache_credentials = True
   krb5_realm = #
   ldap_search_base = dc=angelsofclockwork,dc=net
   id_provider = ldap
   auth_provider = ldap
   chpass_provider = ldap
   sudo_provider = ldap
   ldap_uri = ldap://zera1.angelsofclockwork.net
   ldap_id_use_start_tls = True
   ldap_tls_cacertdir = /etc/openldap/certs
   ldap_tls_cacert = /etc/openldap/certs/ca.pem
   # Add the below
   ldap_sudo_search_base = ou=SUDOers,dc=angelsofclockwork,dc=net
   
   [sssd]
   # Modify this line and add sudo to the list
   services = nss, pam, autofs, sudo
   
   # Add this also...
   [sudo]

   # systemctl restart sssd

.. note:: SSSD Cache

   Sometimes SSSD likes to cache things or never update things for whatever reason or another. To get around this, stop sssd, delete everything under /var/lib/sss/db/ and then start sssd again.

Now, let's test.

.. code-block:: bash

   [root@zera3 ~]# su - zera
   [zera@zera3 ~]$ sudo -l
   [sudo] password for zera:
   Matching Defaults entries for zera on this host:
       requiretty, env_reset, env_keep="COLORS DISPLAY HOSTNAME HISTSIZE INPUTRC KDEDIR LS_COLORS", env_keep+="MAIL
       PS1 PS2 QTDIR USERNAME LANG LC_ADDRESS LC_CTYPE", env_keep+="LC_COLLATE LC_IDENTIFICATION LC_MEASUREMENT
       LC_MESSAGES", env_keep+="LC_MONETARY LC_NAME LC_NUMERIC LC_PAPER LC_TELEPHONE", env_keep+="LC_TIME LC_ALL
       LANGUAGE LINGUAS _XKB_CHARSET XAUTHORITY", secure_path=/sbin\:/bin\:/usr/sbin\:/usr/bin, env_reset, requiretty
   
   User sokel may run the following commands on this host:
       (ALL : ALL) ALL

Member Groups
+++++++++++++

Member groups are extremely useful, especially for when you're granting permissions to external applications (and SSSD if you wish). 

.. code-block:: none

   # vi modules.ldif

   dn: cn=module,cn=config
   objectClass: olcModuleList
   cn: module
   olcModulePath: /usr/lib64/openldap
   olcModuleLoad: memberof.la

   # vi memberof.ldif

   dn: olcOverlay=memberof,olcDatabase={2}mdb,cn=config
   objectClass: olcMemberOf
   objectClass: olcOverlayConfig
   objectClass: olcConfig
   objectClass: top
   olcOverlay: memberof
   olcMemberOfDangling: ignore
   olcMemberOfRefInt: TRUE
   olcMemberOfGroupOC: groupOfNames
   olcMemberOfMemberAD: member
   olcMemberOfMemberOfAD: memberOf

   # ldapadd -Y EXTERNAL -H ldapi:/// -f modules.ldif
   # ldapadd -Y EXTERNAL -H ldapI:/// -f memberof.ldif

After that, we can now create our groups. Example.

.. code-block:: none

   dn: cn=Admins,ou=Group,dc=angelsofclockwork,dc=net
   objectClass: groupOfNames
   cn: Admins
   member: uid=chris,ou=People,dc=angelsofclockwork,dc=net
   member: uid=zera,ou=People,dc=angelsofclockwork,dc=net
   member: uid=sithlord,ou=People,dc=angelsofclockwork,dc=net

In SSSD, we can make some minor changes. 

.. code-block:: none

   ldap_search_base = dc=angelsofclockwork,dc=net?sub?|(memberOf=cn=Admins,ou=Group,dc=angelsofclockwork,dc=net)
   ldap_access_filter = (|(memberOf=cn=Admins,ou=Group,dc=angelsofclockwork,dc=net))
   # Change this to rfc2307 if you are using nis
   ldap_schema = rfc2307bis 
   enumerate = True

   # systemctl stop sssd ; rm -rf /var/lib/sss/db/* ; systemctl start sssd

If we were to do an ldapsearch, we can see the groups show up.

.. code-block:: none

   # ldapsearch -x -LLL uid=zera memberOf
   dn: uid=zera,ou=People,dc=angelsofclockwork,dc=net
   memberOf: cn=Admins,ou=Group,dc=angelsofclockwork,dc=net

Make sure you turn on referential integrity!

Referential Integrity
+++++++++++++++++++++

Having referential integrity is absolutely important. It basically means that if a user gets deleted, their group membership disappears also. This prevents you from having to clean up manually.

.. code-block:: none

   # vi module.ldif

   dn: cn=module,cn=config
   changetype: modify
   replace: olcModuleLoad
   olcModuleLoad: refint.la
   olcModuleLoad: memberof.la

   # ldapmodify -Y EXTERNAL -H ldapi:/// -f module.ldif

You also need the overlay. An overlay allows certain plugins to work on a DIT.

.. code-block:: none

   # vi overlay.ldif
   dn: olcOverlay=refint,olcDatabase={2}mdb,cn=config
   objectClass: olcOverlayConfig
   objectClass: olcConfig
   objectClass: olcRefintConfig
   objectClass: top
   olcOverlay: refint
   olcRefintAttribute: memberOf member manager

   # ldapmodify -Y EXTERNAL -H ldapi:/// -f overlay.ldif

ACL
+++

An ACL (Access Control List) allows permissions to be given to those in the LDAP tree. The problem with a default LDAP setup is that, attributes like userPassword show up in an ldapsearch. This gives little protection. So, to get around this issue, we have to create ACLs. 

.. note:: The Manager's Rights
   
   The manager has all rights to the DIT. In previous implementations, I have put him in access controls as a reference and would put "write" as his access. This isn't needed, but it doesn't hurt to have it. 

This ldif creates an ACL that allows the Admins group to do anything they want on the DIT (similar to manager). This also prevents anonymous searches from pulling up a user's password. 

.. code-block:: none

   # vi acl.ldif

   dn: olcDatabase={2}mdb,cn=config
   changetype: modify
   replace: olcAccess
   olcAccess: {0}to attrs=userPassword,shadowLastChange by group.exact="cn=Admins,ou=Group,dc=angelsofclockwork,dc=net" write by anonymous auth by self write by * none break
   olcAccess: {2}to * by group.exact="cn=Admins,ou=Group,dc=angelsofclockwork,dc=net" write by * read
   olcAccess: {3}to dn.base="" by * read

   # ldapmodify -Y EXTERNAL -H ldapi:/// -f acl.ldif

It's highly recommended, however, to disable anonymous searching, especially if you go production with LDAP. A lot of LDAP implementations disallow anonymous searching by default. You can do this with ACLs, but it's not recommended. We cover this in the search.

Disable Anonymous Binding
+++++++++++++++++++++++++

It's recommended to disable anonymous searching. This can be handled by making a modification to the global configuration and the DIT configuration.

.. code-block:: none

   dn: cn=config
   changetype: modify
   add: olcDisallows
   olcDisallows: bind_anon

   dn: olcDatabase={2}mdb,cn=config
   changetype: modify
   add: olcRequires
   olcRequires: authc

Once you add this in, all anonymous searching will cease.

.. code-block:: none

   # ldapsearch -x -LLL uid=zera
   ldap_bind: Inappropriate authentication (48)
           additional info: anonymous bind disallowed

LDAP Logging
++++++++++++

Logging is of course, very important for an LDAP server. There are a few types of logs we can do. There are the standard logs and then there are also audit logs. Audit logs allow an administrator to view changes being done to LDAP in an LDIF form. We can setup both.

Let's create our modification LDIF. This will turn on standard logging and enable the audit module. Run an ldapmodify against this LDIF.

.. code-block:: none

   dn: cn=config
   changetype: modify
   replace: olcLogFile
   olcLogFile: /var/log/ldap-standard.log
   -
   replace: olcLogLevel
   olcLogLevel: 256

   # Keep in mind, if you have other modules being loaded,
   # add them to the list
   dn: cn=module,cn=config
   changetype: modify
   replace: olcModuleLoad
   olcModuleLoad: refint.la
   olcModuleLoad: memberof.la
   olcModuleLoad: auditlog.la

Now, we need to make sure audit logging is done on our database.

.. code-block:: none
   
   dn: olcOverlay=auditlog,olcDatabase={2}mdb,cn=config
   objectClass: olcAuditlogConfig
   objectClass: olcOverlayConfig
   olcOverlay: auditlog
   olcAuditlogFile: /var/log/ldap-audit.log

It's recommended to have logrotate working for our logs. Here is a file I've dropped into /etc/logrotate.d. Experiment with these options. Since I work in an environment that has tons of transactions going all the time, and thus, my rotations are at 100M and 250M respectively.

.. code-block:: none
   
   /var/log/ldap-standard.log {
   missingok
   compress
   notifempty
   daily
   rotate 10
   size=100M
   }
   
   /var/log/ldap-audit.log {
   missingok
   compress
   notifempty
   daily
   rotate 10
   size=250M
   }

In /etc/rsyslog.conf, optionally, you can create this. If you find that logs are not appearing after the changes above, use this.

.. code-block:: none

   local4.*                   /var/log/ldap.log

Password Policy
+++++++++++++++

Password policies are a great asset, especially when working in an environment that have or require security policies. First, let's load our module and then add our overlay. This LDIF will do both. **You may want to remove the comments before adding.**

.. code-block:: none

   dn: cn=module,cn=config
   changetype: modify
   replace: olcModuleLoad
   olcModuleLoad: refint.la
   olcModuleLoad: memberof.la
   olcModuleLoad: auditlog.la
   olcModuleLoad: ppolicy.la

   dn: olcOverlay=ppolicy,olcDatabase={2}hdb,cn=config
   objectClass: olcOverlayConfig
   objectClass: olcPPolicyConfig
   olcOverlay: ppolicy
   olcPPolicyDefault: cn=default,ou=policies,dc=angelsofclockwork,dc=net
   # Set the below to TRUE if you want users to get locked out after failed attempted
   olcPPolicyUseLockout: TRUE
   # Set the below to TRUE if you want passwords to be hashed.
   # HIGHLY RECOMMENDED YOU SET THIS TO TRUE
   olcPPolicyHashCleartext: TRUE

Now, we need an LDIF to create our standard password policy. It's important to have a default password policy and then create separate ones as needed. Make sure to read the comments. **You may want to remove the comments before adding.**

.. code-block:: none

   dn: cn=default,ou=policies,dc=angelsofclockwork,dc=net
   objectClass: pwdPolicy
   objectClass: person
   objectClass: top
   cn: passwordDefault
   sn: passwordDefault
   pwdAttribute: userPassword
   # If set to 0, quality is not checked.
   # If set to 1, quality is checked by an internal module which you setup.
   # If set to 2, the system used to change the password must have a checking mechanism.
   # Pick your poison.
   pwdCheckQuality: 0
   # Password lives for 84 days
   pwdMinAge: 0
   pwdMaxAge: 7257600
   # Minimum length is 7
   pwdMinLength: 7
   # Password history of 10, cannot use a password that's in history
   pwdInHistory: 10
   # 5 Failures till a lockout, 10 minutes for it to reset, 30 minute lockout.
   pwdMaxFailure: 5
   pwdFailureCountInterval: 600
   pwdLockout: TRUE
   pwdLockoutDuration: 1800
   # A user can change their own password.
   pwdAllowUserChange: TRUE
   # Systems that authenticate to LDAP can warn 14 days before an expiration
   pwdExpireWarning: 1209600
   # Allowed binds on an expired password.
   pwdGraceAuthNLimit: 5
   pwdMustChange: TRUE
   pwdSafeModify: FALSE

In the instance you want to use the built-in module for password checking, your LDIF would have these lines.

.. code-block:: none

   pwdCheckQuality: 1
   pwdCheckModule: check_password.so


