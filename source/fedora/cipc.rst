Cisco IP Communicator
^^^^^^^^^^^^^^^^^^^^^

Cisco IP Communicator is a SoftPhone for VOIP communications. Mainly
used for Corporations that have Cisco desk phones or users who are
remote. The issue is that Cisco Jabber, a SIP client, nor the IP
Communicator have Linux versions. Wine will work, but it's normally
troublesome to setup or get it working correctly. There were various
issues:

.. note:: Issues

   * Moving the Window would crash the application
   * After a crash, it was near impossible to get it to open back up
   * There was a horrendous noise crackling issue (much like with Skype)
   * (VPN/Network) Calls would result in no sound

Installing via PlayOnLinux
--------------------------

1. Install PlayOnLinux

2. Open PlayOnLinux, install a non-listed program

3. Select all boxes: Use another version of Wine (only if you want to try another version), Configure Wine, Install some libraries

4. Use the system wine first. You can try another version if you'd like.

5. Configure Wine -> Override libraries for crypt32, run as Windows XP

6. Install some libraries -> POL_Function_OverrideDLL, POL_Install_corefonts, POL_Install_crypt32, POL_Internal_InstallFonts

7. Install the application normally by selecting the msi.

8. It will crash at the end. This is normal.

9. Make a shortcut for communicatork9.

10. Run the program normally. It will try a audio tuning wizard. This should succeed. If you hear crackling, this is OK.

11. Configure your phone as necessary.

Installing via Regular Wine
---------------------------

Most of the steps used for PlayOnLinux can be done in a regular wineprefix. Ensure corefonts is at least done.

Pulse Audio
-----------

Many VOIP applications have a sound crackling issue. Skype is no exception. 
In a different part of this guide, there is a trick to making Skype be OK. 
However, that's for Skype. To fix it system wide, we can do this.

.. code-block:: bash

   # sed -i.bak ’/load-module module-udev-detect/ s/$/ tsched=0/’ /etc/pulse/default.pa

Killing pulseaudio or restarting your system will allow this to take affect.

The result.

.. code-block:: none

   ### Automatically load driver modules depending on the hardware available
   .ifexists module-udev-detect.so
   load-module module-udev-detect tsched=0
   .else

