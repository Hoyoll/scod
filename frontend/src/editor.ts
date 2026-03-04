import { editor } from "monaco-editor"
import { ABuffer } from "./buffer"
import { Ext } from "./language"
import { type Alias, type Message, type MTable, type Port } from "./message_type"

export class Editor {
    private buffer: ABuffer
    private editor: editor.IStandaloneCodeEditor
    private port: Port = {}
    private meta: MTable = {}
    // private widget: HTMLElement
    constructor(doc: HTMLDivElement) {
        this.buffer = new ABuffer()
        // this.widget = widget
        this.editor = editor.create(doc, {
            value: undefined,
            language: undefined,
            automaticLayout: true,
            lineNumbers: "relative",
            minimap: { enabled: false },
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            theme: "nightowl",
            renderLineHighlight: 'none',
            selectionHighlight: false,
            occurrencesHighlight: "off",
            mouseWheelZoom: true,
            fontFamily: 'Fira Code',
            fontLigatures: true,
            // scrollBeyondLastLine: false,
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

        })
        this.setup_widget()
        this.send({ tag: "WINDOW", payload: { tag: "READY" } })

        console.log("setup finished!")
    }

    private setup_widget() {
        /// this is for dev mode XD
        this.receive({
            tag: "ALIAS", payload: "./plugin/builtin.ts"
        })
        this.receive({
            tag: "BUFFER", payload: {
                tag: "FOCUS"
            }
        })
    }

    private send(message: Message) {
        window.ipc.postMessage(JSON.stringify(message))
    }

    public receive(message: Message) {
        console.log(message)
        switch (message.tag) {
            case "WINDOW":
                this.send(message)
                break
            case 'MODULE':
                this.send(message)
                break
            case 'PORT':
                this.port[message.payload.key](message.payload.data)
                break
            case "BUFFER":
                switch (message.payload.tag) {
                    case "NEW":
                        this.buffer.register(message.payload.payload.path, message.payload.payload.buffer, Ext[message.payload.payload.ext])
                        this.receive({
                            tag: "BUFFER", payload: {
                                tag: "OPEN", payload: message.payload.payload.path
                            }
                        })
                        break
                    case "SAVE":
                        switch (message.payload.payload.for) {
                            case "CURRENT":

                                let model = this.editor.getModel()
                                if (model) {

                                    let [_, ...path] = model.uri.path
                                    this.receive({
                                        tag: "BUFFER", payload: {
                                            tag: "WRITE", payload: {
                                                path: path.join(""),
                                                buffer: model.getValue()
                                            }
                                        }
                                    })
                                }
                                break
                            case "PATH":
                                let path = message.payload.payload.path
                                this.buffer.find(path, {
                                    ok: (model) => {
                                        this.receive({
                                            tag: "BUFFER", payload: {
                                                tag: "WRITE", payload: {
                                                    path: path,
                                                    buffer: model.model.getValue()
                                                }
                                            }
                                        })
                                    },
                                    err: () => { }
                                })
                                break

                        }
                        break
                    case "WRITE":
                        this.send(message)
                        break
                    case "OPEN":
                        this.buffer.find(message.payload.payload, {
                            ok: (model) => {
                                let mo = this.editor.getModel()
                                if (mo) {
                                    let [_, ...rest] = mo.uri.path
                                    this.buffer.set_vs(rest.join(""), this.editor.saveViewState())
                                }
                                this.editor.setModel(model.model)
                                this.editor.restoreViewState(model.view_state)
                            },
                            err: () => {
                                this.send(message)
                            }
                        })
                        break
                    case "FOCUS":
                        this.editor.focus()
                        break
                    case "CLOSE":
                        let m = this.editor.getModel()
                        if (m) {
                            let [_, ...rest] = m.uri.path
                            this.buffer.delete(rest.join(""))
                            this.buffer.get_last({
                                ok: (file) => {
                                    this.receive({
                                        tag: "BUFFER", payload: {
                                            tag: "OPEN", payload: file
                                        }
                                    })
                                },
                                err: () => {
                                    this.receive({
                                        tag: "BUFFER", payload: {
                                            tag: "OPEN", payload: "fallback.md"
                                        }
                                    })
                                }
                            })
                            m.dispose()

                        }
                        break
                    case "STATUS":
                        // this.editor.addOverlayWidget()
                        console.log("TO-DO")

                        break
                    case "EDIT":
                        let line = message.payload.payload.line
                        let column = message.payload.payload.column
                        let path = message.payload.payload.path
                        let text = message.payload.payload.text
                        this.buffer.find(path, {
                            ok: (model) => {
                                const LIMIT = 0
                                if (line.start === LIMIT) {
                                    line.start = model.model.getLineCount()
                                }
                                if (column.start === LIMIT) {
                                    column.start = model.model.getLineMaxColumn(model.model.getLineCount())
                                }

                                if (line.end === LIMIT) {
                                    line.end = model.model.getLineCount()
                                }
                                if (column.end === LIMIT) {
                                    column.end = model.model.getLineMaxColumn(model.model.getLineCount())
                                }
                                model.model.pushEditOperations(
                                    null,
                                    [{
                                        range: {
                                            startLineNumber: line.start,
                                            startColumn: column.start,
                                            endLineNumber: line.end,
                                            endColumn: column.end
                                        },
                                        text: text + `\n`
                                    }],
                                    () => null
                                )
                            },
                            err: () => {
                                console.log("TO-DO")
                            }
                        })
                        break
                }
                break
            // case "WINDOW":
            case "COMMAND":
                let [current_cmd, ...args] = message.payload.trim().split(" ")
                this.meta[current_cmd].proc(args.join(" "))()

                break
            case "ALIAS":
                import(message.payload).then((plugin) => {
                    let al = plugin.setup((msg: Message) => {
                        this.receive(msg)
                    }) as Alias
                    if (al) {
                        for (const key in al.meta) {
                            this.meta[key] = al.meta[key]
                        }
                        for (const key in al.port) {
                            this.port[key] = al.port[key]
                        }
                        if (al.widget) {
                            this.editor.addOverlayWidget(al.widget)
                            // this.widget.appendChild(al.widget)
                        }

                        if (al.onload) {
                            al.onload(this.editor)
                        }
                    }
                })
                break
            case "CURSOR":
                switch (message.payload.tag) {
                    case "MOVE":
                        let pos = this.editor.getPosition()
                        if (!pos) {
                            return
                        }
                        let new_pos = {
                            lineNumber: pos.lineNumber + message.payload.payload.line,
                            column: pos.column + message.payload.payload.column
                        }
                        this.editor.setPosition(new_pos)
                        this.editor.revealPosition(new_pos)
                        break
                    case "JUMP":
                        this.editor.setPosition({
                            lineNumber: message.payload.payload.line,
                            column: message.payload.payload.column
                        })
                        this.editor.revealPosition({
                            lineNumber: message.payload.payload.line,
                            column: message.payload.payload.column
                        })
                        break
                    case "SELECT":
                        // this.editor.setSele
                        this.editor.setSelection({
                            startLineNumber: message.payload.payload.line.start,
                            endLineNumber: message.payload.payload.line.end,
                            startColumn: message.payload.payload.column.start,
                            endColumn: message.payload.payload.column.end
                        })
                        break
                    case "INSERT":
                        let p = this.editor.getPosition()
                        if (!p) {
                            return
                        }
                        let m = this.editor.getModel()
                        if (!m) {
                            return
                        }
                        m.pushEditOperations(null,
                            [{
                                range: {
                                    startLineNumber: p.lineNumber,
                                    startColumn: p.column,
                                    endLineNumber: p.lineNumber,
                                    endColumn: p.column
                                },
                                text: message.payload.payload
                            }],
                            () => null)
                        break
                }
                break
        }
    }

}