Powerline
^^^^^^^^^

`Powerline <https://powerline.readthedocs.org/en/latest/>`_ is a
statusline plugin that will work for both vim and terminal emulators. It
makes your statusline look like this:

.. image:: /_static/img/statusline.png

Installing via ``dnf``
----------------------

Just do:

.. code-block:: bash

  dnf install powerline

The RPM will also install the Powerline fonts.

Then consult the `powerline documentation
<https://powerline.readthedocs.org/en/latest/usage.html>`_ for using it
with your program of choice. For vim and tmux, RPMs are available that
already handle the configuration.

Enabling powerline (installed via ``dnf``)
------------------------------------------

Fish
****

Add this to ``~/.config/fish/config.fish``:

.. code-block:: bash

  set fish_function_path $fish_function_path "{repository_root}/powerline/fish"
  powerline-setup

If you used the ``dnf`` method, ``{repository_root}`` will be
``/usr/share/``. 

oh-my-fish
++++++++++

Alternatively, you can use another powerline-enabled theme provided by
`oh-my-fish <https://github.com/oh-my-fish/oh-my-fish>`_.

.. code-block:: bash

   curl -L https://get.oh-my.fish > install
   curl -L https://raw.githubusercontent.com/oh-my-fish/oh-my-fish/master/bin/install.sha256 > install.256
   sha256sum -c install.256
   fish install --path=~/.local/share/omf --config=~/.config/omf
   omf install bobthefish
   omf theme bobthefish

If present, remove ``powerline-setup`` from your Fish config.

vim
***

The package is called ``vim-powerline``. Once you install the RPM, no
extra configuration or steps are necessary. Again, all of the files are
installed to ``/usr/share/``.

.. note::

    Because Fedora is trying to go full python 3, the powerline package is only
    compiled with python 3 support. In order to force vim to use python 3,
    place this at the top of your ``~/.vimrc``:

    .. code-block:: vim 

        if has('python3')
        endif

    Note you risk breaking any vim plugins that require python 2.

    Credit goes to https://robertbasic.com/blog/force-python-version-in-vim/

tmux
****

The package is called ``tmux-powerline``.
