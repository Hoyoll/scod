import { editor } from "monaco-editor"
import { ABuffer } from "./buffer"
import { Ext } from "./language"
import { type Alias, type Channel, type Message, type MTable, type Port } from "./message_type"
// import { Meta, type MTable } from "./meta"

export class Editor {
    // private command: Command
    private buffer: ABuffer
    private editor: editor.IStandaloneCodeEditor
    private channel: Channel
    private port: Port = {}
    private meta: MTable = {}
    constructor(doc: HTMLDivElement) {
        this.channel = (message: Message) => {
            this.receive(message)
        }
        this.buffer = new ABuffer()
        // this.command = new Command(this.channel)
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
        this.setup_widget()
        // this.editor.setModel(null)
        // this.receive({
        //     tag: "LOCAL",
        //     payload: {
        //         action: "FOCUS",
        //         for: "EDITOR"
        //     }
        // })
        this.send({ tag: "WINDOW", payload: { tag: "READY" } })
        console.log("setup finished!")
    }

    private setup_widget() {
        /// this is for dev mode XD
        this.receive({
            tag: "ALIAS", payload: "./plugin/builtin.ts"
        })

        // this.receive({
        //     tag: "ALIAS", payload: "./plugin/builtin.js"
        // })
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
                                // console.log(model)
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
                        }
                        m?.dispose()
                        break
                    case "STATUS":
                        // this.receive({})
                        break
                    case "EDIT":
                        let line = message.payload.payload.line
                        let column = message.payload.payload.column
                        let path = message.payload.payload.path
                        let text = message.payload.payload.text
                        this.buffer.find(path, {
                            ok: (model) => {
                                if (line < 1) {
                                    line = model.model.getLineCount()
                                }

                                if (column < 1) {
                                    column = model.model.getLineMaxColumn(model.model.getLineCount())
                                }
                                model.model.pushEditOperations(
                                    null,
                                    [{
                                        range: {
                                            startLineNumber: line,
                                            startColumn: column,
                                            endLineNumber: line,
                                            endColumn: column
                                        },
                                        text: text + `\n`
                                    }],
                                    () => null
                                )
                            },
                            err: () => {
                                // this.send({
                                //     tag: "BUFFER", payload: {
                                //         tag: "OPEN", payload: path
                                //     }
                                // })
                                // this.receive(message)
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
                    let al = plugin.setup(this.editor, (msg: Message) => {
                        this.receive(msg)
                    }) as Alias
                    if (al) {
                        for (const key in al.meta) {
                            this.meta[key] = al.meta[key]
                        }
                        for (const key in al.port) {
                            this.port[key] = al.port[key]
                        }
                    }
                })
                break
            case "LOCAL":
                switch (message.payload.action) {
                    // case "FOCUS":
                    //     switch (message.payload.for) {
                    //         case "EDITOR":
                    //             this.editor.focus()
                    //             break
                    //         case "COMMAND":
                    //             this.command.focus()
                    //             break
                    //     }
                    //     break
                    // case "CLOSE":
                    //     switch (message.payload.for) {
                    //         case "EDITOR":
                    //             let m = this.editor.getModel()
                    //             // this.receive({
                    //             //     tag: ""
                    //             // })
                    //             console.log("TO-DO!")
                    //             m?.dispose()
                    //             break
                    //         case "COMMAND":
                    //             this.editor.focus()
                    //             break
                    //     }
                    //     break
                    // case "META":
                    //     message.payload.for()
                    // break
                    // case "COMMAND":
                    //     let [current_cmd, ...args] = message.payload.for.split(" ")
                    //     this.meta[current_cmd].proc(args.join(" "))
                    //     break
                    // case "LOAD_ALIAS":
                    //     import(message.payload.for).then((plugin) => {
                    //         let al = plugin.setup(this.editor, this.channel) as Alias
                    //         if (al) {
                    //             for (const key in al.meta) {
                    //                 this.meta[key] = al.meta[key]
                    //             }
                    //             for (const key in al.port) {
                    //                 this.port[key] = al.port[key]
                    //             }
                    //         }
                    //     })
                    //     break
                }
        }
    }

    private setup_command() {
        //     editor.addCommand({
        //         id: "jump.up",
        //         run: () => {
        //             this.receive({
        //                 tag: "LOCAL", payload: {
        //                     action: "META", for: Meta["jm"].proc("-5")
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.Alt | KeyCode.KeyW,
        //         command: "jump.up"
        //     })


        //     editor.addCommand({
        //         id: "jump.down",
        //         run: () => {
        //             this.receive({
        //                 tag: "LOCAL", payload: {
        //                     action: "META", for: Meta["jm"].proc("5")
        //                 }
        //             })
        //         }
        //     })


        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.Alt | KeyCode.KeyS,
        //         command: "jump.down"
        //     })

        //     editor.addCommand({
        //         id: "editor.focus",
        //         run: () => {
        //             this.receive({
        //                 tag: "LOCAL", payload: {
        //                     action: "FOCUS",
        //                     for: "EDITOR"
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.Alt | KeyCode.KeyE,
        //         command: "editor.focus"
        //     })


        //     editor.addCommand({
        //         id: 'scod.command',
        //         run: () => {
        //             this.receive({
        //                 tag: "LOCAL", payload: {
        //                     action: "FOCUS",
        //                     for: "COMMAND"
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.CtrlCmd | KeyCode.Period,
        //         command: "scod.command"
        //     })

        //     editor.addCommand({
        //         id: 'zoom-in',
        //         run: () => {
        //             this.send({
        //                 tag: "WINDOW", payload: {
        //                     tag: "ZOOMIN"
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.CtrlCmd | KeyCode.Equal,
        //         command: "zoom-in",
        //     })

        //     editor.addCommand({
        //         id: 'zoom-out',
        //         run: () => {
        //             this.send({
        //                 tag: "WINDOW", payload: {
        //                     tag: "ZOOMOUT"
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.CtrlCmd | KeyCode.Minus,
        //         command: "zoom-out",
        //     })

        //     editor.addCommand({
        //         id: 'close.buffer',
        //         run: () => {
        //             this.receive({
        //                 tag: "LOCAL", payload: {
        //                     for: "EDITOR",
        //                     action: "CLOSE"
        //                 }
        //             })
        //         }
        //     })

        //     editor.addKeybindingRule({
        //         keybinding: KeyMod.CtrlCmd | KeyCode.KeyW,
        //         command: 'close.buffer'
        //     })
    }
}