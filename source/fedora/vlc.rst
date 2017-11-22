VLC
^^^

QT 5.6 Interface DPI
--------------------

If your DPI is messed up, that is, all of the icons/text look distorted and the video size does not adjust itself properly, 
then you are victim of ``Qt::AA_EnableHighDpiScaling``. This is a hardcoded setting in the 
`VLC source code <https://github.com/videolan/vlc/commit/a4b9ccf1007827a364e1dc44a462187bab960459>`_. While you can patch it,
one way to disable it is to use the ``QT_AUTO_SCREEN_SCALE_FACTOR=0`` environment variable.

VDPAU decoding (hardware acceleration)
--------------------------------------

See Misc Fedora 24 issues.
