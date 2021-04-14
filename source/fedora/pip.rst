pip
^^^

pip already comes with your Python installation from your distribution's
package manager. It is not recommended to run pip as root because it can
interfere with your system packages and screw up your installation. While Fedora
has manage attempts to make ``sudo pip`` safer, it is still `not completely safe
<https://fedoraproject.org/wiki/Changes/Making_sudo_pip_safe>`_ and you should
use ``--user`` whenever possible.

Another thing to take into consideration is that due to pip historically
lacking a dependency resolver, there is no safe way to upgrade all of your
packages at once. pip is more geared towards developers rather than end user
package management. pip recently obtained a dependency resolver in 20.3.x,
however many are recommending using `Poetry <https://python-poetry.org/>`_ for
developers and `pipx <https://pypi.org/project/pipx/>`_ if you need to install
CLI programs.

One last caveat is that if your python interpreter is upgraded, your packages
may be orphaned. You can simply copy over the files in
``.local/lib/python3.x/site-packages`` to the newer version. pipx takes care of
this automatically.
