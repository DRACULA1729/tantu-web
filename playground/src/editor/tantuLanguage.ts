// A CodeMirror 6 StreamLanguage for Tantu, authored from tantu/tokens.py (KEYWORDS) + the type
// names and operators in DESIGN.md. This is one of two artifacts derived from the same token set;
// the docs site's Shiki TextMate grammar (Phase 2) is the other.
import { StreamLanguage, LanguageSupport, type StringStream } from "@codemirror/language";

const KEYWORDS = new Set([
  "fn", "let", "var", "if", "elif", "else", "while", "for", "in", "loop",
  "break", "continue", "return", "match", "enum", "struct", "spawn", "select",
  "import", "and", "or", "not", "true", "false",
]);

// Built-in type names (DESIGN.md), highlighted distinctly from keywords.
const TYPES = new Set([
  "Int", "Float", "Bool", "Str", "Unit", "List", "Tuple", "Chan", "Option", "Result",
]);

// Call-position intrinsics / prelude builtins worth highlighting as functions.
const BUILTINS = new Set([
  "print", "len", "push", "get", "concat", "range", "float", "trunc", "parse_int",
  "split", "substring", "chars", "str", "chan", "send", "recv", "close", "sleep",
  "Some", "None", "Ok", "Err",
]);

const tantuParser = {
  startState() {
    return {};
  },
  token(stream: StringStream): string | null {
    if (stream.eatSpace()) return null;

    // line comments
    if (stream.peek() === "#") {
      stream.skipToEnd();
      return "comment";
    }

    // strings
    if (stream.peek() === '"') {
      stream.next();
      let escaped = false;
      let ch: string | void;
      while ((ch = stream.next()) !== undefined) {
        if (ch === '"' && !escaped) break;
        escaped = !escaped && ch === "\\";
      }
      return "string";
    }

    // numbers (int / float, with underscores)
    if (/[0-9]/.test(stream.peek() ?? "")) {
      stream.eatWhile(/[0-9_]/);
      if (stream.peek() === ".") {
        stream.next();
        stream.eatWhile(/[0-9_]/);
      }
      return "number";
    }

    // identifiers / keywords / types
    if (/[A-Za-z_]/.test(stream.peek() ?? "")) {
      stream.eatWhile(/[A-Za-z0-9_]/);
      const word = stream.current();
      if (KEYWORDS.has(word)) return "keyword";
      if (TYPES.has(word)) return "typeName";
      if (BUILTINS.has(word)) return "variableName.function";
      // Capitalized non-type idents read as variant/type constructors.
      if (/^[A-Z]/.test(word)) return "typeName";
      return "variableName";
    }

    // multi-char operators first
    for (const op of ["->", "=>", "==", "!=", "<=", ">="]) {
      if (stream.match(op)) return "operator";
    }
    // single-char operators / punctuation
    if (stream.match(/[:=<>+\-*/%?.,]/)) return "operator";
    if (stream.match(/[()[\]]/)) return "bracket";

    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "#" },
    indentOnInput: /^\s*(elif|else)\b/,
  },
};

export function tantu(): LanguageSupport {
  return new LanguageSupport(StreamLanguage.define(tantuParser));
}
