import type { editor } from "monaco-editor";

export class Config {
    public static monaco_config(): editor.IStandaloneEditorConstructionOptions {
        return {
            value: undefined,
            language: undefined,
            automaticLayout: true,
            lineNumbers: "relative",
            minimap: { enabled: false },
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            theme: "vs-dark",
            renderLineHighlight: 'none',
            selectionHighlight: false,
            occurrencesHighlight: "off",
            mouseWheelZoom: true,
            fontFamily: 'Fira Code',
            fontLigatures: true,
            wordWrap: "off",
            scrollbar: {
                verticalScrollbarSize: 0,
                horizontalScrollbarSize: 0,
            },
            stickyScroll: {
                enabled: false
            },
            renderWhitespace: "none",
            lineNumbersMinChars: 3,
            guides: {
                bracketPairs: false,
                highlightActiveBracketPair: false,
                highlightActiveIndentation: false,
                indentation: false
            },
            suggestOnTriggerCharacters: false,
            quickSuggestions: false,
            parameterHints: {
                enabled: false
            },
            acceptSuggestionOnCommitCharacter: false,
            acceptSuggestionOnEnter: "off",
            snippetSuggestions: "none"
        }
    }
}