Git
^^^

Setting up Cloudflare and Github pages
--------------------------------------

Because Github has rolled out official support for HTTPS for custom domains, configuring it in tandem with Cloudflare has become
slightly trickier. Ensure that your Cloudflare settings look like the following. The latest Github IPs can be found in their
`documentation <https://help.github.com/articles/setting-up-an-apex-domain/#configuring-a-records-with-your-dns-provider>`_.

+-------+-------------+----------------------------+--------------------------+
| Type  |    Name     |           Value            |          Status          |
+-------+-------------+----------------------------+--------------------------+
| CNAME | www         | is an alias of example.com | DNS and HTTP Proxy (CDN) |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+

The reason you enable the HTTP proxy for the CNAME is to allow Cloudflare's page rules to work. Without it, ``example.com`` (without
the www subdomain) does not resolve correctly and the HTTP -> HTTPS redirect does not work.

GPG
---

This summarizes the information from `Github Help <https://help.github.com/articles/signing-commits-with-gpg/>`_.

* List your keys with ``gpg2 --list-keys``.
* Configure your git signing key with ``git config --global user.signingkey <key>``.
* Run ``gpg2 --armor --export <key>`` and add the key to your Github account.
* Sign commits with ``git commit -S <...>``
* ``git-bump`` will sign tags automatically.

Note that ``gpg2`` and ``gpg`` are not interchangeable. If you decide to use ``gpg2``, you can tell git to use it with
``git config --global gpg.program gpg2``.

Ensure that your name and e-mail address match the Github account you're adding the key to.

`gpg-agent` requires that you set `GPG_TTY`. For bash, this would look like:

.. code-block:: bash

   GPG_TTY=$(tty)
   export GPG_TTY

For fish:

.. code-block:: bash

   set -gx GPG_TTY (tty)

Workflow
--------

This is a living set of notes I have for a Git workflow.

.. warning::

    This contains incomplete and possibly incorrect advice. It
    will continue to be amended as I use it in my workflow and see
    what works and doesn't.

Keeping forks synchronized
**************************

Working on a branch out of sync with the upstream master can lead to headaches
later on. First, in your fork, ensure you have a remote to the upstream:

.. code-block:: bash

    git remote add upstream upstream-url

Regularly, keep your master branch up-to-date:

.. code-block:: bash

    git checkout master
    git fetch upstream
    git merge upstream/master

Depending on the upstream repo's policy, they may prefer you rebase or merge
master regularly. The rebase workflow involves ``git rebase master`` in your
topic branch then doing a ``git push --force``. The upstream repo may then
choose to squash the pull request into a single commit, so there is no messy
history.

For a merge workflow, then do ``git merge master``. Keep in mind that this
leads to a lot of merge commits, which can pollute your history, but ``git push
--force`` usually is not required.

It may also be a good idea to use ``git push --force-with-lease`` to avoid
overwriting any changes made ahead of you.

Versioning
**********

We will be using `git-bump <https://github.com/tpope/git-bump>`_. Install gem and the package:

.. code-block:: bash

   sudo dnf install gem
   sudo gem install git-bump

Modify whatever appropriate files for versioning, i.e ``package.json``,
``conf.py``, etc. Stage the changes then run ``git-bump <version>``. You can then verify the tag with
``git tag -v <version>``.

``git commit -am`` didn’t add my latest files
*********************************************

The ``-a`` option only allows you to skip ``git add <filename>`` for files already tracked.

What creates duplicate commits (different SHA’s)?
*************************************************

Rebasing, cherry-picking. 

Merge
*****

Temporary (hotfix) branch
+++++++++++++++++++++++++

* If master is ahead, use rebase and ``--ff-only``

Example:

.. code-block:: bash

    git checkout hotfix

    git rebase master

    git checkout master

    git merge hotfix --ff-only

* If master is untouched, do a fast-forward merge

Feature (long-lived) branch
+++++++++++++++++++++++++++

* If master is untouched, do a non-fast-forward merge with ``--no-ff``

* Otherwise git merge will perform a “true merge”.

After merging a branch into master, fast-forward master back into it to advance the HEAD pointer. It's important to do this regularly so you are not forced to create a merge commit from master after staging some changes. If you run into this situation, do:

- ``git reset HEAD^`` (not ``--hard``)

- ``git merge master``

- ``git commit -am "whatever"``

Rebase
******

Local branch diverges from origin (remote)
++++++++++++++++++++++++++++++++++++++++++

This happens if someone pushed work ahead of you. Git will deny the push and recommend you pull which is ill-advised. Instead, you should do ``git pull --rebase=preserve``. The preserve option ensures that any local merges will not be flattened.

Example
+++++++

Let’s say you have three repositories: remote, workA and workB.

* workA does an initial commit.

* workB does a git pull to incorporate the initial commit.

* workB adds a new commit and pushes to remote.

* workA adds a new commit but is denied a push because workB already pushed.

* workA does ``git pull --rebase=preserve`` and can now safely git push.

* workB can now merge (in this case, a fast-forward). All three repositories have a clean, linear history.

Clean up your work
++++++++++++++++++

Local changes (haven't been pushed elsewhere) should be cleaned up by using ``git rebase -i``. Squash the commits and use ``[#issueno] Summary`` in the message. Otherwise if the changes have already been pushed, ``git revert`` etc. should be used. Do not overwrite (that is, dropping their commits) other people's changes or rewrite history. This problem is slightly mitigated by using protected branches that disable force pushes.
