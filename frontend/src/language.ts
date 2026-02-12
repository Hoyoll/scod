import { languages } from "monaco-editor";

export type Ext = {
    [key: string]: string
}

export const Ext: Ext = {
    "rs": "rust",
    "c": "c",
    "php": "php",
    "ts": "typescript",
    "json": "json",
    "toml": "toml"
}


export function setup_highlighter() {
    languages.register({
        id: "mine"
    })
    languages.setMonarchTokensProvider("mine", {
        keywords: [
            'pub', 'struct', 'fn', 'impl', 'let', 'const', 'enum', 'mod', 'use', 'return',
            'match', 'while', 'loop', 'for', 'as',
        ],
        // the tokenizer
        tokenizer: {
            root: [

                // Keywords
                // keyword / identifier handling
                [/\b[a-zA-Z_]\w*\b/, {
                    cases: {
                        '@keywords': 'keyword',   // use keywords array
                        // '@default': 'identifier'  // everything else
                    }
                }],
                // [/\b(?:pub|match|struct|fn|impl|let|const|enum|mod|use|return)\b/, 'keyword'],

                // Types: Capitalized identifiers
                [/\b[A-Z][\w]*\b/, 'type.identifier'],

                // Constants: ALL_CAPS
                [/\b[A-Z_][A-Z0-9_]*\b/, 'constant'],

                // Functions / Methods: identifiers followed by (
                [/\b[a-z_]\w*(?=\s*\()/, 'function'],

                // Normal identifiers (variables)
                [/[a-z_]\w*/, 'identifier'],

                // Brackets
                [/[{}()\[\]]/, 'delimiter.bracket'],

                // Numbers
                [/\b\d+(\.\d+)?\b/, 'number'],

                // Strings
                [/".*?"/, 'string'],

                // Comments
                [/\/\/.*/, 'comment'],
                [/\/\*.*\*\//, 'comment'],
            ]
        }
    })
}