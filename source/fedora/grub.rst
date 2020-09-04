GRUB
^^^^

Grub is the default bootloader for Fedora, CentOS/RHEL, and many other distributions.

Fedora Grub Menu Missing
------------------------

On default installs of Fedora, the grub menu is now hidden from view and Fedora is automatically booted. For users who need to select a different kernel or need to boot to Windows (in dual boot situations), they have two ways of accessing the menu.

#. Hold shift before the system begins to boot from the hard drive
#. Run `grub2-editenv - unset menu_auto_hide` as root

