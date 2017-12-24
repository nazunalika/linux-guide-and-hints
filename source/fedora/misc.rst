Misc
^^^^

Using ``LD_LIBRARY_PATH`` in Fish
---------------------------------

There are a few issues regarding the lack of ``LD_LIBRARY_PATH`` for Fish such as `weird LD_LIBRARY_PATH behavior #2456 <https://github.com/fish-shell/fish-shell/issues/2456>`_ where the developers have stated that they won't add support for it. Putting ``env LD_LIBRARY_PATH`` before a command works, but something like ``set -gx LD_LIBRARY_PATH ... $LD_LIBRARY_PATH`` in your config file does not work as intended. The workaround is to add this *after* your normal set invocation:

.. code-block:: shell

    set -xg LD_LIBRARY_PATH (printf '%s\n' $LD_LIBRARY_PATH | paste -sd:)

The solution credit goes to `lucasb-eyer <https://github.com/lucasb-eyer>`_.


Failed to start Load Kernel Modules
-----------------------------------

Error still persists after uninstalling VirtualBox
++++++++++++++++++++++++++++++++++++++++++++++++++

``journalctl`` shows that you still get ``could not insert vboxdrv`` errors. Run ``dracut -v -f`` then restart your computer.

Unable to find ``LibLZMA``
--------------------------

Try installing ``xz-libs`` and ``xz-devel``. For some reason, the maintainers have changed the name from `LZMA Utils to XZ Utils <https://tukaani.org/xz/>`_.

Unable to find ``wxWidgets``
----------------------------

For some reason, for some projects that depend on GTK2, installing ``wxGTK`` isn't sufficient. You also need ``compat-wxGTK3-gtk2`` (and the ``-devel`` packages if necessary).
