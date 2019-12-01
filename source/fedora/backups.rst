Backups
^^^^^^^

While there is a variety of backup software out there, this article will only
cover two: `duplicity <http://duplicity.nongnu.org/>`_ and `git-annex
<https://git-annex.branchable.com/>`_. git-annex is not backup software in of
itself, but it is still useful for such a purpose.

Duplicity
---------

Duplicity uses a GPG encrypted tar format. The primary advantage of duplicity
is that the archives are very small compared to alternatives (see
`gilbertchen's benchmarks <https://github.com/gilbertchen/benchmarking>`_).
The two major disadvantages is that backup/restore time is lengthy and that the
incremental backups are useless without the full backup in the chain. One thing
I will give to Duplicity compared to Duplicacy is that the command-line
interface is superior.

.. danger::

    Duplicity is undergoing a Python 2 to 3 transition, which seems to be
    resulting in a lot of bugs. Use at your own risk.

.. warning::

    I'm not sure if this is a bug or not, but you should be aware that for
    include/exclude patterns, specifying a path like ``/path/to/go`` will also
    match ``/path/to/gopher``, even when not using a wildcard.

GPG
---

In order to instruct Duplicity to use ``gpg2``, pass ``--gpg-binary='gpg2'``.
You can then either use the ``PASSPHRASE`` environment variable or the
``--use-agent`` flag. If you go with the former route, your passphrase will be
in cleartext, but if it's in your crontab or protected with ``700`` permissions
only your user can read it. For the latter, you may opt to keep your passphrase
cached so that you can run the backups unattended. Add these to your
``~/.gnupg/gpg-agent.conf``:

.. code-block:: none

    default-cache-ttl 34560000
    max-cache-ttl 34560000

Then reload the GPG agent (either ``echo RELOADAGENT | gpg-connect-agent`` or
``gpgconf --kill gpg-agent``).

Keychain
--------

`Keychain <https://github.com/funtoo/keychain>`_ is a front-end for
``ssh-agent`` and ``gpg-agent``. It will cache your keys and export environment
variables (``SSH_AUTH_SOCK``, etc.) that can be sourced for non-interactive
scripts like crontabs. At the time of writing, Fedora ships version 2.8.0,
which is too old for our purposes. The latest version at the time of writing
(2.8.5) allows us to use GPG2. Since it's just a shell script, installation is
simple:

.. code-block:: bash

    git clone git@github.com:funtoo/keychain.git
    cd keychain && make
    cp keychain ~/.local/bin/

Unless specified, Keychain will not start ``gpg-agent`` nor use ``gpg2``. Further,
you need to explicitly specify which keys to use (i.e, ``id_rsa``). You will also need
to invoke Keychain from your shell startup scripts. For Bash, this will look like:

.. code-block:: bash

    # Environment variables automatically sourced, no need to do it manually here
    eval `keychain --agents gpg,ssh --gpg2 --eval id_rsa some_gpg_key_id`

For Fish:

.. code-block:: fish

    if status --is-interactive
        keychain --agents gpg,ssh --gpg2 --eval id_rsa some_gpg_key_id
    end

    if test -f ~/.keychain/(hostname)-gpg-fish
        source ~/.keychain/(hostname)-gpg-fish
    end

    if test -f ~/.keychain/(hostname)-fish
        source ~/.keychain/(hostname)-fish
    end

.. note::

    At the time of writing the Fish example in the man Keychain page is broken.
    This example was pulled from `issue #4583
    <https://github.com/fish-shell/fish-shell/issues/4583>`_ in the Fish issue
    tracker.

Finally, add this to the top of your cron jobs:

.. code-block:: bash

    [ -z "$HOSTNAME" ] && HOSTNAME=$(uname -n)
    [ -f "$HOME/.keychain/$HOSTNAME-sh" ] && \
        source "$HOME/.keychain/$HOSTNAME-sh" 2>/dev/null
    [ -f "$HOME/.keychain/$HOSTNAME-sh-gpg" ] && \
        source "$HOME/.keychain/$HOSTNAME-sh-gpg" 2>/dev/null

Unattended backups
------------------

.. note::

    If you intend to use systemd, it cannot be used within a (user) cron tab. It can only
    run within a login session or be run as root.

However, two commands you may find useful are ``flock`` and
``systemd-inhibit``. ``flock`` will allow you to prevent jobs from overlapping. You can also
wake up the system by writing a systemd unit and using the ``WakeSystem`` property. Example:

.. code-block:: bash

    [Unit]
    Description=Weekly backup

    [Timer]
    Unit=weekly_backup.service
    OnCalendar=Sun 23:00:00
    WakeSystem=true

    [Install]
    WantedBy=multi-user.target

And the corresponding service file:

.. code-block:: bash

    [Unit]
    Description=Weekly backup

    [Service]
    Type=oneshot
    ExecStartPre=/bin/sleep 1m
    ExecStart=/bin/systemd-inhibit /bin/su -c "/usr/bin/flock -w 0 /path/to/cron.lock # ...

We sleep before running ``systemd-inhibit`` because there's a race condition if
it runs while the system is still waking from suspend. See this `mailing list
post
<https://lists.freedesktop.org/archives/systemd-devel/2019-April/042423.html>`_
for details.

.. note::

    The service files should **not** have an [Install] section. When you enable the units,
    only enable the timers.

Read ``man systemd.time`` for what format ``OnCalendar`` takes. You can verify
the time format is correct by using ``systemd calendar``. Since ``WakeSystem``
requires privileges, this cannot be a per-user unit. So place them inside
``/etc/systemd/system``.

``flock`` ensures that if there's a conflict, the monthly (i.e, full backup) job will take
precedence. You can run ``fuser -v /path/to/cron.lock`` to see what processes are holding
a lock.

``systemd-inhibit`` on the other hand will prevent the system from suspending
until the given command is complete. Per the `documentation
<https://www.freedesktop.org/software/systemd/man/systemd-inhibit.html>`_, it
can inhibit a variety of operations. By default, this is
``idle:sleep:shutdown`` but laptop users will find ``handle-lid-switch``
useful.

Alternatively, if you choose not to use ``systemd-inhibit``, you can simply adjust the power
management inactivity value. For example, on XFCE this would look like:

.. shell::

    xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/inactivity-on-ac -s 0

This has the advantage of not requiring root privileges.

git-annex
---------

git-annex is a location/metadata tracker that's built on top of git. It essentially adds new verbs
(prefixed with ``git annex``) to any configured repository. There are a few things to keep in mind:

- ``git annex init`` may not initialize the repository with the latest version. i.e, if you have
  git-annex v6, the repository may be v5. In that case, you should run ``git annex upgrade``
- ``git annex sync`` needs to be run in each repository, not just one, if you are using a distributed
  rather than centralized workflow
- In v6, once a file is unlocked, it remains unlocked. If you make frequent changes to files you should
  use ``git annex unlock`` since direct mode is deprecated

As far as I'm aware, git-annex doesn't track permissions or xattrs (important
for SELinux). However, etckeeper has some helper scripts which store and
restore metadata: `30store-metadata
<https://git.joeyh.name/index.cgi/etckeeper.git/tree/pre-commit.d/30store-metadata>`_
and `30restore-etckeeper
<https://git.joeyh.name/index.cgi/etckeeper.git/tree/pre-commit.d/30store-metadata>`_
respectively. Rename the scripts to ``git-store-metadata`` and
``git-restore-metadata`` and add them to your ``PATH``.  You will need to set
the ``VCS`` environment variable to ``git``.

In order to restore security contexts, you can simply use ``chcon -R
--reference=source_dir/ target_dir/``, where ``source_dir`` contains the
context you want to apply to ``target_dir``.

The following helper script should get you started:

.. raw:: html

    <script src="https://gist.github.com/remyabel/2cac59a778fa34d0c61e246554fe3e3c.js"></script>

    <noscript>

.. code-block:: bash

    #!/bin/bash

    set -x
    set -o pipefail
    shopt -s dotglob

    function fail {
        echo "Fail."
        exit 1
    }

    # Import environment variables SSH_AUTH_SOCK, etc.
    [ -z "$HOSTNAME" ] && HOSTNAME=$(uname -n)
    [ -f "$HOME/.keychain/$HOSTNAME-sh" ] && \
        source "$HOME/.keychain/$HOSTNAME-sh" 2>/dev/null
    [ -f "$HOME/.keychain/$HOSTNAME-sh-gpg" ] && \
        source "$HOME/.keychain/$HOSTNAME-sh-gpg" 2>/dev/null

    cd "$HOME/backup" || fail
    # We need to unlock the files in order to allow modifications. Note that direct
    # mode is deprecated.
    git annex unlock ./* || fail

    # ...snip...
    # Copy your files to backup here
    # If using cp, make sure you use -a to preserve permissions and xattrs
    # If using rsync, make sure you use -avzAX
    # ...snip...

    # We use git add and not git annex add here to add the files directly.
    # Adding them to the annex would create symlinks, which do not preserve 
    # permissions.
    git-store-metadata
    git add --all || fail
    git annex sync --content --message="$(date +%F)" || fail

    # For each remote we need to run sync in order to actually
    # propagate the changes. Doing sync from the initial directory
    # only creates a branch with the changes. Running sync in the target
    # directory performs the merge.
    for remote in $(git remote)
    do
        URL=$(git remote get-url "$remote")
        cd "$URL" || fail
        git annex sync --content --message="$(date +%F)" || fail
        git-restore-metadata
    done

.. raw:: html

    </noscript>
