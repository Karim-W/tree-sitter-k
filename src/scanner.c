/* The newline that ends a statement.
 *
 * It is asked for only where the grammar can use one; everywhere else line
 * breaks are plain white space. A block comment that contains a line break
 * ends the statement before it too, as it does for the compiler: that one is
 * reported as a newline of no width, and the comment is then read as the
 * comment it is. */
#include "tree_sitter/parser.h"

enum TokenType { NEWLINE, ERROR_SENTINEL };

void *tree_sitter_k_external_scanner_create(void) { return NULL; }
void tree_sitter_k_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_k_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}
void tree_sitter_k_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    (void)payload;
    (void)buffer;
    (void)length;
}

bool tree_sitter_k_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    (void)payload;
    /* (while recovering from an error everything is "valid": stay out of it) */
    if (valid_symbols[ERROR_SENTINEL] || !valid_symbols[NEWLINE]) return false;
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\r') lexer->advance(lexer, true);
    if (lexer->lookahead == '\n') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
        lexer->result_symbol = NEWLINE;
        return true;
    }
    if (lexer->lookahead != '/') return false;
    /* a block comment: does it run over a line break? */
    lexer->mark_end(lexer);
    lexer->advance(lexer, false);
    if (lexer->lookahead != '*') return false;
    lexer->advance(lexer, false);
    bool broken = false;
    while (!lexer->eof(lexer)) {
        if (lexer->lookahead == '\n') broken = true;
        if (lexer->lookahead == '*') {
            lexer->advance(lexer, false);
            if (lexer->lookahead == '/') break;
            continue;
        }
        lexer->advance(lexer, false);
    }
    if (!broken) return false;
    lexer->result_symbol = NEWLINE;
    return true;
}
