Gitlab
^^^^^^

This page will summarize some notes to accompany the `installation with Docker
guide <https://docs.gitlab.com/omnibus/docker/>`_.

SSH and Git access
------------------

Gitlab will run its own SSH server (used for Git authentication). If you are
running your container in a GCS instance, then you will need to expose the SSH
server on a different port. For example:

.. code-block:: bash

    sudo docker run --detach \
      # ...snip...
      --publish 443:443 --publish 80:80 --publish 50001:22 \
      # ...snip... 

Then you need to change the port in ``gitlab.rb``:

.. code-block:: ruby

    gitlab_rails['gitlab_shell_ssh_port'] = 50001

If you're using GCS, create a firewall rule:

.. code-block:: bash

    gcloud compute firewall-rules create allow-ssh-50001 --allow=tcp:50001

To test that it works, run ``ssh -p 50001 -Tv git@gitlab.example.com``. Finally,
to ensure that Git uses the correct port, amend your ``.ssh/config`` like so:

.. code-block:: none

    Host gitlab.example.com
        port 50001

To actually be able to perform any Git operations, upload your SSH key to the
Gitlab instance.

Enabling HTTPS with Let's Encrypt
---------------------------------

Gitlab allows automatically provisioning a certificate. Just enable the settings
in ``gitlab.rb``:

.. code-block:: ruby

    letsencrypt['enable'] = true
    # If you are using a self-signed certificate, you can also put an IP
    # address instead of an FQDN here
    external_url 'https://gitlab.example.com'
    letsencrypt['contact_emails'] = ['foo@email.com']

You will need firewall rules for both port 80 and 443:

.. code-block:: bash

    gcloud compute firewall-rules create allow-http --allow=tcp:80
    gcloud compute firewall-rules create allow-https --allow=tcp:443

.. note::

    If you are using Cloudflare, ensure that you whitelist their IP's. You may
    also need to disable "Full (Strict)" until your certificate is issued.

Temporarily clear any source range settings by appending ``--source-ranges=`` to
the command. Otherwise, Let's Encrypt will not be able to perform the challenge.

You can revoke any certificates by using ``certbot revoke --cert-path
/path/to/key.pem``. If you do not have access to the files stored by Gitlab,
find your certificate at `crt.sh <https://crt.sh>`_. There should be an option
to download the PEM file in the sidebar. Before you can revoke the certificate,
you need to perform a validation:

.. code-block:: bash

    # Since validation and issuance are done using the same command, we need to
    # specify a non-existent subdomain to ensure the issuance fails.
    certbot certonly --manual --preferred-challenges=dns -d gitlab.linuxguideandhints.com -d nonexistent.linuxguideandhints.com
