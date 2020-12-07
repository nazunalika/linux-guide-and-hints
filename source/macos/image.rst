Create macOS ISO Images
^^^^^^^^^^^^^^^^^^^^^^^

To create macOS ISO images for use for a VirtualBox VM or otherwise, you will need access to a mac machine to perform the download. There are scripts and other methods out there to assist you with this, but if you want to do it yourself, you can follow the steps below.

This is currently for macOS Catalina 10.15.x

.. code:: shell

   % softwareupdate --fetch-full-installer --full-installer-version 10.15.6
   % hdiutil create -o /tmp/catalina.cdr -size 7516m -layout SPUD -fs HFS+J
   % hdiutil attach /tmp/catalina.cdr.dmg -noverify -nobrowse -mountpoint /Volumes/installer
   % asr restore -source /Applications/Install\ macOS\ Catalina.app/Contents/SharedSupport/BaseSystem.dmg -target /Volumes/installer -noprompt -noverify -erase
   % hdiutil detach /Volumes/macOS\ Base\ System
   % hdiutil convert /tmp/catalina.cdr.dmg -format UDTO -o /tmp/Catalina.iso

You can now copy the ISO to anywhere you'd like.
