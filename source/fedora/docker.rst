Docker
^^^^^^

Changing the data directory
---------------------------

By default on Fedora, the directory Docker stores data in (images, etc.) is ``/var/lib/docker``.
Rather than changing the systemd service file, you can simply create ``/etc/docker/daemon.json``::

   {
       "graph": "/mnt",
       "storage-driver": "overlay2"
   }
   
.. note::

   ``overlay2`` should be replaced with whatever is shown in ``docker info``.

   ``/mnt`` should point to the root directory. For example, if you specify ``/mnt/docker``, the final
   path is ``/mnt/docker/docker``.

After that, reload the changes (it may be a good idea to delete or backup the old directory):

.. code-block:: bash

   systemctl daemon-reload
   systemctl restart docker

After that, you can view ``docker info`` to verify your changes.

Credit goes to `Piotr Król's StackOverflow answer <https://stackoverflow.com/a/34731550>`_. 
