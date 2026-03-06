import { editor, KeyCode, KeyMod } from "monaco-editor";
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
                    const value = this.buffer.value
                    if (!value) {
                        return
                    }
                    this.history.stack = this.history.stack.filter(v => v !== value)
                    this.history.stack.push(value)
                    this.history.idx = this.history.stack.length - 1
                    this.channel({
                        tag: "COMMAND", payload: this.buffer.value
                    })
                    this.buffer.focus()
                    break
                case "Escape":
                    this.channel({
                        tag: "BUFFER", payload: {
                            tag: "FOCUS"
                        }
                    })
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

    getId(): string {
        return "scod:command"
    }

    getPosition(): editor.IOverlayWidgetPosition | null {
        return {
            preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
        }
    }

    public focus() {
        this.buffer.focus()
    }
}

export function setup(channel: Channel): Alias {
    let command = new Command(channel)
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
                proc: (arg: string) => {
                    return () => {
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "SAVE", payload: arg
                                    ? { for: "PATH", path: arg }
                                    : { for: "CURRENT" }
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
                desc: `Moving the cursor to the n position. Use case: to 10`,
                proc: (arg: string) => {
                    return () => {
                        let [line, column = "0"] = arg.split(" ")
                        let l = parseInt(line)
                        if (isNaN(l)) {
                            l = 0
                        }
                        let c = parseInt(column)
                        if (isNaN(c)) {
                            c = 0
                        }
                        channel({
                            tag: "CURSOR", payload: {
                                tag: "JUMP", payload: {
                                    line: l,
                                    column: c
                                }
                            }
                        })
                    }
                }
            },
            "jm": {
                desc: `Jumping line relative the argument provided. Use case: jm 1 or :jm -1`,
                proc: (arg: string) => {
                    return () => {
                        let [line, column = "0"] = arg.split(" ")
                        let l = parseInt(line)
                        if (isNaN(l)) {
                            l = 0
                        }
                        let c = parseInt(column)
                        if (isNaN(c)) {
                            c = 0
                        }
                        channel({
                            tag: "CURSOR", payload: {
                                tag: "MOVE", payload: {
                                    line: l, column: c
                                }
                            }
                        })
                    }
                }
            },
            "fc": {
                desc: "focus to editor",
                proc: () => {
                    return () => {
                        channel({
                            tag: "BUFFER", payload: {
                                tag: "FOCUS"
                            }
                        })
                    }
                }
            },
            "cs": {
                desc: `Command Sequence! You can send multiple commands with this! Use case: cs sh echo hello, echo world!`,
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
                desc: `Loading a new alias. Use case: ls ./path/to/alias.js`,
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
                            line: {
                                start: 0, end: 0
                            },
                            column: {
                                start: 0, end: 0
                            }
                        }
                    }
                })
                command.focus()
            }
        },
        widget: command,
        onload: (ed) => {
            channel(({ tag: "COMMAND", payload: "op shell.md" }))

            ed.addCommand(KeyMod.CtrlCmd | KeyCode.Period, () => {
                command.focus()
            })

            ed.addCommand(KeyMod.CtrlCmd | KeyCode.Equal, () => {
                channel({
                    tag: "WINDOW", payload: {
                        tag: "ZOOMIN"
                    }
                })
            })

            ed.addCommand(KeyMod.CtrlCmd | KeyCode.Minus, () => {
                channel({
                    tag: "WINDOW", payload: {
                        tag: "ZOOMOUT"
                    }
                })
            })

        }
    }
}