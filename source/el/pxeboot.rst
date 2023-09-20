.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

PXE (with grub2)
^^^^^^^^^^^^^^^^

Original author: nazunalika

Last modified: Mon Aug 1 17:02

.. meta::
       :description: How to setup and configure pxeboot

This page goes over setting up a pxeboot system using tftp on Enterprise Linux or Fedora

.. contents::

Requirements
------------

Here are the list of requirements below.

* Enterprise Linux 8, 9, or Fedora
* A DHCP server setup that allows you to setup the `next_server` directive or setup the tftp server location

Tutorial Preface, Notes, and Recommendations
--------------------------------------------

In some environments, it may be better (or easier, depending on your perspective) to setup a PXE server and roll out systems in a lab or otherwise in that fashion. It's one of the most straight forward ways to roll out systems easily and consistently. The difference between a typical PXE setup and this is we're using grub2 menus, rather than the classic menu style. This makes it simpler to keep all configurations consistent between classic boot and EFI boot.

If you plan on using supporting other architectures, it will be easier to use that architecture to run the `grub2-mknetdir` command and brings those to your tftp server.

Cobbler
+++++++

While cobbler is a perfectly viable solution to setting up a pxeboot system for various distros and configurations, it is out of scope for this article. As of this writing, cobbler does not use grub2 as its baseline.

Server Setup
------------

This section goes over the server setup portion for the tftp server.

TFTP
++++

Let's install the tftpserver package plus some additional grub packages. If you are wanting other architectures, you can obtain the other grub2 module packages from your distribution's BaseOS or equivalent repository for that architecture and install it manually.

.. code-block:: shell

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

Let's make our initial net directories and ensure the selinux contexts are correct.

.. code-block:: shell

   % grub2-mknetdir --net-directory /var/lib/tftpboot/
   Netboot directory for i386-pc created. Configure your DHCP server to point to /srv/tftp/boot/grub2/i386-pc/core.0
   Netboot directory for x86_64-efi created. Configure your DHCP server to point to /srv/tftp/boot/grub2/x86_64-efi/core.efi

   % restorecon -R /var/lib/tftpboot

Now you'll need to enable the tftp socket and open the port. Traditionally, you would use xinetd. It's no longer required for the tftp service.

.. code-block:: shell

   # Note: This is port 69 with the UDP protocol
   % firewall-cmd --add-service=tftp --permanent
   % systemctl enable tftp.socket --now

DHCP
++++

On your DHCP server configuration (typically `/etc/dhcp/dhcpd.conf` if running on Fedora or EL), you should set the following options:

.. code-block:: none

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

Whether this section is within a subnet block or not, it is needed to ensure the right bootloader is called. Note that we're only loading x86. If you are loading armhfp, use `00:0a`. If you are loading aarch64, use `00:0b`.

.. code-block:: none

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

Note that in your subnet blocks, you should also mention `next_server`, which should point to your TFTP server. The DHCP and TFTP server can be on the same machine and there's nothing stopping you from doing that; `next_server` needs to be set regardless here. See an example below of a full work `dhcpd.conf`.

.. code-block:: none

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
   
Ensure that the `dhcpd` service is restarted after making the necessary changes.

Setting up Grub
+++++++++++++++

When you run `grub2-mknetdir`, it created a `core.*` set of files. An accompanying `grub.cfg` must sit next to them. To prevent a duplication of work, it can be simplified by making all grub configurations at `/var/lib/tftpboot` and then symlink them next to each directory containing `core.*`. Let's make a very, very simple one.

.. code-block:: none

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

Now let's just symlink it.

.. code-block:: none

   % cd /var/lib/tftpboot/boot/grub2/x86_64-efi
   % ln -s ../../../grub.cfg
   % cd /var/lib/tftpboot/boot/grub2/i386-pc
   % ln -s ../../../grub.cfg

This should produce a grub menu for both EFI and BIOS systems that contain three bootable options.

Adding Distributions
++++++++++++++++++++

Now that grub is sort of setup, we should add a distribution to it at least. Let's put up a regular installer with no kickstart for Fedora.

.. code-block:: shell

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

Now we can add a couple menu entry items for Fedora. I'm making both EFI and Classic entries to ensure we can boot both EFI and BIOS systems from the same menu.

.. code-block:: none

   . . .
   menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
     linuxefi fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os ip=dhcp
     initrdefi fedora-x86_64/initrd.img
   }
   menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
     linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ ip=dhcp
     initrd16 fedora-x86_64/initrd.img
   }
   # Add the below for ARM systems
   menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
     linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ ip=dhcp
     initrd fedora-aarch64/initrd.img
   }

Now the Fedora installation should be bootable.

Customizing Grub
----------------

Grub is customizable. It is possible to setup background images, choose menu colors, setup themes, and so on.

Colors and Backgrounds
++++++++++++++++++++++

Colors and backgrounds are perfectly possible, even in an EFI setup. We'll need to load a few modules and then set the colors and background we want. Note that if you're using a background, it should live in `/var/lib/tftpboot` to make things easier.

.. code-block:: none

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

The background would be `/var/lib/tftpboot/bg.png` in this example. Selected items will appear to be cyan and the typical gray selection box is now transparent, which is done by setting it to black. Everything else should appear as white text with a transparent background. Example below.

.. image:: /_static/img/grub_ex.png

Special Submenus
++++++++++++++++

Submenus are easily created using `submenu` in the grub configuration. For example:

.. code-block:: none

   submenu 'Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
      set menu_color_highlight=black/light-cyan
      set menu_color_normal=white/black
      set color_normal=white/black

      menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
        linuxefi fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os ip=dhcp
        initrdefi fedora-x86_64/initrd.img
      }
      menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
        linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ ip=dhcp
        initrd16 fedora-x86_64/initrd.img
      }
      menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
        linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ ip=dhcp
        initrd fedora-aarch64/initrd.img
      }
   }

This now means "Fedora Linux" will show up as a menu option and it will take you to a brand new menu with the two listed items, and another color scheme. Note that we created color items because submenus will reset the theme options. Example of how it looks is below.

.. image:: /_static/img/grub_ex_fedora.png

It is also possible to place everything into separate source-able files. Note that when you do this, you will need to symlink those files just like you did with `grub.cfg`.

.. code-block:: none

   submenu 'Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
     set menu_color_highlight=black/light-cyan
     set menu_color_normal=white/black
     set color_normal=white/black
     source fedora.cfg
   }

.. code-block:: none

   menuentry 'Install Fedora Linux (EFI)' --class fedora --class gnu-linux --class gnu --class os {
     linuxefi fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os ip=dhcp
     initrdefi fedora-x86_64/initrd.img
   }
   menuentry 'Install Fedora Linux (Classic)' --class fedora --class gnu-linux --class gnu --class os {
     linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ ip=dhcp
     initrd16 fedora-x86_64/initrd.img
   }
   menuentry 'Install Fedora Linux (ARM)' --class fedora --class gnu-linux --class gnu --class os {
     linux fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os/ ip=dhcp
     initrd fedora-aarch64/initrd.img
   }

Submenus can be nested too. Here's a deeper, working example of my own setup using Fedora 35.

.. code-block:: none

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
         linuxefi fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os ip=dhcp
         initrdefi fedora-x86_64/initrd.img
       }
   
       menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
         linuxefi fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os ip=dhcp
         initrdefi fedora-x86_64/initrd.img
       }
     
       menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
         linuxefi fedora-x86_64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os
         initrdefi fedora-x86_64/initrd.img
       }
     }
     
     # Classic Only
     submenu 'Classic Mode' --class fedora --class gnu-linux --class gnu --class os {
       set menu_color_highlight=black/light-cyan
       set menu_color_normal=white/black
       set color_normal=white/black
     
       menuentry 'Install Fedora Linux (No KS)' --class fedora --class gnu-linux --class gnu --class os {
         linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ ip=dhcp
         initrd16 fedora-x86_64/initrd.img
       }
   
        menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
         linux16 fedora-x86_64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/ ip=dhcp
         initrd16 fedora-x86_64/initrd.img
       }
     
       menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
         linux16 fedora-x86_64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/x86_64/os/
         initrd16 fedora-x86_64/initrd.img
       }
     }

     # EFI mode for ARM
     submenu 'EFI Mode (aarch64)' --class fedora --class gnu-linux --class gnu --class os {
       set menu_color_highlight=black/light-cyan
       set menu_color_normal=white/black
       set color_normal=white/black
     
       menuentry 'Install Fedora Linux (No KS)' --class fedora --class gnu-linux --class gnu --class os {
         linuxefi fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os ip=dhcp
         initrdefi fedora-aarch64/initrd.img
       }
   
       menuentry 'Install Fedora Linux' --class fedora --class gnu-linux --class gnu --class os {
         linuxefi fedora-aarch64/vmlinuz inst.repo=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os ip=dhcp
         initrdefi fedora-aarch64/initrd.img
       }
     
       menuentry 'Fedora Linux (Rescue Mode)' --class fedora --class gnu-linux --class gnu --class os {
         linuxefi fedora-aarch64/vmlinuz inst.rescue inst.stage2=http://dl.fedoraproject.org/pub/fedora/linux/releases/38/Everything/aarch64/os
         initrdefi fedora-aarch64/initrd.img
       }
     }
   }
