tmux
^^^^

If you start vim within a tmux session, you might notice that your
terminal's color scheme "bleeds" into vim's. This is a result of tmux
not using a 256 color terminal. It is covered in the tmux FAQ `"How do I
use a 256 colour terminal?"
<http://tmux.cvs.sourceforge.net/viewvc/tmux/tmux/FAQ>`_. The following
is a complete excerpt but edited for formatting purposes.

  If you attach to your tmux session and ``echo $TERM`` says something
  like ``screen``, then you know something's wrong. Before attaching to
  your tmux session, do ``echo $TERM`` (it may be something like
  ``xterm-256color``).  This is what you want to put for
  ``default-terminal.``

Provided the underlying terminal supports 256 colours, it is usually sufficient
to add the following to ``~/.tmux.conf``:

.. code-block:: bash

  set -g default-terminal "screen-256color"

Note that some platforms do not support "screen-256color" (``infocmp
screen-256color`` will return an error) - in this case see the next entry in
this FAQ.

tmux attempts to detect a 256 colour terminal both by looking at the colors
terminfo entry and by looking for the string "256col" in the TERM environment
variable.

If both these methods fail, the -2 flag may be passed to tmux when attaching
to a session to indicate the terminal supports 256 colours.

.. code-block:: bash

  tmux -2 attach
