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
    OnCalendar=Sun 23:00:00 EST
    WakeSystem=true

    [Install]
    WantedBy=multi-user.target

And the corresponding service file:

.. code-block:: bash

    [Unit]
    Description=Weekly backup

    [Service]
    Type=oneshot
    ExecStart=/bin/systemd-inhibit /bin/su -c "/usr/bin/flock -w 0 /path/to/cron.lock # ...

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

The following helper script should get you started:

.. raw:: html

    <script src="https://gist.github.com/remyabel/2cac59a778fa34d0c61e246554fe3e3c.js"></script>
