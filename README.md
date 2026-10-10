# tree-sitter-k

The [tree-sitter](https://tree-sitter.github.io) grammar for k, with the
queries editors use: highlights, folds, indents, locals, injections.

    make            # build/k.so
    make generate   # after a change to grammar.js (needs the tree-sitter CLI)

The Neovim plugin (`../k.nvim`) installs the parser and the queries.
