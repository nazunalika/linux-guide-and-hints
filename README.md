# Linux Guide and Hints

This wiki uses a forked/heavily modified version of [Sphinx RTD Theme](https://github.com/snide/sphinx_rtd_theme).

The website is NOT live at https://www.linuxguideandhints.com

Our servers at the data center have suffered from an irrecoverable crash.
We're looking into alternative hosting.

## Copyright

The website uses the MIT license.

Primary developer: remyabel (Tommy Nguyen)

Fedora articles: remyabel

CentOS articles: [nazunalika](https://github.com/nazunalika) (Louis Abel)

### Builds

See https://travis-ci.org/remyabel/linux-guide-and-hints

### Sphinx

`pip` automatically comes with Python.

You need Sphinx in order to build this project.

    pip install --user sphinx

It will be located in `~/.local/bin/`, which you can add to your path.

Then run `make html` or `sphinx-build -Ea -b html -d build/doctrees
source build/html` from the root directory of the Sphinx project.

Alternatively, `make html SPHINXOPTS=-Ea` will achieve the same effect
in forcing an entire rebuild.

### Livereload

		pip install --user sphinx-autobuild

Then

		sphinx-autobuild . <directory>
