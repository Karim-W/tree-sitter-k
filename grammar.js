/**
 * @file A tree-sitter grammar for k.
 *
 * Statements end at a newline wherever one can end (as in the language: a
 * line that stops after an operator, a comma or an opening bracket goes on),
 * and a line that starts with `.` continues the one before.
 *
 * A newline is a token of its own kind here (src/scanner.c): it is one only
 * where the grammar can use it, and a block comment with a line break in it
 * counts as one, as it does for the compiler.
 *
 * `x {` is a struct literal or `x` followed by a block, whichever what stands
 * between the braces turns out to be (`name: value` pairs, or statements).
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  ternary: 1,
  coalesce: 2,
  range: 3,
  or: 4,
  and: 5,
  compare: 6,
  add: 7,
  multiply: 8,
  unary: 9,
  postfix: 10,
  primary: 11,
};

/** One or more of `rule`, separated by commas, with an optional trailing one. */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

/** Items one to a line (or several on one, in braces). */
function lines($, rule) {
  return seq(repeat(seq(rule, $._newline)), optional(rule));
}

module.exports = grammar({
  name: 'k',

  extras: $ => [/\s/, $.comment],

  externals: $ => [$._newline, $._error_sentinel],

  word: $ => $.identifier,

  supertypes: $ => [$._expression, $._statement, $._type, $._declaration],

  conflicts: $ => [
    // `(a)` and `(a, b)`: an expression in parentheses, or a lambda's parameters
    [$._expression, $.lambda_parameter],
    // `a < b`: a comparison, or the start of type arguments
    [$._expression, $.generic_type],
    [$._expression, $.generic_type, $._type_name],
    [$._expression, $._type_name],
    // `Name x` in a pattern: a type and what it binds, or a variant
    [$._pattern, $._type_name],
    [$.variant_pattern, $._type_name],
    [$.qualified_identifier, $._expression],
    [$.qualified_identifier, $.field_expression],
    [$.slice_type, $.slice_literal],
    [$.parameter_list, $._expression],
    [$.select_arm, $._expression],
    [$.labeled_statement, $._expression],
    [$.assignment_statement, $.expression_statement],
    [$.if_expression],
    [$.range_expression],
    [$.return_statement],
    [$._expression, $.struct_literal],
    [$.generic_type, $.generic_call_expression],
    [$.generic_type, $._expression, $.generic_call_expression],
    [$._expression, $.generic_call_expression],
    [$._arm_body, $.field_expression],
    [$.field_declaration, $.field_expression],
    [$.do_statement, $.field_expression],
    [$.variable_declaration, $.field_expression],
    [$.assignment_statement, $.field_expression],
    [$.return_statement, $.field_expression],
    [$.expression_statement, $.field_expression],
    [$.const_declaration, $.field_expression],
    [$._expression, $.lambda],
    [$._type_name, $.qualified_type],
    [$._type_name, $.generic_type],
    [$.qualified_type, $._expression],
  ],

  rules: {
    source_file: $ => lines($, choice($._declaration, $.package_clause, $.import_declaration)),

    // ---- declarations ----

    package_clause: $ => seq('package', field('name', $.identifier)),

    // `import "p"`, `import g "p"` (another name), `import . "p"` (its names without its name)
    import_declaration: $ => seq('import', optional(choice(field('alias', $.identifier), field('open', '.'))), field('path', $.string_literal)),

    _declaration: $ => choice(
      $.const_declaration,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.interface_declaration,
      $.extend_declaration,
      $.extern_block,
      $.decorator,
    ),

    // `@json(key: "id", skip)` on the line above a field or a struct
    decorator: $ => seq(
      '@',
      field('name', $.identifier),
      optional(seq('(', commaSep($.decorator_argument), ')')),
    ),

    decorator_argument: $ => choice(
      seq(field('key', $.identifier), ':', field('value', $._expression)),
      field('value', $._expression),
    ),

    visibility: _ => 'pub',

    derive: $ => seq('derive', '(', commaSep1($.identifier), ')'),

    const_declaration: $ => seq(
      optional($.visibility),
      'const',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    function_declaration: $ => seq(
      optional($.visibility),
      'func',
      field('name', choice($.identifier, $.operator_name)),
      optional(field('type_parameters', $.type_parameters)),
      field('parameters', $.parameter_list),
      optional(seq('->', field('result', $._result))),
      optional($.where_clause),
      field('body', $.block),
    ),

    // (in an interface or an `extern` block: no body)
    function_signature: $ => seq(
      optional($.visibility),
      'func',
      field('name', choice($.identifier, $.operator_name)),
      optional(field('type_parameters', $.type_parameters)),
      field('parameters', $.parameter_list),
      optional(seq('->', field('result', $._result))),
    ),

    operator_name: _ => seq('operator', token.immediate(choice(
      '==', '!=', '<=', '>=', '<<=', '>>=', '<<', '>>', '<', '>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
      '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '[]=', '[]',
    ))),

    type_parameters: $ => seq('<', commaSep1($.type_parameter), '>'),

    type_parameter: $ => seq(field('name', $.identifier), optional(seq(':', $._bounds))),

    _bounds: $ => seq($._type, repeat(seq('+', $._type))),

    where_clause: $ => seq('where', commaSep1(seq($.identifier, ':', $._bounds))),

    parameter_list: $ => seq('(', commaSep(choice($.parameter, $.self_parameter)), ')'),

    self_parameter: $ => seq(optional('let'), $.self),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      optional('...'),
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    ),

    _result: $ => choice($._type, $.result_list),

    result_list: $ => seq('(', $._type, repeat1(seq(',', $._type)), ')'),

    struct_declaration: $ => seq(
      optional($.derive),
      optional($.visibility),
      'struct',
      field('name', $.identifier),
      optional(field('type_parameters', $.type_parameters)),
      field('body', $.struct_body),
    ),

    struct_body: $ => seq('{', lines($, choice($.decorator, $.field_declaration, $.function_declaration)), '}'),

    field_declaration: $ => seq(
      optional($.visibility),
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    ),

    enum_declaration: $ => seq(
      optional($.derive),
      optional($.visibility),
      'enum',
      field('name', $.identifier),
      optional(field('type_parameters', $.type_parameters)),
      field('body', $.enum_body),
    ),

    enum_body: $ => seq('{', lines($, choice($.enum_variant, $.function_declaration)), '}'),

    enum_variant: $ => seq(field('name', $.identifier), optional(seq('(', commaSep1($._type), ')'))),

    interface_declaration: $ => seq(
      optional($.visibility),
      'interface',
      field('name', $.identifier),
      optional(field('type_parameters', $.type_parameters)),
      field('body', $.interface_body),
    ),

    interface_body: $ => seq('{', lines($, choice($.function_signature, $._type)), '}'),

    extend_declaration: $ => seq(optional($.visibility), 'extend', field('type', $._type), field('body', $.extend_body)),

    extend_body: $ => seq('{', lines($, $.function_declaration), '}'),

    extern_block: $ => seq('extern', field('library', $.string_literal), '{', lines($, $.function_signature), '}'),

    // ---- types ----

    _type: $ => choice(
      $._type_name,
      $.generic_type,
      $.pointer_type,
      $.reference_type,
      $.slice_type,
      $.array_type,
      $.function_type,
    ),

    _type_name: $ => choice(alias($.identifier, $.type_identifier), $.qualified_type),

    qualified_type: $ => seq(field('package', $.identifier), '.', field('name', alias($.identifier, $.type_identifier))),

    generic_type: $ => prec.dynamic(1, seq(
      field('name', choice(alias($.identifier, $.type_identifier), $.qualified_type)),
      field('arguments', $.type_arguments),
    )),

    type_arguments: $ => seq('<', commaSep1($._type), '>'),

    pointer_type: $ => prec(PREC.unary, seq('*', $._type)),
    reference_type: $ => prec(PREC.unary, seq('&', $._type)),
    slice_type: $ => prec(PREC.unary, seq('[', ']', $._type)),
    array_type: $ => prec(PREC.unary, seq('[', $.int_literal, ']', $._type)),
    // `(A, B) -> R`; several results in parentheses: `(A) -> (R, S)`
    function_type: $ => prec.right(seq('(', commaSep($._type), ')', '->', choice($._type, $.result_list))),

    // ---- statements ----

    block: $ => seq('{', lines($, $._statement), '}'),

    _statement: $ => choice(
      $.variable_declaration,
      $.assignment_statement,
      $.expression_statement,
      $.while_statement,
      $.do_statement,
      $.for_statement,
      $.labeled_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.defer_statement,
      $.select_statement,
      $.block,
    ),

    variable_declaration: $ => seq(
      choice('let', 'const'),
      commaSep1(field('name', $.identifier)),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    assignment_statement: $ => seq(
      field('left', seq($._expression, repeat(seq(',', $._expression)))),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=')),
      field('right', $._expression),
    ),

    expression_statement: $ => $._expression,

    while_statement: $ => seq('while', field('condition', $._expression), field('body', $.block)),

    do_statement: $ => seq('do', field('body', $.block), 'while', field('condition', $._expression)),

    for_statement: $ => seq(
      'for',
      optional(seq(
        optional(seq(field('index', $.identifier), ',')),
        field('value', $.identifier),
        'in',
        field('iterable', $._expression),
      )),
      field('body', $.block),
    ),

    labeled_statement: $ => seq(
      field('label', $.identifier),
      ':',
      choice($.while_statement, $.do_statement, $.for_statement),
    ),

    return_statement: $ => seq('return', optional(seq($._expression, repeat(seq(',', $._expression))))),

    break_statement: $ => prec.right(seq('break', optional(field('label', $.identifier)))),

    continue_statement: $ => prec.right(seq('continue', optional(field('label', $.identifier)))),

    defer_statement: $ => seq('defer', $._statement),

    select_statement: $ => seq('select', '{', lines($, $.select_arm), '}'),

    select_arm: $ => seq(
      choice(
        'default',
        seq(optional(seq(field('binding', $.identifier), '=')), field('operation', $._expression)),
      ),
      '=>',
      field('body', $._arm_body),
    ),

    _arm_body: $ => choice(
      $.block,
      $._expression,
      $.assignment_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
    ),

    // ---- expressions ----

    _expression: $ => choice(
      $.identifier,
      $.self,
      $._literal,
      $.parenthesized_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.range_expression,
      $.type_test_expression,
      $.call_expression,
      $.generic_call_expression,
      $.field_expression,
      $.index_expression,
      $.try_expression,
      $.struct_literal,
      $.slice_literal,
      $.map_literal,
      $.lambda,
      $.if_expression,
      $.match_expression,
      $.spawn_expression,
      $.generic_type,
      $.instantiation_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('-', '+', '!', '~', '*')),
      field('operand', $._expression),
    )),

    binary_expression: $ => {
      const table = [
        [PREC.coalesce, '??'],
        [PREC.or, '||'],
        [PREC.and, '&&'],
        [PREC.compare, choice('==', '!=', '<', '>', '<=', '>=')],
        [PREC.add, choice('+', '-', '|', '^')],
        [PREC.multiply, choice('*', '/', '%', '<<', '>>', '&')],
      ];
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $._expression),
        // @ts-ignore
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    ternary_expression: $ => prec.right(PREC.ternary, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    // `a..b`, `a..=b`, and in an index `..b`, `a..`
    range_expression: $ => prec.left(PREC.range, choice(
      seq(field('start', $._expression), choice('..', '..='), optional(field('end', $._expression))),
      seq('..', optional(field('end', $._expression))),
    )),

    type_test_expression: $ => prec.left(PREC.compare, seq(
      field('value', $._expression),
      field('operator', choice('is', 'as?')),
      field('type', $._type),
    )),

    call_expression: $ => prec(PREC.postfix, seq(
      field('function', $._expression),
      field('arguments', $.argument_list),
    )),

    // `max::<u8>`, `Stack::<int>`: a generic name with its type arguments spelled out
    instantiation_expression: $ => prec(PREC.postfix, seq(
      field('name', $._expression),
      '::',
      field('type_arguments', $.type_arguments),
    )),

    // `make<u8>(n)`: type arguments without `::`
    // (also after a member: `server.get<User>(...)`, `HashMap.new<string, int>()`)
    generic_call_expression: $ => prec.dynamic(2, seq(
      field('function', choice($.identifier, $.field_expression)),
      field('type_arguments', $.type_arguments),
      field('arguments', $.argument_list),
    )),

    argument_list: $ => seq('(', commaSep(choice($.named_argument, $._expression)), ')'),

    named_argument: $ => seq(field('name', $.identifier), ':', field('value', $._expression)),

    field_expression: $ => choice(
      prec(PREC.postfix, seq(
        field('object', $._expression),
        field('operator', choice('.', '?.')),
        field('field', $.identifier),
      )),
      // a line that starts with a dot continues the one before: whether a
      // newline ends the statement is only known from what follows it
      seq(
        field('object', $._expression),
        $._newline,
        field('operator', choice('.', '?.')),
        field('field', $.identifier),
      ),
    ),

    index_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      token.immediate('['),
      field('index', $._expression),
      ']',
    )),

    // `call()?`: hand the error to the caller (no space before the `?`)
    try_expression: $ => prec(PREC.postfix, seq($._expression, token.immediate('?'))),

    struct_literal: $ => seq(
      field('type', choice(alias($.identifier, $.type_identifier), $.qualified_type, $.generic_type, $.instantiation_expression)),
      '{',
      commaSep($.field_initializer),
      '}',
    ),

    field_initializer: $ => seq(field('name', $.identifier), ':', field('value', $._expression)),

    slice_literal: $ => seq('[', commaSep($._expression), ']'),

    map_literal: $ => prec(PREC.primary, seq('{', commaSep($.map_entry), '}')),

    map_entry: $ => seq(field('key', $._expression), ':', field('value', $._expression)),

    // (a precedence above none, so that the newline after its body ends it)
    lambda: $ => prec.right(PREC.ternary, seq(
      field('parameters', choice($.lambda_parameters, $.identifier)),
      optional(seq('->', field('result', $._type))),
      '=>',
      field('body', choice($.block, $._expression)),
    )),

    lambda_parameters: $ => seq('(', commaSep($.lambda_parameter), ')'),

    lambda_parameter: $ => seq(field('name', $.identifier), optional(seq(':', field('type', $._type)))),

    if_expression: $ => prec.right(seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional(seq('else', field('alternative', choice($.if_expression, $.block)))),
    )),

    match_expression: $ => seq('match', field('value', $._expression), '{', lines($, $.match_arm), '}'),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', $._arm_body),
    ),

    _pattern: $ => choice(
      $.wildcard,
      $._literal,
      $.negative_literal,
      $.variant_pattern,
      $.type_pattern,
      $.alternative_pattern,
      alias($.identifier, $.variant_name),
      $.qualified_identifier,
    ),

    negative_literal: $ => seq('-', choice($.int_literal, $.float_literal)),

    wildcard: _ => '_',

    variant_pattern: $ => seq(
      field('name', choice(alias($.identifier, $.variant_name), $.qualified_identifier)),
      '(',
      commaSep(choice($.wildcard, $.identifier, $._literal, $.negative_literal, $.variant_pattern)),
      ')',
    ),

    qualified_identifier: $ => seq($.identifier, repeat1(seq('.', $.identifier))),

    // `int n`, `[]u8 bytes`: a value of that type, bound to a name
    type_pattern: $ => seq(field('type', $._type), field('name', choice($.identifier, $.wildcard))),

    alternative_pattern: $ => prec.left(seq($._pattern, '|', $._pattern)),

    spawn_expression: $ => prec.right(PREC.ternary, seq('spawn', $._expression)),

    // ---- literals ----

    _literal: $ => choice(
      $.int_literal,
      $.float_literal,
      $.duration_literal,
      $.char_literal,
      $.string_literal,
      $.raw_string_literal,
      $.boolean,
      $.null,
    ),

    int_literal: _ => token(choice(
      /[0-9][0-9_]*/,
      /0[xX][0-9a-fA-F_]+/,
      /0[bB][01_]+/,
      /0[oO][0-7_]+/,
    )),

    float_literal: _ => token(choice(
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9]+)?/,
      /[0-9][0-9_]*[eE][+-]?[0-9]+/,
    )),

    duration_literal: _ => token(/[0-9][0-9_]*(ns|us|ms|s|m|h)/),

    char_literal: _ => token(seq("'", choice(/[^'\\\n]/, /\\[^u\n]/, /\\x[0-9a-fA-F]{2}/, /\\u\{[0-9a-fA-F]+\}/), "'")),

    string_literal: $ => seq(
      '"',
      repeat(choice($.string_content, $.escape_sequence, $.interpolation)),
      token.immediate('"'),
    ),

    string_content: _ => choice(token.immediate(prec(1, /[^"\\$\n]+/)), token.immediate('$')),

    escape_sequence: _ => token.immediate(choice(
      /\\[ntr\\"'0$]/,
      /\\x[0-9a-fA-F]{2}/,
      /\\u\{[0-9a-fA-F]+\}/,
      /\\./,
    )),

    interpolation: $ => seq(token.immediate('${'), $._expression, '}'),

    raw_string_literal: _ => token(seq('`', /[^`]*/, '`')),

    boolean: _ => choice('true', 'false'),

    null: _ => 'null',

    self: _ => 'self',

    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    comment: _ => token(choice(
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
});
