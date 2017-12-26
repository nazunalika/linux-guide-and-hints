GCC
^^^

This is a short summary of the `Installing GCC
<https://gcc.gnu.org/wiki/InstallingGCC>`_ page from the GCC wiki. The
article was written by a GCC maintainer, Johnathan Wakely. There are
tutorials on the Internet that either get it wrong or describe an obtuse
way of installing it. This page simplifies things quite a bit. This does
*not* replace reading the actual wiki page, so please visit it.

If you're wondering why you would want to compile GCC from source, the
answer is simple. The upstream packages tend to be a version behind or
severely outdated (for example in the case of Mac). Enthusiast
programmers will want the latest and greatest, especially in the advent
of C++11/14/1z. The following steps will allow you to install GCC
locally without overwriting your system's GCC (that would be bad.)

Installing prerequisites: GMP, MPFR, MPC
----------------------------------------

In the GCC source directory:

.. code-block:: bash

  ./contrib/download_prerequisites 

Seriously, that's it. You don't need to do anything else.

Building
--------

It's ill-advised to run ``./configure`` (that is from the source
directory.) It's better to run it out-of-source by doing the following:

.. code-block:: bash

  tar xzf gcc-4.6.2.tar.gz
  cd gcc-4.6.2
  ./contrib/download_prerequisites
  cd ..
  mkdir objdir
  cd objdir
  $PWD/../gcc-4.6.2/configure --prefix=$HOME/gcc-4.6.2 
  make
  make install

Some options you may consider passing to ``configure`` may be
``--enable-languages=c,c++``, ``--disable-nls`` and ``--enable-multilib``. 

"invalid instruction suffix for"
--------------------------------

If you are building a cross-compiler (i.e, following along with the `osdev
article <http://wiki.osdev.org/GCC_Cross-Compiler>`_) and come across this
error, you simply need to set the install prefix for Binutils and GCC to the
same directory. For some strange reason, GCC will fallback to the system
assembler even if Binutils binaries are in the path.

.. note::

    TODO: Additional research needed.
