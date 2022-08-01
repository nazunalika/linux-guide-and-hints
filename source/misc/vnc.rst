.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

VNC
^^^

Original author: nazunalika

Last modified: Mon Aug 1 17:02

This was written because this seems to be a common question on IRC, which could easily be researched every single time. That and despite "research", there's a lot of tutorials that get it wrong or do some ridiculous nonsense (such as copying Xresources to your home directory, which is unnecessary).

.. note:: VNC is abyssmal

    We frown upon the use of VNC, regardless of CentOS or Fedora. It's security is considered pathetic and there are much better options.

    Also note that wayland is **not** supported in VNC whatsoever. You are heavily encouraged to use gnome's built in remote desktop instead which uses vino and wayland should work.

Setup
-----

.. code:: shell

   # Install the packages
   root% yum install tigervnc-server -y
   root% cp /usr/lib/systemd/system/vncserver@.service /etc/systemd/system/vncserver@.service
   root% vi /etc/systemd/system/vncserver@.service
   # modify <USER> to username
   root% systemctl enable vncserver@:1.service
   root% firewall-cmd --add-service=vnc-server
   root% firewall-cmd --runtime-to-permanent
   root% su - username
   username% vncpasswd
   . . .
   username% vi ~/.vnc/xstartup
   export XDG_SESSION_TYPE=x11
   export GDK_BACKEND=x11
   # Modify --session to be gnome-classic or otherwise that you need
   # If you are using XFCE, you could put exec xfce4-session instead
   exec gnome-session --session=gnome
   username% chmod +x ~/.vnc/xstartup
   # At this point, you can start the service, logout, and call it a day. 
   # You can also reboot, since the service is enabled. Your choice.
   username% sudo systemctl start vncserver@:1.service

