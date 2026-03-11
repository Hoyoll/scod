import { editor, KeyCode, KeyMod } from "monaco-editor";
import type { Alias, Channel } from "../message_type";
import "./style.css";

type IType =
    | {
        tag: "COMMAND",
        payload: string
    }
    | {
        tag: "STDOUT",
        payload: string
    }

class Command implements Alias {
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
                    this.call({
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

    onload(ed: editor.IStandaloneCodeEditor): void {
        this.channel({
            tag: "BUFFER", payload: {
                tag: "NEW", payload: {
                    buffer: "",
                    path: "shell.md",
                    ext: "md"
                }
            }
        })

        ed.addOverlayWidget({
            getId: (): string => {
                return this.key()
            },
            getDomNode: (): HTMLElement => {
                return this.buffer
            },
            getPosition: (): editor.IOverlayWidgetPosition | null => {
                return {
                    preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
                }
            }
        })


        ed.addCommand(KeyMod.CtrlCmd | KeyCode.Period, () => {
            this.buffer.focus()
        })

        ed.addCommand(KeyMod.Alt | KeyCode.KeyW, () => {
            this.channel({
                tag: "CURSOR", payload: {
                    tag: "MOVE", payload: {
                        line: 5,
                        column: 0
                    }
                }
            })
        })


        ed.addCommand(KeyMod.Alt | KeyCode.KeyS, () => {
            this.channel({
                tag: "CURSOR", payload: {
                    tag: "MOVE", payload: {
                        line: -5,
                        column: 0
                    }
                }
            })
        })

        ed.addCommand(KeyMod.Alt | KeyCode.KeyE, () => {
            this.channel({
                tag: "BUFFER", payload: {
                    tag: "FOCUS"
                }
            })
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

    widget(): HTMLElement {
        return this.buffer
    }

    call(input: IType) {
        switch (input.tag) {
            case "COMMAND":
                let [key, ...rest] = input.payload.split(" ");
                this.meta[key]?.proc(rest.join(" "))
                break
            case "STDOUT":
                console.log("here!")
                this.channel({
                    tag: "BUFFER", payload: {
                        tag: "EDIT", payload: {
                            text: input.payload,
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
                break
        }
    }

    key(): string {
        return "scod::SHELL"
    }

    private meta: Record<string, {
        desc: string,
        proc: ((args: string) => void)
    }> = {
            "op": {
                desc: "Opening and switching to that buffer",
                proc: (arg: string) => {
                    this.channel({
                        tag: "BUFFER", payload: {
                            tag: "OPEN", payload: arg
                        }
                    })
                }
            },
            ":": {
                desc: "sending shit to port",
                proc: (arg: string) => {
                    let [key, ...rest] = arg.split(" ");
                    this.channel({
                        tag: "PORT", payload: {
                            key: key,
                            data: rest.join(" ")
                        }
                    })
                }
            },
            "pe": {
                desc: "Pushing edited buffer to the backend",
                proc: (arg: string) => {
                    this.channel({
                        tag: "BUFFER", payload: {
                            tag: "SAVE", payload: arg
                                ? { for: "PATH", path: arg }
                                : { for: "CURRENT" }
                        }
                    })
                }
            },
            "bc": {
                desc: "Closing the current buffer",
                proc: () => {
                    this.channel({
                        tag: "BUFFER", payload: {
                            tag: "CLOSE"
                        }
                    })
                }
            },
            "to": {
                desc: `Moving the cursor to the n position. Use case: to 10`,
                proc: (arg: string) => {
                    let [line, column = "0"] = arg.split(" ")
                    let l = parseInt(line)
                    if (isNaN(l)) {
                        l = 0
                    }
                    let c = parseInt(column)
                    if (isNaN(c)) {
                        c = 0
                    }
                    this.channel({
                        tag: "CURSOR", payload: {
                            tag: "JUMP", payload: {
                                line: l,
                                column: c
                            }
                        }
                    })
                }
            },
            "jm": {
                desc: `Jumping line relative the argument provided. Use case: jm 1 or :jm -1`,
                proc: (arg: string) => {
                    let [line, column = "0"] = arg.split(" ")
                    let l = parseInt(line)
                    if (isNaN(l)) {
                        l = 0
                    }
                    let c = parseInt(column)
                    if (isNaN(c)) {
                        c = 0
                    }
                    this.channel({
                        tag: "CURSOR", payload: {
                            tag: "MOVE", payload: {
                                line: l, column: c
                            }
                        }
                    })
                }
            },
            "fc": {
                desc: "focus to editor",
                proc: () => {
                    this.channel({
                        tag: "BUFFER", payload: {
                            tag: "FOCUS"
                        }
                    })
                }
            },
            "cs": {
                desc: `Command Sequence! You can send multiple commands with this! Use case: cs sh echo hello, echo world!`,
                proc: (arg: string) => {
                    let args = arg.split(",")
                    args.forEach((cmd) => {
                        this.call({
                            tag: "COMMAND",
                            payload: cmd.trim()
                        })
                    })
                }
            },
            "la": {
                desc: `Loading a new alias. Use case: ls ./path/to/alias.js`,
                proc: (path: string) => {
                    if (path) {
                        this.channel({
                            tag: "ALIAS", payload: path
                        })
                    }
                }
            },
            "sh": {
                desc: "Sending an actual shell command to the backend",
                proc: (shell: string) => {
                    if (shell === "") {
                        return
                    }
                    this.channel({
                        tag: "MODULE", payload: {
                            key: "scod::SHELL",
                            data: shell
                        }
                    })
                }
            }
        }
}

export function setup(channel: Channel): Alias {
    return new Command(channel)
}