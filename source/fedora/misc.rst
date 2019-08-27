Misc
^^^^

Using ``LD_LIBRARY_PATH`` in Fish
---------------------------------

There are a few issues regarding the lack of ``LD_LIBRARY_PATH`` for Fish such as `weird LD_LIBRARY_PATH behavior #2456 <https://github.com/fish-shell/fish-shell/issues/2456>`_ where the developers have stated that they won't add support for it. Putting ``env LD_LIBRARY_PATH`` before a command works, but something like ``set -gx LD_LIBRARY_PATH ... $LD_LIBRARY_PATH`` in your config file does not work as intended. The workaround is to add this *after* your normal set invocation:

.. code-block:: shell

    set -xg LD_LIBRARY_PATH (printf '%s\n' $LD_LIBRARY_PATH | paste -sd:)

The solution credit goes to `lucasb-eyer <https://github.com/lucasb-eyer>`_.

Unable to find ``LibLZMA``
--------------------------

Try installing ``xz-libs`` and ``xz-devel``. For some reason, the maintainers have changed the name from `LZMA Utils to XZ Utils <https://tukaani.org/xz/>`_.

Unable to find ``wxWidgets``
----------------------------

For some reason, for some projects that depend on GTK2, installing ``wxGTK`` isn't sufficient. You also need ``compat-wxGTK3-gtk2`` (and the ``-devel`` packages if necessary).

Update all repositories in the current directory
------------------------------------------------

Two use-cases for this are updating vim plugins or golang packages. `Zarat <https://stackoverflow.com/users/578323/zarat>`_ at StackOverflow suggests this:

.. code-block:: bash

   find . -mindepth 1 -maxdepth 1 -type d -print -exec git -C {} pull \;

If you are using the Fish shell, you need to quote the brackets, `'{}'`. See `issue #95 <https://github.com/fish-shell/fish-shell/issues/95>`_.

YouCompleteMe crashes due to ``libtinfo.so`` version mismatch
-------------------------------------------------------------

As pointed out by pdavydov108 in `YouCompleteMe issue #778 <https://github.com/Valloric/YouCompleteMe/issues/778#issuecomment-228704671>`_, the fix is to install ``ncurses-compat-libs``. Fedora comes with ``libtinfo.so.6``, however, the version of Clang required by YouCompleteMe has a dependency on ``libtinfo.so.5``. 

KeePassHttp no longer works
---------------------------

If you were using `keepasshttp-connector <https://github.com/smorks/keepasshttp-connector>`_ it is now deprecated in favor of `keepassxc-browser <https://github.com/keepassxreboot/keepassxc-browser>`_. Install smorks' `keepassnatmsg <https://github.com/smorks/keepassnatmsg>`_ plugin for compatibility with normal KeePass (instead of KeePassXC).

Disable TCP/IP and use sockets for MySQL
----------------------------------------

On Linux, MySQL will create a socket in a location defined by the ``socket`` variable found in ``/etc/my.cnf``. For example, the value may be ``/usr/lib/mysql/mysql.sock``. However, by default, it will still listen on a TCP port, which may be undesirable if you don't plan on exposing your server to the Internet. Simply add ``skip-networking`` to ``/etc/my.cnf``.

SELinux is preventing ``abrt-action-sav`` from write access on the directory /var/lib/rpm
-----------------------------------------------------------------------------------------

If you are receiving this error or a similar one involving ``dbenv.lock``, it means that your ``/var/lib/rpm`` directory has the wrong SELinux contexts applied to it. Verify this with ``ls -alZ /var/lib/rpm/``. You should see files/directories with the ``var_lib_t`` rather than ``rpm_var_lib_t`` label. This may be the result of `bug #1461313 <https://bugzilla.redhat.com/show_bug.cgi?id=1461313>`_ where running ``rpm --rebuilddb`` will set the wrong context on the entire directory. Fix it by running ``sudo restorecon -rv /var/lib/rpm``.

Swapping Desktop Environments
-----------------------------

It is a common question, especially in the IRC channel #fedora on how to remove gnome, after say, installing XFCE or maybe KDE. The one answer that not a lot of people provide (or may not know works) is using ``dnf swap``.

.. code-block:: bash

   # Example: Swapping from GNOME to KDE
   $ sudo init 3
   $ sudo dnf swap @gnome-desktop @kde-desktop

   # Example: Swapping from GNOME to XFCE
   # Note that xfce-desktop does exist, but it is missing a few pieces.
   $ sudo init 3
   $ sudo dnf swap @gnome-desktop @xfce-desktop-environment

This will safely swap the package groups from one to the next, the gnome desktop environment with the kde environment. It is recommended that it is ran in multi-user.target (or init level 3 for those who remember). When the swap is complete, reboot.

Upon logging into XFCE, desktop freezes until you switch to another TTY
-----------------------------------------------------------------------

If you have ``FullCompositionPipeline`` enabled in Nvidia settings, you may run into this problem. This is a long standing bug, see `#14950 <https://bugzilla.xfce.org/show_bug.cgi?id=14950>`_. The solution is to either edit or delete `$HOME/.config/xfce4/xfconf/xfce-perchannel-xml/displays.xml`. Use a different mechanism for setting up your displays.
