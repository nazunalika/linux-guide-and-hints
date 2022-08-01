# SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
#
# SPDX-License-Identifier: MIT

from docutils import nodes
from docutils.parsers.rst import roles

from sphinx import addnodes
from sphinx.writers.html import Writer, HTMLTranslator as BaseTranslator


def setup(app):
    app.set_translator("html", HTMLTranslator)

    return {"version": "latest"}


class HTMLWriter(Writer):
    def __init__(self, builder):
        Writer.__init__(self)
        self.builder = builder


class HTMLTranslator(BaseTranslator):
    def __init__(self, builder, *args, **kwds):
        BaseTranslator.__init__(self, builder, *args, **kwds)

    def visit_literal_block(self, node):
        if node.rawsource != node.astext():
            # most probably a parsed-literal block -- don't highlight
            return BaseTranslator.visit_literal_block(self, node)
        lang = self.builder.config.highlight_language
        if "language" in node:
            lang = node["language"]
        highlighted = node[0]

        html = '<pre><code class="language-%s">%s</code></pre>' % (lang, highlighted)

        self.body.append(html)

        raise nodes.SkipNode
