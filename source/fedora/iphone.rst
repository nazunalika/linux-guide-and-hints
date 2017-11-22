iPhone
^^^^^^

In order to mount your iPhone for tethering or viewing photos, you need:

- fuse
- ifuse
- libimobiledevice
- usbmuxd
- libusbmuxd

Some of these packages may be pulled as dependencies of each other, but I listed them
for completion.

Then you can do:

.. code-block:: bash

    # mount as regular user, NOT root
    ifuse /mnt/iphone

    # unmount
    fusermount -u /mnt/iphone

Make sure that you said yes to "Allow this device..." on your phone. Then you can simply
navigate to the directory and view the DCIM folder, etc.

You do not need the ``fuse`` group on Fedora. If you mount the directory as root, you will
not be able to navigate to the folder as your user. Easiest way to check if you mounted as
the wrong user is if you see question marks with ``ls``.

For tethering, you need the ``ipheth`` module, which you can load with ``modprobe``.

Make sure that you chose to tether via USB and not Bluetooth. Then the iphone should appear
as a network connection in Network Manager.
