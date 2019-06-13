MinGW
^^^^^

To my knowledge, the best MinGW distribution is provided by Stephan T. Lavavej
(a Microsoft employee who works on the C++ team) and is available on `his site
<https://nuwen.net/mingw.html>`_. It contains mingw-w64, GCC and binutils,
coreutils and several other libraries and command line utilities (including
git). Installation simply requires extracting to any location and using the
provided bat files to open a command prompt with a preset PATH.

Why not use WSL?
----------------

They serve different purposes. The MinGW distribution contains Windows
**ports** of GCC, coreutils, etc. that run natively on Windows. On the other
hand, WSL attempts to allow you to run native Linux binaries on Windows. WSL2
supposedly uses Hyper-V for virtualization.
