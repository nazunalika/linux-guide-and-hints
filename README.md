# Linux Guide and Hints

The website is live at https://linuxguideandhints.com - We are in the process of making some changes and moving things around.

### Contributions

If you would like to contribute or you find an error, please open an issue/PR as necessary.

### Dependencies

    virtualenv ~/.sphinx
    npm install
    pip3 install -U --user -r requirements.txt

### Building

    make html SPHINXOPTS=-Ea

### Test locally

    ./generate-cert.sh
    ./serve.py

Then open https://localhost:8443/ in your browser.

### Contributing

Non-theme specific assets and overrides are kept here. For example, we have a
Gruvbox theme for prismjs and a custom freeipa extension for prismjs.
`style.css` overrides changes from `theme.css`.

    source/_static/
    ├── css
    ├── favicon.ico
    ├── img
    └── js

In `source/themes/sphinx_rtd_theme/` we've forked and vendored
`sphinx-rtd-theme`. There are a number of changes including personal
preferences ranging from the color scheme, reducing bandwidth usage by removing
things we don't need (like FontAwesome or unnecessary JavaScript). 

`theme.css` must be non-minified so it can be bundled later, do so by running:

    ./node_modules/clean-css-cli/bin/cleancss --format beautify source/themes/sphinx_rtd_theme/static/css/theme.css

In order to rebase to the latest `sphinx-rtd-theme` version, copy it over from
the latest installation (find it in your virtualenv) then merge.

#### Sphinx conventions

We do not follow the traditional conventions for headers, mainly because it
would be too time consuming to go back and change it.

```
Page title
^^^^^^^^^^

First level heading
-------------------

Second level heading
********************
```
