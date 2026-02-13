import { editor, KeyCode, KeyMod, Uri } from "monaco-editor"
import { Ext } from "./language"
import { MANUAL } from "./man"
import { type Message } from "./message_type"
import { Command } from "./widget"


type Result<T, A> = {
    ok: (value: T) => void
    err: (value: A) => void
}



class Buffer {
    get_shell(): editor.ITextModel {
        let model = editor.getModel(Uri.file("shell.md"))
        if (!model) {

            return editor.createModel(``, "markdown", Uri.file("shell.md"))
        }
        return model
    }

    get_man(): editor.ITextModel {
        let model = editor.getModel(Uri.file("man.md"))
        if (!model) {
            return editor.createModel(MANUAL, "markdown", Uri.file("man.md"))
        }
        return model
    }

    next() {

    }

    prev() {

    }

    new(key: string, value: string, ext: string) {
        editor.createModel(value, ext, Uri.file(key))
    }

    get(key: string, handlers: Result<editor.ITextModel, void>) {
        let m = editor.getModel(Uri.file(key))
        if (m === null) {
            return handlers.err()
        }
        return handlers.ok(m)
    }
}

export class Editor {
    private command: Command
    private buffer: Buffer
    private editor: editor.IStandaloneCodeEditor
    constructor(doc: HTMLDivElement) {
        let channel = (message: Message) => {
            this.receive(message)
        }
        this.buffer = new Buffer()
        this.command = new Command(channel)
        this.setup_command()

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
        this.editor.setModel(this.buffer.get_man())
        this.setup_widget()
        // this.editor.setModel(null)
        this.receive({
            tag: "LOCAL",
            payload: {
                action: "FOCUS",
                for: "EDITOR"
            }
        })
        this.send({ tag: "WINDOW", payload: { tag: "READY" } })
        console.log("setup finished!")
    }

    private setup_widget() {
        this.editor.addOverlayWidget(this.command)
        editor.createModel("", "markdown", Uri.file("shell.buff"))
    }

    private send(message: Message) {
        window.ipc.postMessage(JSON.stringify(message))
    }

    public receive(message: Message) {
        switch (message.tag) {
            case "INPUT":
                switch (message.payload.tag) {
                    case "SHELL":
                        this.send(message)
                        break
                    case "PATH":
                        this.buffer.get(message.payload.payload, {
                            ok: (model) => {
                                this.editor.setModel(model)
                                this.editor.focus()
                            },
                            err: () => {
                                this.send(message)
                            }
                        })
                        break
                }
                break
            case "OUTPUT":
                let status = `[${message.payload.out.tag}]`;

                let mo = this.buffer.get_shell()
                let last_line = mo.getLineCount();
                let last_column = mo.getLineMaxColumn(last_line);
                mo.pushEditOperations(
                    null,
                    [{
                        range: {
                            startLineNumber: last_line,
                            startColumn: last_column,
                            endLineNumber: last_line,
                            endColumn: last_column
                        },
                        text: status + `[PID: ${message.payload.id}]: ` + message.payload.out.payload + '\n'
                    }],
                    () => null
                )
                break
            case "BUFFER":
                switch (message.payload.tag) {
                    case "NEW":
                        let model = editor.createModel(message.payload.payload.buffer, Ext[message.payload.payload.ext], Uri.file(message.payload.payload.path))
                        this.editor.setModel(model)
                        this.editor.focus()
                        break
                    case "EDIT":
                        editor.getModel(Uri.file(message.payload.payload.path))
                            ?.setValue(message.payload.payload.buffer)
                        break
                    case "ERROR":
                        let mo = this.buffer.get_shell()
                        let last_line = mo.getLineCount();
                        let last_column = mo.getLineMaxColumn(last_line);
                        mo.pushEditOperations(
                            null,
                            [{
                                range: {
                                    startLineNumber: last_line,
                                    startColumn: last_column,
                                    endLineNumber: last_line,
                                    endColumn: last_column
                                },
                                text: `[IO-ERROR]: ` + message.payload.payload + '\n'
                            }],
                            () => null
                        )
                        break
                }
                break
            case "LOCAL":
                switch (message.payload.action) {
                    case "FOCUS":
                        switch (message.payload.for) {
                            case "EDITOR":
                                this.editor.focus()
                                break
                            case "COMMAND":
                                this.command.focus()
                                break
                        }
                        break
                    case "CLOSE":
                        switch (message.payload.for) {
                            case "EDITOR":
                                let m = this.editor.getModel()
                                this.editor.setModel(this.buffer.get_man())
                                m?.dispose()
                                break
                            case "COMMAND":
                                this.editor.focus()
                                break
                        }
                        break
                    case "META":
                        switch (message.payload.for.action) {
                            case "pe":
                                let model = this.editor.getModel()
                                if (!model) {
                                    return
                                }
                                let [_, ...path] = model.uri.path
                                this.send({
                                    tag: "BUFFER", payload: {
                                        tag: "EDIT", payload: {
                                            buffer: model.getValue(),
                                            path: path.join("").trim()
                                        }
                                    }
                                })

                                break
                            case "bc":
                                this.receive({
                                    tag: "LOCAL", payload: {
                                        for: "EDITOR", action: "CLOSE"
                                    }
                                })
                                break
                            case "to":
                                let pos = this.editor.getPosition()!
                                this.editor.setPosition({
                                    lineNumber: message.payload.for.arg,
                                    column: pos.column
                                })
                                this.editor.revealPosition({
                                    lineNumber: message.payload.for.arg,
                                    column: pos.column
                                })
                                break
                            case "jm":
                                let p = this.editor.getPosition()!
                                let new_pos = p.lineNumber + message.payload.for.arg;
                                this.editor.setPosition({
                                    lineNumber: new_pos,
                                    column: p.column
                                })
                                this.editor.revealPosition({
                                    lineNumber: new_pos,
                                    column: p.column
                                })
                                break
                            case "wf":
                                break
                        }
                        break
                }
        }
    }

    private setup_command() {
        editor.addCommand({
            id: "jump.up",
            run: () => {
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "META", for: {
                            action: "jm", arg: -5
                        }
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.Alt | KeyCode.KeyW,
            command: "jump.up"
        })


        editor.addCommand({
            id: "jump.down",
            run: () => {
                // let pos = this.editor.getPosition()!
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "META", for: {
                            action: "jm", arg: 5
                        }
                    }
                })
            }
        })


        editor.addKeybindingRule({
            keybinding: KeyMod.Alt | KeyCode.KeyS,
            command: "jump.down"
        })

        editor.addCommand({
            id: "editor.focus",
            run: () => {
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "FOCUS",
                        for: "EDITOR"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.Alt | KeyCode.KeyE,
            command: "editor.focus"
        })


        editor.addCommand({
            id: 'scod.command',
            run: () => {
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "FOCUS",
                        for: "COMMAND"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.CtrlCmd | KeyCode.Period,
            command: "scod.command"
        })

        editor.addCommand({
            id: 'close.command',
            run: () => {
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "CLOSE", for: "COMMAND"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Period,
            command: 'close.command'
        })

        editor.addCommand({
            id: 'zoom-in',
            run: () => {
                this.send({
                    tag: "WINDOW", payload: {
                        tag: "ZOOMIN"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.CtrlCmd | KeyCode.Equal,
            command: "zoom-in",
        })

        editor.addCommand({
            id: 'zoom-out',
            run: () => {
                this.send({
                    tag: "WINDOW", payload: {
                        tag: "ZOOMOUT"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.CtrlCmd | KeyCode.Minus,
            command: "zoom-out",
        })

        editor.addCommand({
            id: 'close.buffer',
            run: () => {
                this.receive({
                    tag: "LOCAL", payload: {
                        for: "EDITOR",
                        action: "CLOSE"
                    }
                })
            }
        })

        editor.addKeybindingRule({
            keybinding: KeyMod.CtrlCmd | KeyCode.KeyW,
            command: 'close.buffer'
        })
    }
}