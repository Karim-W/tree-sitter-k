# tree-sitter-k — the tree-sitter grammar for k.
#
#   make            build/k.so, the parser as editors load it (from the generated src/parser.c)
#   make generate   src/ again from grammar.js (needs the tree-sitter CLI)
CC ?= cc

all: build/k.so

build/k.so: src/parser.c src/scanner.c
	@mkdir -p build
	$(CC) -shared -fPIC -O2 -Isrc -o $@ src/parser.c src/scanner.c

generate:
	tree-sitter generate

clean:
	rm -rf build

.PHONY: all generate clean
