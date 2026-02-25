import { editor, KeyCode, KeyMod, Uri } from "monaco-editor"
import { ABuffer } from "./buffer"
import { Ext } from "./language"
import { MANUAL } from "./man"
import { type Channel, type Message } from "./message_type"
import { Meta } from "./meta"
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
    private buffer: ABuffer
    private editor: editor.IStandaloneCodeEditor
    private channel: Channel
    constructor(doc: HTMLDivElement) {
        this.channel = (message: Message) => {
            this.receive(message)
        }
        this.buffer = new ABuffer()
        this.command = new Command(this.channel)
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
        // this.editor.setModel(this.buffer.get_man())
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
        this.receive({
            tag: "OUTPUT", payload: {
                id: 0,
                out: {
                    tag: "OK",
                    payload: "Scod is ready to use!"
                }
            }
        })
        this.receive({
            tag: "INPUT", payload: {
                tag: "PATH", payload: "*shell.md"
            }
        })
        this.editor.addOverlayWidget(this.command)
    }

    private send(message: Message) {
        window.ipc.postMessage(JSON.stringify(message))
    }

    public receive(message: Message) {
        console.log(message)
        switch (message.tag) {
            case "INPUT":
                switch (message.payload.tag) {
                    case "SHELL":
                        this.send(message)
                        break
                    case "PATH":
                        this.buffer.find(message.payload.payload, {
                            ok: (model) => {
                                let mo = this.editor.getModel()!
                                let [_, ...rest] = mo.uri.path
                                this.buffer.set_vs(rest.join(""), this.editor.saveViewState())
                                this.editor.setModel(model.model)
                                this.editor.restoreViewState(model.view_state)
                                this.command.focus()
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
                this.buffer.find("*shell.md", {
                    ok: (model) => {
                        let mo = model.model
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
                    },
                    err: () => {
                        this.buffer.register("*shell.md", "", "markdown")
                        this.receive(message)
                    }
                })
                break
            case "BUFFER":
                switch (message.payload.tag) {
                    case "NEW":
                        this.buffer.register(message.payload.payload.path, message.payload.payload.buffer, Ext[message.payload.payload.ext])
                        this.receive({
                            tag: "INPUT",
                            payload: {
                                tag: "PATH", payload: message.payload.payload.path
                            }
                        })
                        break
                    case "EDIT":
                        this.send(message)
                        break
                    case "ERROR":
                        this.receive({
                            tag: "OUTPUT", payload: {
                                id: 0,
                                out: {
                                    tag: "ERROR",
                                    payload: `[IO-ERROR]: ` + message.payload.payload
                                }
                            }
                        })
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
                                // let [_, ...rest] = m?.uri.path!
                                this.receive({
                                    tag: "INPUT", payload: {
                                        tag: "PATH", payload: "*shell.md"
                                    }
                                })
                                m?.dispose()
                                break
                            case "COMMAND":
                                this.editor.focus()
                                break
                        }
                        break
                    case "META":
                        message.payload.for(this.editor, this.channel)
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
                        action: "META", for: Meta["jm"]("-5")
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
                this.receive({
                    tag: "LOCAL", payload: {
                        action: "META", for: Meta["jm"]("5")
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