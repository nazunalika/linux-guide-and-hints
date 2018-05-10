Clang
^^^^^

MSan line numbers
-----------------

Install the ``llvm`` package, not just ``clang``. MemorySanitizer requires the ``llvm-symbolizer`` binary to display files/line numbers.

clang-format
------------

Installing ``clang`` via the package manager only grabs the ``clang-format`` binary, which doesn't have vim integration. Grab the python script from llvm directly, i.e their `github page <https://raw.githubusercontent.com/llvm-mirror/clang/master/tools/clang-format/clang-format.py>`_. Put it somewhere then add the following to your ``.vimrc``:

.. code-block:: bash

  map <C-K> :py3f /home/tom/Test/C++/clang-format.py<cr>
  imap <C-K> <c-o>:py3f /home/tom/Test/C++/clang-format.py<cr>

This script requires the ``clang-format`` binary to be installed. Note that I'm deliberately using ``py3f`` instead of ``pyf`` under the assumption that you are running at least one Python 3 plugin. Otherwise stick with ``pyf``.
