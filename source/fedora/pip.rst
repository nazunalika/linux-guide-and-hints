pip
^^^

pip already comes with your Python installation from your distribution's
package manager. However, when installing packages, it's generally not a
good idea to install them globally. Furthermore, Python has a myriad of
ways of installing packages, which is confusing and could easily screw
up your system.

As a rule of thumb, avoid ``sudo pip``. Always append ``--user`` to the
``install`` command and double check which ``pip`` you are using with
``pip --version``. It should say the version number as well as the
directory it's being pulled from.

.. note::

    There is a proposal to make ``--user`` the default scheme, see
    `issue #1668 <https://github.com/pypa/pip/issues/1668>`_.

Finally, there's a separate pip for Python 2 and 3. You could easily
have 4-5 different versions (2 installed globally, 2 installed locally,
and pip-installed pips) which compounds the issue further.

Due to the recursive nature of installing ``pip`` with ``pip`` and the fact
that you can orphan packages, you **DO NOT** want to do this:

.. code-block:: bash

    pip install --user pip

It's tempting to do this so you can keep a newer version of pip without upgrading
your system pip (and potentially messing it up.) However, upon upgrading from
Fedora 23 to 24, Python upgraded from 3.4 to 3.5. The ``pip`` I installed in
``~/.local`` now pointed to 3.5, even if you specify the path manually, and so my
3.4 packages were "orphaned". For more information, see `Pip3 from Python3 upgrade will break Pip from Python <https://github.com/Homebrew/legacy-homebrew/issues/25752>`_.

I ended up just wiping my local ``pip``'s and doing a user install with my system
``pip``.
