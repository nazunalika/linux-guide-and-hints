GCC
^^^

This is a short summary of the `Installing GCC
<https://gcc.gnu.org/wiki/InstallingGCC>`_ page from the GCC wiki. The
article was written by a GCC maintainer, Johnathan Wakely. There are
tutorials on the Internet that either get it wrong or describe an obtuse
way of installing it. This page simplifies things quite a bit. This does
*not* replace reading the actual wiki page, so please visit it.

If you don't actually need to build an application,  but instead want a
platform for testing scripts or sharing snippets then consider `godbolt
<https://gcc.godbolt.org/>`_ or `coliru <http://coliru.stacked-crooked.com/>`_.
Godbolt is an online disassembler and has a plethora of compilers on various
architectures and even comes with support for some well-known libraries.

A more complete list of online compilers can be found in the `StackOverflow C++
tag wiki description <https://stackoverflow.com/tags/c%2b%2b/info>`_.

Installing prerequisites: GMP, MPFR, MPC
----------------------------------------

Generally, you should prefer to install these through your package
manager first. On Fedora:

.. code-block:: bash

   dnf install gmp-devel mpfr-devel libmpc-devel

Otherwise, GCC provides a script that will download and build the dependencies.
When you build GCC, these will be linked against automatically. In the GCC
source directory:

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

Docker
------

If you don't need a cross compiler or customized toolchain, then it may be
easier to just use the official `Docker image
<https://docs.docker.com/samples/library/gcc/>`_:

.. code-block:: bash

    docker run --rm -v "$PWD":/usr/src/myapp -w /usr/src/myapp gcc:4.9 gcc -o myapp myapp.c

"invalid instruction suffix for"
--------------------------------

If you are building a cross-compiler (i.e, following along with the `osdev
article <http://wiki.osdev.org/GCC_Cross-Compiler>`_) and come across this
error, you simply need to set the install prefix for Binutils and GCC to the
same directory. For some strange reason, GCC will fallback to the system
assembler even if Binutils binaries are in the path.

.. note::

    TODO: Additional research needed.
