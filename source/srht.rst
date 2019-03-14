Sourcehut
^^^^^^^^^

`Sourcehut <https://sourcehut.org/>`_ is a project created by `Drew DeVault
<https://drewdevault.com/>`_. Sourcehut contains a collection of different
services: such as Git hosting, a continuous integration platform and mailing
list software. It is completely open-source and self-hosting. Due to being in an
alpha state, the `installation instructions
<https://man.sr.ht/installation.md>`_ are a bit sparse. Further, the primary
supported platform is Arch Linux. In this article, I will teach you how to set
up Sourcehut on a CentOS 7 box via Google Cloud Services for local development.

Getting started
---------------

In order to do anything on Sourcehut, you need to create an account. Be sure to
upload your SSH key. We will be using this same key to SSH into our CentOS box.

Now, let's create an instance and allow traffic on port 80:

.. code-block:: bash

    gcloud compute instances create srht --image-family centos-7 \
        --image-project centos-cloud
    gcloud compute firewall-rules update allow-80

We will be using a project-wide SSH key to allow SSH agent forwarding. If we use
``gcloud compute ssh``, then we will not be able to clone repositories later as
the created keys will not be uploaded to sr.ht.

Now SSH into the box:

.. code-block:: bash

    ssh -A -i ~/.ssh/your_key your-username@box-ip

Dependencies
------------

The various services come with a lot of dependencies. Grab it all with one
command:

.. code-block:: bash

    sudo yum update
    sudo yum install postgresql-server postgresql-contrib \
        nginx redis \
        git gcc gcc-c++ make \
        python36 python36-setuptools python36-pip \
        sassc npm

For each project you clone, you'll also want to do ``pip3 install .`` to grab the
Python dependencies.

PostgreSQL post-installation
----------------------------

First, run the usual setup command:

.. code-block:: bash

    sudo postgresql-setup initdb postgresql
    sudo systemctl start postgresql

By default, PostgreSQL will authenticate using "peer" mode. For simplicity and
possibly against best practices, we'll be doing everything using the Postgres
superuser. Login into the Postgres account and setup a password:

.. code-block:: bash

    $ sudo su - postgres
    (postgres) $ psql
    postgres=# \password postgres
    postgres=# \quit

Now, we'll want to make some modifications to ``pg_hba.conf``. It should be
located in ``/var/lib/pgsql/data``. The line we care about is:

..

    local   all             all                                    peer 

Replace ``peer`` with ``md5`` to instruct PostgreSQL to authenticate using
passwords. Restart the server with ``systemctl restart postgresql``. 

.. note::

    You may also choose to delete any lines beginning with "host". There's no
    reason to allow TCP connections since this server is for development
    purposes.

.. note::

    md5 is insecure and superseded by scram-sha256. However, it is a little bit
    more tricky to setup and not available on PostgreSQL 9.

Nginx post-installation
-----------------------

Next, we're going to want to create the configuration file for the Sourcehut
service(s). In this tutorial, we are only going to cover one service
(meta.sr.ht). Create a file called ``metasrht.conf`` in ``/etc/nginx/conf.d``. For
simplicity, we're going to ignore SSL. However, you may choose to create a
self-signed certificate if you wish.

::

    server {
        listen 80;
        server_name instance-external-ip;
        client_max_body_size 100M;

        location / {
            proxy_pass http://127.0.0.1:5000;
        }

        location /static {
            root /usr/local/lib/python3.6/site-packages/metasrht;
        }
    }

Then start the server with ``systemctl start nginx``.

Installing core.sr.ht
---------------------

Before you work on any of the projects, you need core.sr.ht installed.
Installation is fairly simple.

.. code-block:: bash

    git clone git@git.sr.ht:~sircmpwn/core.sr.ht
    git submodule update --init --recursive
    sudo pip3.6 install .
    sudo python3.6 setup.py install --prefix=/usr/local

I generally do not recommend ``sudo pip``. However, since this is a development
box and ``sudo pip`` should install to ``/usr/local`` by default nowadays, it
shouldn't be a problem.

.. warning::

    meta.sr.ht will look for the "srht" directory. However, if for some reason
    during the install your srht directory was not moved out of the egg, then
    you'll need to copy it:

    .. code-block:: bash
    
        sudo mv /usr/local/lib/python3.6/site-packages/srht-0.42.0_1_gf34c64a-py3.6.egg/srht /usr/local/lib/python3.6/site-packages/

Installing meta.sr.ht
---------------------

First, clone it:

.. code-block:: bash

    git clone git@git.sr.ht:~sircmpwn/man.sr.ht

The various Sourcehut services share a ``config.ini`` file that controls various
things like the PostgreSQL connection string. PostgreSQL will listen locally on
a Unix socket, so set your string accordingly:

::

    connection-string=postgresql://postgres:password@/metasrht

Leaving the hostname blank (after the @) will tell it to connect to the Unix
socket. Finally, make sure you create a database called ``metasrht``.

Installation is very similar to core.sr.ht:

.. code-block:: bash

    sudo pip3.6 install .
    sudo python3.6 setup.py install --prefix=/usr/local

If necessary, you may need to manually set ``SRHT_PATH`` to the location of the
srht installation. For example, ``/usr/local/lib/python3.6/site-packages/srht``.

Now that's all done, make sure to create the database schema:

.. code-block:: bash

    $ python3
    >>> from metasrht.app import db
    >>> db.create()

Viewing the site
----------------

First, grab a couple of dependencies:

.. code-block:: bash

    sudo pip3.6 install celery gunicorn

While we could tunnel or expose localhost to the outside world, for simplicity,
we're just going to use ``gunicorn``. You can either grab the systemd service
files from the `sr.ht-pkgbuilds
<https://git.sr.ht/~sircmpwn/sr.ht-pkgbuilds/tree>`_ repository or run the
commands manually. For example:

.. code-block:: bash

    /usr/local/bin/gunicorn metasrht.app:app -b 127.0.0.1:5000

For the webhooks service:

.. code-block:: bash

    /usr/local/bin/celery -A metasrht.webhooks worker --loglevel=info

You will also want to start the redis server with ``redis-server``. After
launching ``gunicorn``, you should be able to visit your computer instance's
external IP and see the live site.
