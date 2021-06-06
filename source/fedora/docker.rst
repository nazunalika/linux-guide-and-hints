Docker
^^^^^^

Changing the data directory
---------------------------

By default on Fedora, the directory Docker stores data in (images, etc.) is ``/var/lib/docker``.
Rather than changing the systemd service file, you can simply create ``/etc/docker/daemon.json``::

   {
       "graph": "/mnt"
   }
   
.. note::

   This page previously recommended setting the storage driver. If it's specified in both the config file
   and as a flag (as it is in recent versions of Fedora), Docker will fail to start.

   ``/mnt`` should point to the root directory. For example, if you specify ``/mnt/docker``, the final
   path is ``/mnt/docker/docker``.

To ensure that the directory has the proper selinux contexts (not doing so will result in obscure errors),
you can copy over the directory structure by doing:

.. code-block:: bash

    cp -aR /var/lib/docker /path/to/new/directory

After that, reload the changes (it may be a good idea to delete or backup the old directory):

.. code-block:: bash

   systemctl daemon-reload
   systemctl restart docker

After that, you can view ``docker info`` to verify your changes.

Credit goes to `Piotr Król's StackOverflow answer <https://stackoverflow.com/a/34731550>`_. 

Podman
------

Although it is difficult to move away from Docker due to many projects relying
on it, we generally recommend using `podman <https://podman.io/>`_ instead. It
has a Docker compatible CLI, is daemonless and allows running the containers
without root privileges. While Docker has a rootless mode now, it is
experimental and a hacky workaround. For a ``docker-compose`` alternative, see
`podman-compose <https://github.com/containers/podman-compose>`_.

Why does it matter? Docker's security model is inherently flawed. Anyone in the
docker group for all intents and purposes has "root" privileges and complete
access to the socket.  Many tools also recommend you mount the docker socket
within a container (which is terribly insecure), but developers are willing to
take this security risk to make their lives a little easier. [#f1]_

There is a podman wrapper called `Toolbox
<https://fedoramagazine.org/a-quick-introduction-to-toolbox-on-fedora/>`_ that
allows you to transparently spin up containers as a scratch space. For example,
you might want to build a project from source without polluting your system
with ``devel`` packages.

.. rubric:: Footnotes

.. [#f1] See
   https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
   and https://github.com/containrrr/watchtower.
