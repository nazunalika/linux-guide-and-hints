VirtualBox
^^^^^^^^^^

"Failed to start Load Kernel Modules" after uninstalling
--------------------------------------------------------

If ``journalctl`` shows that you still get ``could not insert vboxdrv`` errors, run ``dracut -v -f`` then restart your computer.

Kernel modules do not build upon kernel update
----------------------------------------------

Per the `RPMFusion FAQ <https://rpmfusion.org/Howto/VirtualBox>`_, run ``akmods-shutdown`` then load the modules and restart the service.

.. code-block:: bash

    /sbin/modprobe -r -b vboxnetflt
    /sbin/modprobe -r -b vboxnetadp
    /sbin/modprobe -r -b vboxdrv
    /sbin/modprobe -r -b vboxpci
    /sbin/modprobe -r -b vboxdrv

    systemctl restart systemd-modules-load

While RPMFusion doesn't officially support VirtualBox with SELinux enabled, it is a terrible idea to disable SELinux.
