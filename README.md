# Linux Guide and Hints

The website is live at https://www.linuxguideandhints.com

First run: `git submodule update --init --recursive`

### Dependencies

    npm install -g grunt-cli
    npm install
    pip install --user sphinx

### Building

    make html SPHINXOPTS=-Ea
    grunt build

It's important to run the commands in that order. `make html` will build the docs, then `grunt build` does copying and minifying.

### Livereload

    grunt connect

Add `localhost.ssl` to your `/etc/hosts`, then visit `https://localhost.ssl:8443`. 

You will need a self-signed certificate. Run the convenience script `generate-cert.sh` provided in this repo.
