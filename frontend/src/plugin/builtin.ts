import { editor } from "monaco-editor";
import type { Alias, Channel } from "../message_type";

class Command {
    private buffer: HTMLInputElement
    private history: {
        table: Set<string>,
        stack: string[],
        idx: number
    } = {
            table: new Set,
            stack: [],
            idx: 0
        }
    private channel: Channel
    constructor(channel: Channel) {
        this.channel = channel
        this.buffer = document.createElement("input");
        this.buffer.classList.add("command-buffer")

        this.buffer.addEventListener("keydown", (event) => {
            switch (event.key) {
                case "ArrowUp":
                    this.history.idx = this.min(this.history.idx - 1, 0)
                    let h = this.history.stack[this.history.idx]
                    if (h) {
                        this.buffer.value = h
                    }

                    break
                case "ArrowDown":
                    this.history.idx = this.max(this.history.idx + 1, this.history.stack.length - 1)
                    let his = this.history.stack[this.history.idx]
                    if (his) {
                        this.buffer.value = his
                    }

                    break
                case "Enter":
                    this.history.table.delete(this.buffer.value)
                    this.history.table.add(this.buffer.value)
                    this.history.stack = Array.from(this.history.table.keys())
                    this.history.idx = this.history.stack.length - 1
                    this.channel({
                        tag: "COMMAND", payload: this.buffer.value
                    })
                    this.buffer.focus()
                    break
            }
        })
    }

    min(num: number, limit: number): number {
        if (num < limit) {
            return limit
        }
        return num
    }


    max(num: number, limit: number): number {
        if (num > limit) {
            return limit
        }
        return num
    }
    getDomNode(): HTMLElement {
        return this.buffer
    }

}

export function setup(editor: editor.IStandaloneCodeEditor, channel: Channel): Alias {
    let command = new Command(channel)
    let app = document.querySelector("#widget")!
    app.appendChild(command.getDomNode())
    return {
        meta: {
            "op": {
                desc: "Opening and switching to that buffer",
                proc: (arg: string) => {
                    return () => {
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "OPEN", payload: arg
                            }
                        })
                    }
                }
            },
            "pe": {
                desc: "Pushing edited buffer to the backend",
                proc: () => {
                    return () => {
                        let model = editor.getModel()!
                        let [_, ...path] = model.uri.path
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "SAVE", payload: {
                                    buffer: model.getValue(),
                                    path: path.join("").trim()
                                }
                            }
                        })
                    }
                }
            },
            "bc": {
                desc: "Closing the current buffer",
                proc: () => {
                    return () => {
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "CLOSE"
                            }
                        })
                    }
                }
            },
            "to": {
                desc: `Moving the cursor to the n position. Use case: :to 10`,
                proc: (arg: string) => {
                    let count = parseInt(arg)
                    return () => {
                        let pos = editor.getPosition()!
                        editor.setPosition({
                            lineNumber: count,
                            column: pos.column
                        })
                        editor.revealPosition({
                            lineNumber: count,
                            column: pos.column
                        })
                    }
                }
            },
            "jm": {
                desc: `Jumping line relative the argument provided. Use case: :jm 1 or :jm -1`,
                proc: (arg: string) => {
                    let count = parseInt(arg)

                    return () => {
                        let p = editor.getPosition()!
                        let new_pos = p.lineNumber + count;
                        editor.setPosition({
                            lineNumber: new_pos,
                            column: p.column
                        })
                        editor.revealPosition({
                            lineNumber: new_pos,
                            column: p.column
                        })
                    }
                }
            },
            "cs": {
                desc: `Command Sequence! You can send multiple commands with this! Use case: :cs $ echo hello, $ echo world!`,
                proc: (arg: string) => {
                    let args = arg.split(",")
                    return () => {
                        args.forEach((cmd) => {
                            channel({
                                tag: "COMMAND", payload: cmd.trim()
                            })
                        })
                    }
                }
            },
            "la": {
                desc: `Loading a new alias. Use case: :ls ./path/to/alias.js`,
                proc: (path: string) => {
                    return () => {
                        if (path) {
                            channel({
                                tag: "ALIAS", payload: path
                            })
                        }
                    }
                }
            },
            "sh": {
                desc: "Sending an actual shell command to the backend",
                proc: (shell: string) => {
                    return () => {
                        if (shell === "") {
                            return
                        }
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "OPEN", payload: "shell.md"
                            }
                        })
                        channel({
                            tag: "MODULE", payload: {
                                key: "SHELL",
                                data: shell
                            }
                        })
                    }
                }
            }
        },
        port: {
            "SHELL": (data: string) => {
                channel({
                    tag: "BUFFER", payload: {
                        tag: "EDIT", payload: {
                            text: data,
                            path: "shell.md",
                            line: 0,
                            column: 0
                        }
                    }
                })
            }
        }
    }
}