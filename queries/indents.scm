; For nvim-treesitter's indentation.
[
  (block)
  (struct_body)
  (enum_body)
  (interface_body)
  (extend_body)
  (extern_block)
  (match_expression)
  (select_statement)
  (map_literal)
  (slice_literal)
  (struct_literal)
  (argument_list)
  (parameter_list)
] @indent.begin

["}" "]" ")"] @indent.branch @indent.end

(comment) @indent.auto
