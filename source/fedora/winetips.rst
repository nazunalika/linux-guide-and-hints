Wine Tips
^^^^^^^^^

Out of memory errors
--------------------

This seems to affect multiple games. For example, in Resident Evil Remaster you might see "ERR08: memory overrun". For non-DRM games, you can try using the `4gb patch <http://www.ntcore.com/4gb_patch.php>`_ or equivalent "Large Address Awareness" patches. For DRM games (like found on Steam), you'll need a patch/mod with specific support (i.e, this is the case for Fallout). 

If you are willing to `compile Wine from source <https://wiki.winehq.org/Building_Wine>`_, use this `patch <https://bugs.winehq.org/attachment.cgi?id=53156>`_ by Gabriel Corona that will enable LAA across the board.

New Vegas
---------

Installing via Wine
*******************

.. note::

    New Vegas works perfectly with Proton/Steam Play (except you may need to
    disable HDR/water reflections due to graphical glitches.) However, I'm
    preserving this section if for whatever reason you choose to use vanilla
    Wine.

If you are using the GOG version, it already comes prepatched with 4GB support.

- Use a 32-bit prefix

- Change the following settings via winetricks:

  - Set renderer to OpenGL
  - Set video card memory to your video card's memory, obviously
  - Disable multisampling

- Enable CSMT via winecfg

- You can set the Windows version to 7, but probably won't matter

- Install via winetricks:

  - mfc42
  - d3dx9_36.dll
  - Physx
  - quartz
  - l3codecx (mp3)
  - xinput (required for a mod)
  - .NET 4.6.2 (required for Mod Organizer to work properly)
  - Steam. New Vegas requires steam activation, and mods will assume you have the
    Steam version. You only need Steam to be running in the background, but you can
    launch the game via Mod Organizer.
  - d3dcompiler_43 (if you are using ENB)

- Set the following overrides via winecfg:
  
  - d3dx9_36 (native). Already done for you
  - quartz (native). Already done for you
  - winegstreamer (disabled). To prevent crashing
  - nvcuda (native, built-in). To allow Physx to work
  - gameoverlayrenderer (disabled). To prevent crashing. Already done if you installed Steam

If you enable the ``nvcuda`` override, you must install ``nvidia-driver-cuda-libs.i686``.

That's all you need to run the game. Anything else is your discretion though I
wouldn't install or change anything else unless you're certain it's related to
crashing or performance.

If you are using `ENB <http://enbdev.com/>`_, make sure to patch the following executables for 4GB support:

.. code-block:: bash

    nvse_loader.exe
    enbhost.exe

Alternatively, you can use the `FNV 4GB Patcher
<https://www.nexusmods.com/newvegas/mods/62552/?>`_. This should not only apply
the 4gb patch, but allow you to launch the game through Steam. Note that since
Steam runs the launcher, any changes you make to ``Fallout.ini`` can be
overwritten. A workaround is to rename ``nvse_loader.exe`` to
``FalloutNVLauncher.exe``.

.. note::

    Reportedly, making ``Fallout.ini`` read-only should work, but it doesn't for me. YMMV.

Then launch ``nvse_loader.exe`` with the environment variable ``WINEDLLOVERRIDES="d3d9.dll=n,b"``.

When using ENB and Proton, you must install the DirectX9 DLL's. Example:

.. code-block:: bash

    env WINEPREFIX="/path/to/proton/pfx" winetricks d3dx9 d3dcompiler_43

Make sure to set ``d3d9.dll=n,b`` as above.

Modding
*******

I recommend using `Mod Organizer <https://www.nexusmods.com/skyrimspecialedition/mods/6194>`_ 
as opposed to NMM or FOMM. I cannot get NMM to work and FOMM seems to be quite glitchy.
Either way, MO will support mods targeted towards NMM or FOMM, and if that doesn't work
has a intuitive interface for manual installation. It's still through the interface,
so you are not polluting your game directory.

You need `NVSE <http://nvse.silverlock.org/>`_. Extract the contents to the same
level as your game's executable.

Then either use the 4GB loader, of which there are plenty around, or use this `4GB patch <http://www.ntcore.com/4gb_patch.php>`_.
Patch the game executable. It'll automatically create a backup. You will know
this is working if you stop receiving "out of memory" crashes.

Some necessary mods are:

- `New Vegas Anti Crash <http://www.nexusmods.com/newvegas/mods/53635/?>`_. It will prevent
  many crashes, but not all. Always check ``nvac.log`` to see the cause of the crash. If it's
  something like ``u`` or ``m``, there's basically nothing that can be done about it. In other
  words, if you only see crashes of this nature, NVAC is doing its job.

- `New Vegas Stutter Remover <http://www.nexusmods.com/newvegas/mods/34832/?>`_. Do not use the heap replacer.

- `New Vegas Tick Fix <https://www.nexusmods.com/newvegas/mods/66537>`_. A stripped down version of NVSR. Do not use the two together.

Mod Organizer
*************

While .NET is not required to run MO itself, it is required for the scripted installers. Mods will not install
properly if their scripted installers don't run, even if you don't "require" them.

As a workaround, you can use A.J. Venter's `movfs4l script <https://github.com/ajventer/ksp_stuff/blob/master/movfs4l.py>`_. Modify the variables to
point to the correct directories, then run it with ``WINEPREFIX=... python movfs4l.py``. Since Mod Organizer will pick up the symlinks (and display them as
redundant unmanaged mods), you should run ``python movfs4l.py UNVFS`` prior to opening Mod Organizer, then rerun the script without arguments after closing
Mod Organizer.

Another alternative is the `FalloutNVLinuxLauncher
<https://github.com/neVERberleRfellerER/FalloutNVLinuxLauncher>`_. This script
uses `OverlayFS <https://en.wikipedia.org/wiki/OverlayFS>`_ to merge mods and
mount the result. The instructions are a little confusing, so these notes
should be used in addition to the README.

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

This requires that you move and rename your game installation dir. The script
will warn you about mixed-case files, but doesn't rename them. As a result,
things can break when mods do not get merged.  Install ``prename``, then run
this from your ``mods`` folder:

.. code-block:: bash

    find . -depth -execdir prename 'y/A-Z/a-z/' '{}' \;

Then launch the game with:

.. code-block:: bash

    bash FONVLaunchInMerged.sh steam steam://rungameid/22380

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

If none of the mod organizers work, then you can use the much simpler `Load Order Optimization Tool <https://loot.github.io/>`_. 
You will need to install and uninstall mods manually, but LOOT will help organize your ``plugins.txt`` file. Note that this file is located in
``users/your_username/Local Settings/Application Data/FalloutNV/``.

Lutana NVSE
***********

.. note::

    Lutana has been merged into JIP.

This is a prerequisite of CASM. Even if you don't use a controller, one of its script functions depends on
``xinput.dll``. You need to install that via winetricks to prevent crashing. The error would look like:

.. code-block:: bash

    err:seh:raise_exception Unhandled exception code c0000005 flags 0 addr 0x14b01645

.ini modifications
******************

In order to disable mouse acceleration, place this in ``Fallout.ini``:

.. code-block:: ini

    [Controls]
    fForegroundMouseAccelBase=0
    fForegroundMouseAccelTop=0
    fForegroundMouseBase=0
    fForegroundMouseMult=0

If you are using the Archive Invalidation mod, also place this in ``Fallout.ini``:

.. code-block:: ini

    [Archive]
    SInvalidationFile=
    iRetainFilenameOffsetTable=1
    iRetainFilenameStringTable=1
    iRetainDirectoryStringTable=1
    bCheckRuntimeCollisions=0
    bInvalidateOlderFiles=1
    bUseArchives=1
    SArchiveList=Fallout - Voices1.bsa, Fallout - Sound.bsa, Fallout - Misc.bsa, ArchiveInvalidationInvalidated!.bsa, Fallout - Textures.bsa, Fallout - Textures2.bsa, Fallout - Meshes.bsa 

In order to reduce stuttering when using ENB, modify ``enblocal.ini`` like so:

.. code-block:: ini

    ExpandSystemMemoryX64=false
    ReduceSystemMemoryUsage=false
    DisablePreloadToVRAM=false
    EnableUnsafeMemoryHacks=false
    ReservedMemorySizeMb=...
    VideoMemorySizeMb=...
    EnableCompression=false
    AutodetectVideoMemorySize=false

These options either should not be set to true (except in rare or for debugging cases) or are designed to reduce memory footprint at a significant cost
to performance. ``ReservedMemorySizeMb`` should be a small value in multiples of ``128`` and ``VideoMemorySizeMb`` should be set to whatever the ENB
`VRam size tool <http://enbdev.com/download_vramsizetest.htm>`_ gives you minus 170~. While this may not necessarily improve FPS, it will get rid of stuttering,
particularly when turning or opening the pipboy. Finally, if you are having transparency issues (i.e, in Camp Golf) set ``FixTransparencyBugs=false``.

GMDX
----

If you are using GMDX (Deus Ex mod), you may need to edit ``/home/user/Documents/Deus Ex/System/GMDX.ini`` in order for it to work properly.
Under ``[Core.System]`` replace all of the ``Paths`` entries with:

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

DirectX11 games
---------------

If you are having rendering issues in D3D11 games (such as black screens/textures), then you may need to use `DXVK <https://github.com/doitsujin/dxvk>`_, a Vulkan-based
D3D11 implementation. There are three ways of obtaining it. You can either use `Winetricks <https://github.com/Winetricks/winetricks>`_, download the latest `binary release <https://github.com/doitsujin/dxvk/releases>`_ or attempt to compile it. The ``wine-dxvk`` package is also available.

In order to compile it, you need to install the following dependencies:

.. code-block:: bash

   dnf install mingw64-gcc mingw64-gcc-c++ mingw32-winpthreads-static mingw64-winpthreads-static meson glslang

It's important that you install the static packages for pthreads or the compilation will fail. Then run (from the README):

.. code-block:: bash

   # 64-bit build. For 32-bit builds, replace
   # build-win64.txt with build-win32.txt
   meson --cross-file build-win64.txt --prefix /your/dxvk/directory build.w64
   cd build.w64
   meson configure
   # for an optimized release build:
   meson configure -Dbuildtype=release
   ninja
   ninja install

But add ``-Denable_tests=true`` in order to build the demo programs. Finally, you need a copy of ``d3dcompiler_47.dll`` which you can get from the redist of certain programs,
such as `this one <https://raw.githubusercontent.com/ImagingSIMS/ImagingSIMS/master/Redist/x64/d3dcompiler_47.dll>`_ (or use winetricks).

When launching the program, use the following overrides:

.. code-block:: bash

   WINEDLLOVERRIDES="d3d11.dll=n;d3dcompiler_47.dll=n;dxgi.dll=n"

Proton
------

If you use Steam, you can play games using Steam Play, which uses `Proton <https://github.com/ValveSoftware/Proton/>`_. Proton incorporates both Wine and DXVK to allow you to play Windows games without doing any tinkering out of the box.

Proton can either be obtained by installing a Steam Play enabled game or standalone in the **Tools** section. In the library pane, select the **Games** dropdown and change it to **Tools**. Then scroll down until you find Proton.

.. figure:: /_static/img/proton.png
    :alt: Installing the standalone version of Proton.

Once that's done, locate the Proton directory. It will look something like ``steam/steamapps/common/Proton 3.7``, where ``steam`` is located in one of your Steam download libraries. You can directly invoke the Proton binary to use it for non-steam games. For example:

.. code-block:: bash

   env STEAM_COMPAT_DATA_PATH=$PATH_TO_STEAM_LIBRARY/steam/steamapps/compatdata/$APP_ID $PATH_TO_STEAM_LIBRARY/steam/steamapps/common/Proton\ 3.7/proton run "some_game.exe"

``$APP_ID`` will be the value of whatever game you installed with Steam Play. For a performance boost, you should **not** disable ``ESYNC``. This will require that you `change your ulimit <https://github.com/lutris/lutris/wiki/How-to:-Esync>`_. If you cannot get that working, then set the ``PROTON_NO_ESYNC=1`` environment variable.

You can have Proton generate a prefix for you. Create a directory, touch the ``pfx.lock`` file then point ``STEAM_COMPAT_DATA_PATH`` to it. The prefix will be generated in ``pfx``.

.. note::

   The latest version of systemd has upped the hard limit to 524288, but the soft limit remains at 1024. However, when you start a game with Proton, the process should automatically up the soft limit as required.    So you do not need to change anything. You can verify the ulimit of any process with ``prlimit --pidof=...``.

.. note::

    ``compatdata/$APP_ID/pfx`` is the Wine prefix for each game and you can interact with it just like any other Wine prefix:

    .. code-block:: bash

        env WINEPREFIX="/path/to/$APP_ID/pfx" winecfg

    If you use Proton, omit the ``pfx`` suffix:

    .. code-block:: bash

        env STEAM_COMPAT_DATA_PATH="/path/to/$APP_ID" proton run # ...
