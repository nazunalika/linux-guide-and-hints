---
title: 'PXE (with grub2)'
---

This page goes over setting up a pxeboot system using tftp on Enterprise
Linux or Fedora

## Requirements

Here are the list of requirements below.

* Enterprise Linux 8, 9, or Fedora
* A DHCP server setup that allows you to setup the `next_server` directive or setup the tftp server location
* Optionally if you are using a local mirror, `httpd` or `nginx` installed. (This guide assumes `httpd`)

## Tutorial Preface, Notes, and Recommendations

In some environments, it may be better (or easier, depending on your
perspective) to setup a PXE server and roll out systems in a lab or
otherwise in that fashion. It's one of the most straight forward ways
to build out systems easily and consistently. The difference between a
typical PXE setup and this is we're using grub2 menus, rather than the
classic menu style. This makes it simpler to keep all configurations
consistent between classic boot and EFI boot.

If you plan on using supporting other architectures, it will be easier
to use that architecture to run the grub2-mknetdir command and brings
those to your tftp server.

### Cobbler

While cobbler is a perfectly viable solution to setting up a pxeboot
system for various distros and configurations, it is out of scope for
this article. It is unknown if it sets up or directly supports grub2.

## Server Setup

This section goes over the server setup portion for the tftp server.

### TFTP

Let's install the tftpserver package plus some additional grub
packages. If you are wanting other architectures, you can obtain the
other grub2 module packages from your distribution's BaseOS or
equivalent repository for that architecture and install it manually.

``` bash
# x86_64
% dnf install \
  grub2-efi-x64-modules \
  grub2-tools-extra \
  grub2-pc-modules \
  shim-ia32 \              # this does not exist on el9+
  tftp-server

# aarch64
% dnf install \
  grub2-efi-aa64-modules \
  grub2-tools-extra \
  tftp-server
```

Let's make our initial net directories and ensure the selinux contexts
are correct.

!!! note "Secure Boot"
    Secure Boot does not work with the default files provided. You will
    need to obtain the `shimx64.efi` or `shim.efi` file from your
    distribution's shim-{x64,aa64} package.

``` bash
% grub2-mknetdir --net-directory /var/lib/tftpboot/
Netboot directory for i386-pc created. Configure your DHCP server to point to /srv/tftp/boot/grub2/i386-pc/core.0
Netboot directory for x86_64-efi created. Configure your DHCP server to point to /srv/tftp/boot/grub2/x86_64-efi/core.efi

% restorecon -R /var/lib/tftpboot
```

Now you'll need to enable the tftp socket and open the port.
Traditionally, you would use xinetd. It's no longer required for the
tftp service.

``` bash
# Note: This is port 69 with the UDP protocol
% firewall-cmd --add-service=tftp --permanent
% systemctl enable tftp.socket --now
```

### DHCP (ISC)

On your DHCP server configuration (typically /etc/dhcp/dhcpd.conf if
running on Fedora or EL), you should set the following options:

```
option pxe-system-type code 93 = unsigned integer 16;
option rfc3442-classless-static-routes code 121 = array of integer 8;
option ms-classless-static-routes code 249 = array of integer 8;

option space pxelinux;
option pxelinux.magic code 208 = string;
option pxelinux.configfile code 209 = text;
option pxelinux.pathprefix code 210 = text;
option pxelinux.reboottime code 211 = unsigned integer 32;
option architecture-type   code 93 = unsigned integer 16;
option pxelinux.mtftp-ip    code 1 = ip-address;
option pxelinux.mtftp-cport code 2 = unsigned integer 16;
option pxelinux.mtftp-sport code 3 = unsigned integer 16;
option pxelinux.mtftp-tmout code 4 = unsigned integer 8;
option pxelinux.mtftp-delay code 5 = unsigned integer 8;
```

Whether this section is within a subnet block or not, it is needed to
ensure the right bootloader is called. Note that we're only loading
x86. If you are loading armhfp, use 00:0a. If you are loading aarch64,
use 00:0b.

```
class "pxeclients" {
        match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";
        # x86_64 EFI
        if option pxe-system-type = 00:07 {
                filename "boot/grub2/x86_64-efi/core.efi";
        } else if option pxe-system-type = 00:08 {
                filename "boot/grub2/x86_64-efi/core.efi";
        } else if option pxe-system-type = 00:09 {
                filename "boot/grub2/x86_64-efi/core.efi";
        } else {
                # BIOS boot only
                filename "boot/grub2/i386-pc/core.0";
        }
}
```

Note that in your subnet blocks, you should also mention `next_server`,
which should point to your TFTP server. The DHCP and TFTP server can be
on the same machine and there's nothing stopping you from doing that;
`next_server` needs to be set regardless here. See an example below of a
full work dhcpd.conf.

```
ddns-update-style interim;

allow booting;
allow bootp;
authoritative;
log-facility local6;

ignore client-updates;
set vendorclass = option vendor-class-identifier;

## Allowing EFI Clients
option pxe-system-type code 93 = unsigned integer 16;
option rfc3442-classless-static-routes code 121 = array of integer 8;
option ms-classless-static-routes code 249 = array of integer 8;

option space pxelinux;
option pxelinux.magic code 208 = string;
option pxelinux.configfile code 209 = text;
option pxelinux.pathprefix code 210 = text;
option pxelinux.reboottime code 211 = unsigned integer 32;
option architecture-type code 93 = unsigned integer 16;

option pxelinux.mtftp-ip    code 1 = ip-address;
option pxelinux.mtftp-cport code 2 = unsigned integer 16;
option pxelinux.mtftp-sport code 3 = unsigned integer 16;
option pxelinux.mtftp-tmout code 4 = unsigned integer 8;
option pxelinux.mtftp-delay code 5 = unsigned integer 8;

subnet 10.100.0.0 netmask 255.255.255.0 {
        interface               br1000;
        option routers          10.100.0.1;
        option domain-name-servers      10.100.0.1, 10.100.0.231;
        option domain-name              "angelsofclockwork.net";
        option subnet-mask              255.255.255.0;
        range           10.100.0.110 10.100.0.199;
        ## EFI Client Catch
        class "pxeclients" {
                match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";
                if option pxe-system-type = 00:07 {
                        filename "boot/grub2/x86_64-efi/core.efi";
                } else if option pxe-system-type = 00:08 {
                        filename "boot/grub2/x86_64-efi/core.efi";
                } else if option pxe-system-type = 00:09 {
                        filename "boot/grub2/x86_64-efi/core.efi";
                } else if option pxe-system-type = 00:0a {
                        filename "boot/grub2/armv7a-efi/core.efi";
                } else if option pxe-system-type = 00:0b {
                        filename "boot/grub2/aarch64-efi/core.efi";
                } else {
                        filename "boot/grub2/i386-pc/core.0";
                }
        }
        default-lease-time      21600;
        max-lease-time  43200;
        next-server     10.100.0.1;
}
```

Ensure that the dhcpd service is restarted after making the necessary
changes.

### DHCP (Kea)

Kea is a different configuration style from ISC. Some of the configuration is
the same and also frustratingly different.

You'll need to turn on some options, similar to dhcpd. In the `Dhcp4` section,
we'll set them.

```
...
    "option-def": [
      {
        "space": "dhcp4",
        "name": "rfc3442-classless-static-routes",
        "code": 121,
        "array": true,
        "type": "int8"
      },
      {
        "space": "dhcp4",
        "name": "ms-classless-static-routes",
        "code": 249,
        "array": true,
        "type": "int8"
      },
      {
        "space": "pxelinux",
        "name": "magic",
        "code": 208,
        "type": "string"
      },
      {
        "space": "pxelinux",
        "name": "configfile",
        "code": 209,
        "type": "string"
      },
      {
        "space": "pxelinux",
        "name": "pathprefix",
        "code": 210,
        "type": "string"
      },
      {
        "space": "pxelinux",
        "name": "reboottime",
        "code": 211,
        "type": "uint32"
      },
      {
        "space": "pxelinux",
        "name": "mtftp-ip",
        "code": 1,
        "type": "ipv4-address"
      },
      {
        "space": "pxelinux",
        "name": "mtftp-cport",
        "code": 2,
        "type": "uint16"
      },
      {
        "space": "pxelinux",
        "name": "mtftp-sport",
        "code": 3,
        "type": "uint16"
      },
      {
        "space": "pxelinux",
        "name": "mtftp-tmout",
        "code": 4,
        "type": "uint8"
      },
      {
        "space": "pxelinux",
        "name": "mtftp-delay",
        "code": 5,
        "type": "uint8"
      },
      {
        "space": "dhcp4",
        "name": "iscsi-initiator-iqn",
        "code": 203,
        "type": "string"
      },
      {
        "name": "PXEDiscoveryControl",
        "code": 6,
        "space": "vendor-encapsulated-options-space",
        "type": "uint8",
        "array": false
      },
      {
        "name": "PXEMenuPrompt",
        "code": 10,
        "space": "vendor-encapsulated-options-space",
        "type": "record",
        "array": false,
        "record-types": "uint8,string"
      },
      {
        "name": "PXEBootMenu",
        "code": 9,
        "space": "vendor-encapsulated-options-space",
        "type": "record",
        "array": false,
        "record-types": "uint16,uint8,string"
      }
    ],
...
```

Unlike dhcpd, we'll see the class information also in the `Dhcp4` section. This
will make it effectively work in all subnets. The below also enables x86, ARM,
and POWER systems.

```
...
    "client-classes": [
      { "name": "PXEClient-x86_64-1", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00007'", "boot-file-name": "boot/grub2/x86_64-efi/core.efi" },
      { "name": "PXEClient-x86_64-2", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00008'", "boot-file-name": "boot/grub2/x86_64-efi/core.efi" },
      { "name": "PXEClient-x86_64-3", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00009'", "boot-file-name": "boot/grub2/x86_64-efi/core.efi" },
      { "name": "PXEClient-aarch64-1", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:0000b'", "boot-file-name": "boot/grub2/arm64-efi/core.efi" },
      { "name": "PXEClient-ppc64le-1", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:0000e'", "boot-file-name": "boot/grub2/powerpc-ieee1275/core.elf" },
      /// these are whatever
      { "name": "PXEClient-i386-1", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00006'", "boot-file-name": "boot/grub2/i386-pc/core.0" },
      { "name": "PXEClient-i386-3", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00000'", "boot-file-name": "boot/grub2/i386-pc/core.0" },
      { "name": "PXEClient-i386-2", "test": "substring(option[60].hex,0,20) == 'PXEClient:Arch:00002'", "boot-file-name": "elilo.efi" }
    ],
...
```

Subnet blocks are straight forward. They also will sit in `Dhcp4`. Note that
each subnet block will need a unique `id` number. Ensure `next_server` is
setup correctly also.

```
...
    "subnet4": [
      {
        "id": 1,
        "subnet": "10.100.0.0/24",
        "interface": "br1000",
        "option-data": [
          {
            "space": "dhcp4",
            "name": "routers",
            "code": 3,
            "data": "10.100.0.1"
          },
          {
            "space": "dhcp4",
            "name": "domain-name-servers",
            "code": 6,
            "data": "10.100.0.1, 10.100.0.231"
          },
          {
            "space": "dhcp4",
            "name": "domain-name",
            "code": 15,
            "data": "angelsofclockwork.net"
          },
          {
            "space": "dhcp4",
            "name": "subnet-mask",
            "code": 1,
            "data": "255.255.255.0"
          }
        ],
        "pools": [
          {
            "pool": "10.100.0.110 - 10.100.0.199"
          }
        ],
        "valid-lifetime": 21600,
        "max-valid-lifetime": 43200,
        "next-server": "10.100.0.1",
        "reservations": []
      },
...
```

### Web Server (httpd)

If we plan on hosting the installation mirror in your environment, it's
recommended to stand up a simple web server. It does not require any
kind of special configuration. We'll use the default /var/www/html/
path. If you wish to use another such as /srv/www, you will need to
setup a virtual host (this is outside the scope of this page).

``` bash
% dnf install httpd -y
% systemctl enable httpd --now
% firewall-cmd --add-service=http --permanent
% firewall-cmd --complete-reload

# create the directories for our distributions
% mkdir -p /var/www/html/os/{fedora,centos,rocky}
```

### Setting up Grub

When you run grub2-mknetdir, it created a core.\* set of files. An
accompanying grub.cfg must sit next to them. To prevent a duplication of
work, it can be simplified by making all grub configurations at
/var/lib/tftpboot and then symlink them next to each directory
containing core.\*. Let's make a very, very simple one.

```
set default=0
set timeout=60
menuentry 'EFI Firmware System Setup' $menuentry_id_option 'uefi-firmware' {
  fwsetup
}

menuentry 'Reboot' {
  reboot
}

menuentry 'Shutdown' {
  halt
}
```

Now let's just symlink it.

``` bash
% cd /var/lib/tftpboot/boot/grub2/x86_64-efi
% ln -s ../../../grub.cfg
% cd /var/lib/tftpboot/boot/grub2/i386-pc
% ln -s ../../../grub.cfg
```

This should produce a grub menu for both EFI and BIOS systems that
contain three bootable options.

## Adding Distributions

Now that grub is sort of setup, we should add a distribution to it at
least. Below are a couple examples using Fedora, Rocky Linux, and CentOS
Stream.

!!! note
    When setting up for UEFI, if `linux` and `initrd` do not work for you,
    you may need to use `linuxefi` and `initrdefi` instead. This should be
    a rare case.

### Rocky Linux

Setting up Rocky Linux (or any other Enterprise Linux distribution)
should be straight forward. We'll download both Rocky Linux 8 and Rocky
Linux 9 and setup the menus.

!!! note
    If you plan on not hosting a mirror of the base repositories, ensure
    that your inst.repo/inst.stage2 commands are accurate to a mirror of
    your choice.

The below assumes we are hosting a mirror of the downloaded ISO, which
will make installations quicker as it'll be confined to your network.

``` bash
% cd /var/tmp
# Rocky Linux 8
% wget https://dl.rockylinux.org/pub/rocky/8/isos/x86_64/Rocky-8-latest-x86_64-dvd.iso
# Rocky Linux 9
% wget https://dl.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9-latest-x86_64-dvd.iso

# Optionally, if you plan on supporting ARM...
% wget https://dl.rockylinux.org/pub/rocky/8/isos/aarch64/Rocky-8-latest-aarch64-dvd.iso
% wget https://dl.rockylinux.org/pub/rocky/9/isos/aarch64/Rocky-9-latest-aarch64-dvd.iso
```

Here we'll copy the data we want into the necessary directories. Any
pxeboot related images will go to /var/lib/tftpboot/rocky-X-ARCH (X
being the major version, ARCH being the architecture). If we are keeping
a local mirror of the DVD, we'll put it into
/var/www/html/os/rocky/X/ARCH. Below is for x86_64, but the same steps
can be repeated for aarch64 without any issues. Just replace x86_64
with aarch64.

``` bash
## Rocky 8
% mount -o loop Rocky-8-latest-x86_64-dvd.iso /mnt
% mkdir /var/lib/tftpboot/rocky-8-x86_64
% cp /mnt/images/pxeboot/* /var/lib/tftpboot/rocky-8-x86_64
% mkdir -p /var/www/html/os/rocky/8/x86_64
% rsync -vrlptDSH --delete /mnt/ /var/www/html/os/rocky/8/x86_64
% umount /mnt

## Rocky 9
% mount -o loop Rocky-9-latest-x86_64-dvd.iso /mnt
% mkdir /var/lib/tftpboot/rocky-9-x86_64
% cp /mnt/images/pxeboot/* /var/lib/tftpboot/rocky-9-x86_64
% mkdir -p /var/www/html/os/rocky/9/x86_64
% rsync -vrlptDSH --delete /mnt/ /var/www/html/os/rocky/9/x86_64
% umount /mnt

# Copy the appropriate files over for the kernels
% mkdir -p /var/lib/tftpboot/rocky-{8,9}-x86_64
% cp /var/www/html/os/rocky/8/x86_64/images/pxeboot/* /var/lib/tftpboot/rocky-8-x86_64
% cp /var/www/html/os/rocky/9/x86_64/images/pxeboot/* /var/lib/tftpboot/rocky-9-x86_64

% restorecon -R /var/www/html/os/rocky
% restorecon -R /var/lib/tftpboot
```

At this point, we'll need to setup the grub menus. We'll setup
non-kickstart examples for BIOS and UEFI.

```
. . .
# Rocky 8
menuentry 'Install Rocky Linux 8 (No KS) (UEFI)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 8 kernel..."
  linux rocky-8-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/8/x86_64 inst.stage2=http://10.100.0.1/os/rocky/8/x86_64 ip=dhcp
  initrd rocky-8-x86_64/initrd.img
}
menuentry 'Install Rocky Linux 8 (No KS) (BIOS)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 8 kernel..."
  linux16 rocky-8-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/8/x86_64 inst.stage2=http://10.100.0.1/os/rocky/8/x86_64 ip=dhcp
  initrd16 rocky-8-x86_64/initrd.img
}

# if you are setting up arm...
menuentry 'Install Rocky Linux 8 (No KS) (aarch64)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 8 kernel..."
  linux rocky-9-aarch64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/8/aarch64 inst.stage2=http://10.100.0.1/os/rocky/8/aarch64 ip=dhcp
  initrd rocky-9-aarch64/initrd.img
}
```

```
. . .
# Rocky 9
menuentry 'Install Rocky Linux 9 (No KS) (UEFI)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 9 kernel..."
  linux rocky-9-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/9/x86_64 inst.stage2=http://10.100.0.1/os/rocky/9/x86_64 ip=dhcp
  initrd rocky-9-x86_64/initrd.img
}
menuentry 'Install Rocky Linux 9 (No KS) (BIOS)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 9 kernel..."
  linux16 rocky-9-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/9/x86_64 inst.stage2=http://10.100.0.1/os/rocky/9/x86_64 ip=dhcp
  initrd16 rocky-9-x86_64/initrd.img
}

# if you are setting up arm...
menuentry 'Install Rocky Linux 9 (No KS) (aarch64)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading Rocky Linux 9 kernel..."
  linux rocky-9-aarch64/vmlinuz inst.repo=http://10.100.0.1/os/rocky/9/aarch64 inst.stage2=http://10.100.0.1/os/rocky/9/aarch64 ip=dhcp
  initrd rocky-9-aarch64/initrd.img
}
```

The Rocky Linux installation should now be bootable.

### CentOS Stream

Much like Rocky Linux (or other derivatives), the path is the same for
setting it up.

!!! note "Using upstream mirror path"
    If you plan on not hosting a mirror of the base repositories, ensure
    that your inst.repo/inst.stage2 commands are accurate to a mirror of
    your choice.

``` bash
% cd /var/tmp
# CentOS Stream 9
% wget -O CentOS-Stream-9-latest-x86_64-dvd1.iso \
  'https://mirrors.centos.org/mirrorlist?path=/9-stream/BaseOS/x86_64/iso/CentOS-Stream-9-latest-x86_64-dvd1.iso&redirect=1&protocol=https'

# Optionally, if you plan on supporting ARM...
% wget -O CentOS-Stream-9-latest-aarch64-dvd1.iso \
  'https://mirrors.centos.org/mirrorlist?path=/9-stream/BaseOS/aarch64/iso/CentOS-Stream-9-latest-aarch64-dvd1.iso&redirect=1&protocol=https'
```

Here we'll copy the data we want into the necessary directories. Any
pxeboot related images will go to /var/lib/tftpboot/rocky-X-ARCH (X
being the major version, ARCH being the architecture). If we are keeping
a local mirror of the DVD, we'll put it into
/var/www/html/os/rocky/X/ARCH. Below is for x86_64, but the same steps
can be repeated for aarch64 without any issues. Just replace x86_64
with aarch64.

``` bash
## CentOS Stream 9
% mount -o loop CentOS-Stream-9-latest-x86_64-dvd1.iso /mnt
% mkdir /var/lib/tftpboot/centos-9-x86_64
% cp /mnt/images/pxeboot/* /var/lib/tftpboot/centos-9-x86_64
% mkdir -p /var/www/html/os/centos/9/x86_64
% rsync -vrlptDSH --delete /mnt/ /var/www/html/os/centos/9/x86_64
% umount /mnt

% mkdir -p /var/lib/tftpboot/centos-9-x86_64
% cp /var/www/html/os/centos/9/x86_64/images/pxeboot/* /var/lib/tftpboot/centos-9-x86_64

% restorecon -R /var/www/html/os/centos/9
% restorecon -R /var/lib/tftpboot
```

At this point, we'll need to setup the grub menus. We'll setup
non-kickstart examples for BIOS and UEFI.

```
. . .
# CentOS Stream 9
menuentry 'Install CentOS Stream 9 (No KS) (UEFI)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading CentOS Stream 9 kernel..."
  linux centos-9-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/centos/9/x86_64 inst.stage2=http://10.100.0.1/os/centos/9/x86_64 ip=dhcp
  initrd centos-9-x86_64/initrd.img
}
menuentry 'Install CentOS Stream 9 (No KS) (BIOS)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading CentOS Stream 9 kernel..."
  linux16 centos-9-x86_64/vmlinuz inst.repo=http://10.100.0.1/os/centos/9/x86_64 inst.stage2=http://10.100.0.1/os/centos/9/x86_64 ip=dhcp
  initrd16 centos-9-x86_64/initrd.img
}

# if you are setting up arm...
menuentry 'Install CentOS Stream 9 (No KS) (aarch64)' --class fedora --class gnu-linux --class gnu --class os {
  echo "Loading CentOS Stream 9 kernel..."
  linux centos-9-aarch64/vmlinuz inst.repo=http://10.100.0.1/os/centos/9/aarch64 inst.stage2=http://10.100.0.1/os/centos/9/aarch64 ip=dhcp
  initrd centos-9-aarch64/initrd.img
}
```

The CentOS Stream installation should now be bootable.

### Fedora

Let's put up a regular installer with no kickstart for Fedora. This
does not involve pulling down any ISO's and will rely entirely on using
upstream repositories.

``` bash
% cd /var/lib/tftpboot
% mkdir fedora-x86_64
% cd fedora-x86_64
# Replace XX with the current fedora version
% wget https://dl.fedoraproject.org/pub/fedora/linux/releases/XX/Everything/x86_64/os/images/pxeboot/initrd.img
% wget https://dl.fedoraproject.org/pub/fedora/linux/releases/XX/Everything/x86_64/os/images/pxeboot/vmlinuz

# If you want arm systems... aarch64
% cd ..
% mkdir fedora-aarch64
# Replace XX with the current fedora version
% wget https://dl.fedoraproject.org/pub/fedora/linux/releases/XX/Everything/aarch64/os/images/pxeboot/initrd.img
% wget https://dl.fedoraproject.org/pub/fedora/linux/releases/XX/Everything/aarch64/os/images/pxeboot/vmlinuz
```

Now we can add a couple menu entry items for Fedora. I'm making both
EFI and Classic entries to ensure we can boot both EFI and BIOS systems
from the same menu.

```
. . .
menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
  linux fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os ip=dhcp
  initrd fedora-x86_64/initrd.img
}
menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
  linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ ip=dhcp
  initrd16 fedora-x86_64/initrd.img
}
# Add the below for ARM systems
menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
  linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ ip=dhcp
  initrd fedora-aarch64/initrd.img
}
```

Now the Fedora installation should be bootable.

## Customizing Grub

Grub is customizable. It is possible to setup background images, choose
menu colors, setup themes, and so on.

### Colors and Backgrounds

Colors and backgrounds are perfectly possible, even in an EFI setup.
We'll need to load a few modules and then set the colors and background
we want. Note that if you're using a background, it should live in
/var/lib/tftpboot to make things easier.

```
. . .
insmod all_video
insmod gfxterm
insmod gfxterm_menu
insmod gfxmenu
insmod gfxterm_background
insmod png
terminal_output gfxterm
background_image -m stretch /bg.png

set menu_color_highlight=cyan/black
set menu_color_normal=white/black
set color_normal=white/black
. . .
```

The background would be /var/lib/tftpboot/bg.png in this example.
Selected items will appear to be cyan and the typical gray selection box
is now transparent, which is done by setting it to black. Everything
else should appear as white text with a transparent background. Example
below.

![image](/_static/img/grub_ex.png)

### Special Submenus

Submenus are easily created using submenu in the grub configuration. For
example:

```
submenu 'Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
   set menu_color_highlight=black/light-cyan
   set menu_color_normal=white/black
   set color_normal=white/black

   menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
     linux fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os ip=dhcp
     initrd fedora-x86_64/initrd.img
   }
   menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
     linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ ip=dhcp
     initrd16 fedora-x86_64/initrd.img
   }
   menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
     linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ ip=dhcp
     initrd fedora-aarch64/initrd.img
   }
}
```

This now means "Fedora Linux" will show up as a menu option and it
will take you to a brand new menu with the two listed items, and another
color scheme. Note that we created color items because submenus will
reset the theme options. Example of how it looks is below.

![grub menu example](/assets/grub_ex_fedora.png)

It is also possible to place everything into separate source-able files.
Note that when you do this, you will need to symlink those files just
like you did with grub.cfg.

```
submenu 'Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
  set menu_color_highlight=black/light-cyan
  set menu_color_normal=white/black
  set color_normal=white/black
  source fedora.cfg
}
```

```
menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
  linux fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os ip=dhcp
  initrd fedora-x86_64/initrd.img
}
menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
  linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ ip=dhcp
  initrd16 fedora-x86_64/initrd.img
}
menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
  linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os/ ip=dhcp
  initrd fedora-aarch64/initrd.img
}
```

Submenus can be nested too. Here's a deeper, working example of my own
setup using Fedora 40.

```
# grub.cfg
set default=0
set timeout=60
insmod all_video
insmod gfxterm
insmod gfxterm_menu
insmod gfxmenu
insmod gfxterm_background
insmod png
terminal_output gfxterm
loadfont /unicode.pf2
background_image -m stretch /bg.png

set menu_color_highlight=cyan/black
set menu_color_normal=white/black
set color_normal=white/black

submenu 'Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
  set menu_color_highlight=black/light-cyan
  set menu_color_normal=white/black
  set color_normal=white/black
  source fedora.cfg
}

menuentry 'EFI System Setup' $menuentry_id_option 'uefi-firmware' {
  fwsetup
}

menuentry 'Reboot' {
  reboot
}

menuentry 'Shutdown' {
  halt
}

# fedora.cfg
submenu 'Fedora Linux (latest stable)' --class fedora --class gnu-linux --class gnu --class os {
  set menu_color_highlight=black/light-cyan
  set menu_color_normal=white/black
  set color_normal=white/black

  # EFI Only
  submenu 'EFI Mode' --class fedora --class gnu-linux --class gnu --class os {
    set menu_color_highlight=black/light-cyan
    set menu_color_normal=white/black
    set color_normal=white/black

    menuentry 'Install Fedora Linux (No KS)' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os ip=dhcp
      initrd fedora-x86_64/initrd.img
    }

    menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os ip=dhcp
      initrd fedora-x86_64/initrd.img
    }

    menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-x86_64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os
      initrd fedora-x86_64/initrd.img
    }
  }

  # Classic Only
  submenu 'Classic Mode' --class fedora --class gnu-linux --class gnu --class os {
    set menu_color_highlight=black/light-cyan
    set menu_color_normal=white/black
    set color_normal=white/black

    menuentry 'Install Fedora Linux (No KS)' --class fedora --class gnu-linux --class gnu --class os {
      linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ ip=dhcp
      initrd16 fedora-x86_64/initrd.img
    }

     menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
      linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/ ip=dhcp
      initrd16 fedora-x86_64/initrd.img
    }

    menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
      linux16 fedora-x86_64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/x86_64/os/
      initrd16 fedora-x86_64/initrd.img
    }
  }

  # EFI mode for ARM
  submenu 'EFI Mode (aarch64)' --class fedora --class gnu-linux --class gnu --class os {
    set menu_color_highlight=black/light-cyan
    set menu_color_normal=white/black
    set color_normal=white/black

    menuentry 'Install Fedora Linux (No KS)' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os ip=dhcp
      initrd fedora-aarch64/initrd.img
    }

    menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os ip=dhcp
      initrd fedora-aarch64/initrd.img
    }

    menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
      linux fedora-aarch64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/40/Everything/aarch64/os
      initrd fedora-aarch64/initrd.img
    }
  }
}
```

## Secure Boot

Using the above setup, it is perfectly possible to have Secure Boot working. Instead of using `core.efi`, you would use a `shimx64.efi` file from the shim package. The `grub2-mknetdir` command does not provide this file, so we need to extract it from a running system or download and unpack it.

```
% dnf download shim-x64
% rpm2cpio shim-x64-15.8-2.el9.x86_64.rpm | cpio -idmv
% ls -l boot/efi/EFI/rocky
total 3656
-rwx------. 1 root root    104 Apr  4 14:23 BOOTX64.CSV
-rwx------. 1 root root 857352 Apr  4 14:23 mmx64.efi
-rwx------. 1 root root 959224 Apr  4 14:23 shim.efi
-rwx------. 1 root root 959224 Apr  4 14:23 shimx64.efi
-rwx------. 1 root root 952016 Apr  4 14:23 shimx64-rocky.efi
```

Note that both `shim.efi` and `shimx64.efi` should be the same file. Copying
`shimx64.efi` is sufficient enough.

Ensure that your DHCP configuration is now pointing to this file and the
permissions are set to `755`.

### Font Issues

If you notice your grub2 menu is missing characters (e.g. you see blocks), you
may need to get at least the unicode.pf2 file from the same system you obtained
the `shimx64.efi` file. It can be found in `/usr/share/grub`. However, this may
not work, and may require you to use the `grub2-mkfont` tool.
