dnf
^^^

dnf comes with `plugins
<https://dnf-plugins-extras.readthedocs.io/en/latest/index.html>`_ that some
people are not aware of. Tracer allows you to see what applications need
restarting after upgrading packages. This is necessary to ensure stability of
your system. Otherwise you may experience weird behavior or crashing overtime.
Sometimes if there's too many applications or critical applications to restart
you should just reboot your system, otherwise tracer can tell you which
applications to restart.

First, install `dnf-plugins-extras-tracer`. Then the next time you upgrade your
packages you should see output like:

.. code-block:: none

    You should restart:
      * Some applications using:
          sudo systemctl restart NetworkManager

      * These applications manually:
          dnf
          firefox
          pipewire-media-session

    For more information run:
        sudo tracer -iat 1624024025.9470344

You can run the command shown above to ensure nothing else needs to be
restarted.
