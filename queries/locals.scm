; Scopes, definitions and references (for "go to the local definition" and for
; highlighting a name by what it was declared as).

[
  (source_file)
  (function_declaration)
  (block)
  (lambda)
  (match_arm)
  (select_arm)
  (for_statement)
] @local.scope

(parameter name: (identifier) @local.definition.parameter)
(lambda_parameter name: (identifier) @local.definition.parameter)
(lambda parameters: (identifier) @local.definition.parameter)
(variable_declaration name: (identifier) @local.definition.var)
(for_statement index: (identifier) @local.definition.var)
(for_statement value: (identifier) @local.definition.var)
(type_pattern name: (identifier) @local.definition.var)
(select_arm binding: (identifier) @local.definition.var)
(const_declaration name: (identifier) @local.definition.constant)
(function_declaration name: (identifier) @local.definition.function)
(import_declaration alias: (identifier) @local.definition.namespace)

(identifier) @local.reference
