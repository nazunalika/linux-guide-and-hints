vim
^^^

Plugins
-------

There are a couple of Vim plugin managers, but a popular one is
`Pathogen <https://github.com/tpope/vim-pathogen>`_. Installation is as
simple as:

.. code-block:: bash

  mkdir -p ~/.vim/autoload ~/.vim/bundle && \
  curl -LSso ~/.vim/autoload/pathogen.vim https://tpo.pe/pathogen.vim

And to install a plugin:

.. code-block:: bash

  cd ~/.vim/bundle
  git clone https://github.com/someuser/vim-plugin
  # or
  git clone https://github.com/someuser/vim-plugin ~/.vim/bundle/vim-plugin

Typically, you'd want to run ``:Helptags`` afterwards to get the new
documentation.
