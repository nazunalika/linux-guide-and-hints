Wine Tips
^^^^^^^^^

Out of memory errors
--------------------

This seems to affect multiple games. For example, in Resident Evil Remaster you might see "ERR08: memory overrun". For non-DRM games, you can try using the `4gb patch <http://www.ntcore.com/4gb_patch.php>`_ or equivalent "Large Address Awareness" patches. For DRM games (like found on Steam), you'll need a patch/mod with specific support (i.e, this is the case for Fallout). 

If you are willing to `compile Wine from source <https://wiki.winehq.org/Building_Wine>`_, use this `patch <https://bugs.winehq.org/attachment.cgi?id=53156>`_ by Gabriel Corona that will enable LAA across the board.

New Vegas
---------

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
  - .NET 3.5 (required for Mod Organizer to work properly)
  - Steam. New Vegas requires steam activation, and mods will assume you have the
    Steam version. You only need Steam to be running in the background, but you can
    launch the game via Mod Organizer.

- Set the following overrides via winecfg:
  
  - d3dx9_36 (native). Already done for you
  - quartz (native). Already done for you
  - winegstreamer (disabled). To prevent crashing
  - nvcuda (native, built-in). To allow Physx to work
  - gameoverlayrenderer (disabled). To prevent crashing. Already done if you installed Steam

That's all you need to run the game. Anything else is your discretion though I
wouldn't install or change anything else unless you're certain it's related to
crashing or performance.

If you are using `ENB <http://enbdev.com/>`_, make sure to patch the following executables for 4GB support:

.. code-block:: bash

    nvse_loader.exe
    enbhost.exe

Then launch ``nvse_loader.exe`` with the environment variable ``WINEDLLOVERRIDES="d3d9.dll=n,b"``. 

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

Mod Organizer
*************

While .NET is not required to run MO itself, it is required for the scripted installers. Mods will not install
properly if their scripted installers don't run, even if you don't "require" them.

.. note::

    .NET installation via ``winetricks`` seems to be broken at the moment. See `issue #810 <https://github.com/Winetricks/winetricks/issues/810>`_.

.. warning::

    Mod Organizer seems to be broken at the moment. See this `wine bug report <https://bugs.winehq.org/show_bug.cgi?id=44880>`_.

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
