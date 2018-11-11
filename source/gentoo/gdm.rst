GDM
^^^

GDM doesn't start up
--------------------

If you are using systemd, check ``journalctl``. If you see messages of the nature:

.. code-block:: bash

   gdm[4607]: Child process -4635 was already dead.
   gdm[4607]: Child process 4619 was already dead.
   gdm[4607]: Unable to kill session worker process

Then you are likely suffering from `bug #669146 <https://bugs.gentoo.org/669146#c2>`_.
For some reason, folders created by GDM at runtime do not have the correct permissions. To fix the issue:

.. code-block:: bash

   # Replace .local/share with the problematic directory
   chown -R gdm:gdm /var/lib/gdm/.local/share

You may also need to disable Wayland. Edit ``/etc/gdm/custom.conf``:

.. code-block:: bash

   WaylandEnable=false
