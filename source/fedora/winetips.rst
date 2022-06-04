Wine Tips
^^^^^^^^^

Out of memory errors
--------------------

This seems to affect multiple games. For example, in Resident Evil Remaster you
might see "ERR08: memory overrun". For non-DRM games, you can try using the
`4gb patch <http://www.ntcore.com/4gb_patch.php>`_ or equivalent "Large Address
Awareness" patches. For DRM games (like found on Steam), you'll need a
patch/mod with specific support (i.e, this is the case for Fallout).

If you are willing to `compile Wine from source
<https://wiki.winehq.org/Building_Wine>`_, use this `patch
<https://bugs.winehq.org/attachment.cgi?id=53156>`_ by Gabriel Corona that will
enable LAA across the board.

In Proton, LAA is enabled by default.

New Vegas
---------

Modding
*******

For a comprehensive modding guide, see `Viva New Vegas
<https://vivanewvegas.github.io/>`_.

Furthermore, see their page on `mods to avoid
<https://vivanewvegas.github.io/avoid-mods.html>`_.

You will need to install vc2019 but currently proton has trouble installing it.
You need to install it with regular wine by doing:

.. code-block:: bash

    env WINEPREFIX="/path/to/steam/steamapps/compatdata/22380/pfx" winetricks vcrun2019

While I would normally recommend Mod Organizer 2, it has issues on Linux so I
will instead discuss alternatives.

While .NET is not required to run MO itself, it is required for the scripted
installers. Mods will not install properly if their scripted installers don't
run, even if you don't "require" them.

As a workaround, you can use A.J. Venter's `movfs4l script
<https://github.com/ajventer/ksp_stuff/blob/master/movfs4l.py>`_. Modify the
variables to point to the correct directories, then run it with
``WINEPREFIX=... python movfs4l.py``. Since Mod Organizer will pick up the
symlinks (and display them as redundant unmanaged mods), you should run
``python movfs4l.py UNVFS`` prior to opening Mod Organizer, then rerun the
script without arguments after closing Mod Organizer.

Another alternative is the `FalloutNVLinuxLauncher
<https://github.com/neVERberleRfellerER/FalloutNVLinuxLauncher>`_. This script
uses `OverlayFS <https://en.wikipedia.org/wiki/OverlayFS>`_ to merge mods and
mount the result. The instructions are a little confusing, so these notes
should be used in addition to the README.

First install Fallout New Vegas somewhere. Then create a ``mods`` directory
(place it anywhere you like) and rename the directory to `9999 Fallout New
Vegas` like so:

.. code-block:: bash

    mods/
    ├── data
    │   ├── 9999 Fallout New Vegas

Modify the script and set ``ROOTDIR`` to the parent directory of where you want
the mounted directory and ``MERGERDIR`` to the name of the mounted directory.
For example, if you're using Steam:

.. code-block:: bash

    ROOTDIR="/path/to/steam/steamapps/common/"
    MERGERDIR="$ROOTDIR/Fallout New Vegas"

All mods need to go into ``MODDATADIR`` instead of ``MODDIR``. That is, the
tree would look like:

.. code-block:: bash

    mods/
    ├── data
    │   ├── 0010 JIP LN NVSE
    │   ├── 9999 Fallout New Vegas
    │   └── 9999 Fallout New Vegas.order

The script will warn you about mixed-case files, but doesn't rename them. As a
result, things can break when mods do not get merged.  Install ``prename``,
then run this from your ``mods`` folder:

.. code-block:: bash

    find . -depth -execdir prename 'y/A-Z/a-z/' '{}' \;

Then launch the game with:

.. code-block:: bash

    bash FONVLaunchInMerged.sh steam steam://rungameid/22380

If you run into issues, delete the ``_overlay_`` and ``_mods`` folder.

The merged game files will be mounted in
``/path/to/steam/steamapps/common/Fallout New Vegas``. After you close Steam,
the merged directory will be unmounted. In order to test that it is actually
working, install the JIP LN NVSE mod and type ``GetIsLAA`` in the console. You
should get some output.

The script will also create a ``loadorder.txt`` file inside
``$MERGERDIR/data``. However, FONV actually reads the ``esp`` and ``esm`` files
to load from ``plugins.txt``. Locate it, then create a symlink, i.e:

.. code-block:: bash

    # The following path may be different on your system
    cd /path/to/Local Settings/Application Data/FalloutNV
    ln -s "/path/to/Fallout New Vegas/data/loadorder.txt" plugins.txt

LOOT
****

If none of the mod organizers work, then you can use the much simpler `Load
Order Optimization Tool <https://loot.github.io/>`_.  You will need to install
and uninstall mods manually, but LOOT will help organize your ``plugins.txt``
file. Note that this file is located in ``users/your_username/Local
Settings/Application Data/FalloutNV/``.

GMDX
----

If you are using GMDX (Deus Ex mod), you may need to edit
``/home/user/Documents/Deus Ex/System/GMDX.ini`` in order for it to work
properly.  Under ``[Core.System]`` replace all of the ``Paths`` entries with:

.. code-block:: ini

    Paths=..\New Vision\Textures\*.utx
    Paths=..\GMDXv9\Maps\*.dx
    Paths=..\GMDXv9\Music\*.umx
    Paths=..\GMDXv9\System\*.u
    Paths=..\GMDXv9\Textures\*.utx
    Paths=..\HDTP\System\*.u
    Paths=..\HDTP\Textures\*.utx
    Paths=..\Music\*.umx
    Paths=..\Sounds\*.uax
    Paths=..\Textures\*.utx
    Paths=..\Maps\*.dx
    Paths=..\System\*.u

Proton
------

If you use Steam, you can play games using Steam Play, which uses `Proton
<https://github.com/ValveSoftware/Proton/>`_. Proton incorporates both Wine and
DXVK to allow you to play Windows games without doing any tinkering out of the
box.

Proton can either be obtained by installing a Steam Play enabled game or
standalone in the **Tools** section. In the library pane, select the **Games**
dropdown and change it to **Tools**. Then scroll down until you find Proton.

.. figure:: /_static/img/proton.png
    :alt: Installing the standalone version of Proton.

Once that's done, locate the Proton directory. It will look something like
``steam/steamapps/common/Proton 3.7``, where ``steam`` is located in one of
your Steam download libraries.

Alternatively, you can install a fork of Proton called `Proton-GE
<https://github.com/GloriousEggroll/proton-ge-custom>`_. Download the tarball
and unzip it to `$HOME/.local/share/Steam/compatibilitytools.d/`. After you
restart Steam, it should show up when you select a custom Steam Play tool.

If you need to enable logging, go to any Proton installation directory and move
``user_settings.sample.py`` to ``user_settings.py``.

wine-ge
*******

It is not recommended to use Proton for games outside of Steam. It is
recommended to use Lutris with wine-ge instead. See `this thread for details
<https://old.reddit.com/r/linux_gaming/comments/uzrz2k/a_thread_about_using_protonge_and_winege_builds/>_`.

mf_install
**********

As of Proton-6.1-GE2 I've found that some games still need the `Media
Foundation workaround <https://github.com/z0z0z/mf-install>`_ for cutscenes and
movies (Bulletstorm is one of them). In fact, Proton-GE doesn't have the verb
at all anymore. However, the default installation instructions don't work.

Simply run:

.. code-block:: bash

    PROTON="/path/to/proton/directory" WINEPREFIX="/path/to/prefix" ./mf-install.sh -proton

If needed for wine-ge, one can lookup the respective Steam AppID in protonfixes
and then run the respective verb for winetricks in Lutris.

proton-caller
*************

As stated above, it is not recommended to run Proton outside of Steam, even
when using proton-ge, so it can be a little tricky. There is a program called
`proton-caller <https://github.com/caverym/Proton-Caller/>`_ that does the job
and it tries to run the commands within the Steam runtime. However, it is
inflexible and contains a number of bugs.
