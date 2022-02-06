BTRFS
^^^^^

By default Fedora now uses BTRFS instead of EXT4. While you can convert your
system from EXT4 to BTRFS, we recommend doing a clean install instead.

At the time of writing, Fedora does not provide any services for automatic
scrubs. Doing so is simple however:

.. code-block:: bash

    sudo btrfs scrub start -B (df --output=source / | tail -n 1)

And you can stick it in a crontab or systemd timer if you want.

If you need to run a check, the filesystem should be unmounted. It is not
recommended to use ``btrfs check --repair`` without consulting someone else
first. If running from a live CD, the commands will probably look something
like:

.. code-block:: bash

    sudo cryptsetup luksOpen /dev/sdaX myvolume
    sudo btrfs check -p /dev/mapper/myvolume

If you see diagnostics about the free space cache, then you can run:

.. code-block:: bash

    sudo btrfs check --clear-space-cache v1 /dev/mapper/myvolume

v1 is currently the default, however, replace with v2 if necessary.
