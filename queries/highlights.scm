; Highlighting for k (capture names as Neovim and other tree-sitter editors know them).

(comment) @comment @spell

; ---- literals ----
(int_literal) @number
(float_literal) @number.float
(duration_literal) @number
(char_literal) @character
(string_literal) @string
(raw_string_literal) @string
(escape_sequence) @string.escape
(interpolation
  "${" @punctuation.special
  "}" @punctuation.special) @none
(boolean) @boolean
(null) @constant.builtin

; ---- names ----
(identifier) @variable
(self) @variable.builtin

((identifier) @constant
  (#lua-match? @constant "^[A-Z][A-Z0-9_]+$"))

(type_identifier) @type
((type_identifier) @type.builtin
  (#any-of? @type.builtin
    "int" "i8" "i16" "i32" "i64" "u8" "u16" "u32" "u64" "uint" "f32" "f64" "bool" "char" "string" "error" "any" "void"
    "Duration" "Map" "Chan" "Mutex" "Nullable" "Thread" "Arena" "Self"))

(package_clause name: (identifier) @module)
(import_declaration alias: (identifier) @module)
(qualified_type package: (identifier) @module)

(const_declaration name: (identifier) @constant)
(struct_declaration name: (identifier) @type.definition)
(enum_declaration name: (identifier) @type.definition)
(interface_declaration name: (identifier) @type.definition)
(type_parameter name: (identifier) @type.definition)
(enum_variant name: (identifier) @constant)
(variant_name) @constant
(field_declaration name: (identifier) @variable.member)
(field_initializer name: (identifier) @variable.member)
(field_expression field: (identifier) @variable.member)
(named_argument name: (identifier) @variable.parameter)
(parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(lambda parameters: (identifier) @variable.parameter)
(labeled_statement label: (identifier) @label)
(break_statement label: (identifier) @label)
(continue_statement label: (identifier) @label)

; ---- functions ----
(function_declaration name: (identifier) @function)
(function_signature name: (identifier) @function)
(operator_name) @operator
(call_expression function: (identifier) @function.call)
(call_expression function: (field_expression field: (identifier) @function.method.call))
(call_expression function: (instantiation_expression name: (identifier) @function.call))
(generic_call_expression function: (identifier) @function.call)

((call_expression function: (identifier) @function.builtin)
  (#any-of? @function.builtin "print" "eprint" "panik" "new" "make" "len" "clone" "error" "timeout" "free"))
((generic_call_expression function: (identifier) @function.builtin)
  (#any-of? @function.builtin "make" "zero" "default"))

; conversions written as calls: `int(x)`, `f64(n)`
((call_expression function: (identifier) @type.builtin)
  (#any-of? @type.builtin
    "int" "i8" "i16" "i32" "i64" "u8" "u16" "u32" "u64" "uint" "f32" "f64" "bool" "char" "string" "Duration"))

; ---- keywords ----
["package" "import"] @keyword.import
["func" "operator"] @keyword.function
["struct" "enum" "interface" "extend"] @keyword.type
["const" "let" "extern" "derive" "where" "defer"] @keyword
(visibility) @keyword.modifier
["if" "else" "match"] @keyword.conditional
["for" "while" "do" "in" "break" "continue"] @keyword.repeat
"return" @keyword.return
["spawn" "select"] @keyword.coroutine
["is" "as?"] @keyword.operator
(select_arm "default" @keyword.conditional)
(wildcard) @character.special

; ---- operators and punctuation ----
[
  "+" "-" "*" "/" "%" "&" "|" "^" "~" "!" "<<" ">>" "&&" "||" "??"
  "==" "!=" "<" ">" "<=" ">=" "=" "+=" "-=" "*=" "/=" "%=" "&=" "|=" "^=" "<<=" ">>="
  ".." "..=" "=>" "->" "?" "..."
] @operator

["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," "." "?." ":" "::"] @punctuation.delimiter
(type_arguments ["<" ">"] @punctuation.bracket)
(type_parameters ["<" ">"] @punctuation.bracket)

(decorator "@" @attribute)
(decorator name: (identifier) @attribute)
(decorator_argument key: (identifier) @property)
