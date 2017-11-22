Installing PostgreSQL
^^^^^^^^^^^^^^^^^^^^^

Installation
------------

Foreword
********

When installing PostgreSQL there are a few key things you want to keep
in mind:

1. Prefer official channels (i.e, your distribution's repositories) over
   semi-official (i.e, the software's own repositories) and non-official
   (i.e, a 3d party's repositories) channels
2. Prefer RPM's over installing from source or shady installation
   scripts
3. Avoid using ``sudo`` or elevating privileges as much as possible
4. Don't blindly run commands that people tell you to, not even in this
   tutorial

On the `PostgreSQL download page
<http://www.postgresql.org/download/>`_, they sprinkle links to a third
party page that provides its own installation scripts with bloatware.
Practice due diligence.

Simplest method
***************

If you are on Fedora 21 and earlier, use the ``yum`` command. In Fedora
22 and above, it's deprecated and ``dnf`` is preferred. First, ensure
that your system is up-to-date:

.. code-block:: bash

  dnf clean all
  dnf upgrade

If you run ``dnf search postgresql``, you'll find a bunch of packages,
but the only ones we care about are:

.. code-block:: bash

   postgresql
   postgresql-server
   postgresql-libs
   postgresql-contrib
   pgadmin3

``postgresql-libs`` will be automatically installed if you install
``postgresql`` or ``postgresql-server``. Similarly, ``postgresql`` will
be automatically installed if you choose ``postgresql-server`` but not
vice versa. ``postgresql-contrib`` and ``pgadmin3`` are optional, the
former containing third-party add-ons and the latter containing a
graphical administration utility. Both of these packages are typically
desirable to PostgreSQL users.

Simply run:

.. code-block:: bash

  dnf install postgresql-server

To see the version of any of the packages you installed, use ``dnf info
name-of-package``.

Installing from PostgreSQL's repository
***************************************

Usually the reason why people ignore their distribution's packages is
because the version is too old. You almost always want to use these
packages because they are officially supported by the upstream
maintainer and least likely to have issues in the way of bugs,
misconfigurations or simply not interfacing well with the host system.
Luckily, PostgreSQL provides its own repository that may contain newer
versions but you install these at your own risk.

For some reason or another, PostgreSQL does not list Fedora 21 on their
`packages page <http://yum.postgresql.org/repopackages.php>`_.
They don't list links to the 32-bit packages either. To view the listing
directly, click `here <https://download.postgresql.org/pub/repos/yum/>`_.

Instructions:

1. Navigate to a folder that contains the version, i.e 9.5. Don't
   install packages from 9.6 as these are for testing only.
2. Navigate to `fedora`.  The redhat folder contains links to RHEL and
   CentOS packages.
3. You'll notice that they stopped providing 32-bit packages after
   Fedora 21. If for some reason you are still on a 32-bit system, you
   should use your distribution's package manager instead.
4. Find the RPM that starts with ``pgdg``, i.e
   ``pgdg-fedora-95-9.5-3.noarch.rpm`` and save it to a location on your
   computer.

This RPM simply adds and enables their repository.

.. code-block:: bash

  dnf install pgdg*.rpm

.. warning::

  Don't use Yumex installer or the ``rpm`` command to install RPMs.
  Yumex seems to be broken and the ``rpm`` command does not directly
  interface with your package manager. ``dnf install *.rpm`` is less
  typing anyways.

If you run ``dnf repolist``, you'll notice there's now ``pgdg9x`` where
x is the version number. Now you can follow the instructions from
`Simplest Method <#simplest-method>`_, except include the version number in the package
names, i.e ``dnf search postgresql95``.

Disabling PostgreSQL's repo
***************************

Uninstalling packages is as simple as using ``dnf remove``. However, in
order to disable the PostgreSQL repository, you need to run:

.. code-block:: bash

  # x is the version number
  dnf config-manager --set-disabled=pgdg9x

Always be wary of accidentally having multiple installations as you'll
run into package conflicts and other weird things. Please completely
remove all PostgreSQL-related packages if you decide to switch from one repo to another.

Initialize the service
**********************

You may have noticed that the binaries are not installed in ``/usr/bin``
or ``/usr/local/bin``. Instead, they're installed in
``/usr/pgsql-9.x/bin``. Add this to your path:

.. code-block:: bash

  # in bash.rc or .bash_profile for the postgres user
  PATH=/usr/pgsql-9.5/bin:$PATH

PostgreSQL interfaces with ``systemd``. You need to run these commands
before doing anything else:

.. code-block:: bash

  postgresql95-setup initdb
  systemctl enable postgresql-9.5.service
  systemctl start postgresql-9.5.service

Running the server
------------------

To avoid reinventing the wheel, I'll only go through the absolute
minimum amount of steps to get things going. The `documentation
<http://http://www.postgresql.org/docs/9.5/interactive/>`_ is
authoritative, as well as the ``man`` pages (i.e, ``man psql``).

The PostgreSQL User Account
***************************

If you followed the steps in this tutorial, a ``postgres`` user will
already exist.

.. warning::

  :strong:`DON'T SET A PASSWORD FOR POSTGRES!` That is dangerous. Leave
  it locked as it should be.

The rest of the tutorial assumes you are running PostgreSQL commands
under the ``postgres`` account, i.e ``sudo su - postgres`` unless
otherwise specified. Don't run things as root from now on, especially
PostgreSQL commands!

Managing the server
*******************

Normally you must create and specify a data directory, but again this
has already been done for you by the RPMs:

.. code-block:: bash

  PGDATA=/var/lib/pgsql/9.5/data
  export PGDATA

Therefore we just need to run:

.. code-block:: bash

  pg_ctl start
  pg_ctl status # is the server running?
  pg_ctl stop

Again, refer to ``man pg_ctl`` for a complete list of commands.

Importing some data 
*******************

`SQL reference
<http://www.postgresql.org/docs/9.5/interactive/sql.html>`_

Once you've started the server, you can now connect to it by running
``psql``. You're thrown into a shell where you can perform SQL commands.

By default, you are under the ``postgres`` user in the ``postgres``
database. Run ``\help`` to see a list of SQL commands, ``\?`` to see a
list of ``psql`` commands and ``\q`` to quit.

``\d`` will list the tables in your database, which is currently empty.

As a simple example, let's say we have a text file that contains the
following data:

.. code-block:: bash

  # example.csv
  I Am
  Some Data
  How Nice

We can create a table that models this format:

.. code-block:: bash

  # All commands must be terminated by a semi-colon
  CREATE TABLE example (
    Header1 char(5),
    Header2 char(5)
  );

Then import the example data:

.. code-block:: bash

  COPY example FROM `/var/lib/pgsql/example.csv` DELIMITER ' ' CSV;

And view our newly populated table:

.. code-block:: bash

  postgres=# SELECT * FROM example;
  header1 | header2 
  ---------+---------
  I       | Am   
  Some    | Data 
  How     | Nice 
  (3 rows)

