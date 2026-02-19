// import { html } from "lit-html";

import { editor } from "monaco-editor";
import type { Channel, Meta } from "./message_type";

type Cmd = "/" | "$" | ":"

type History = {
    path: Set<string>,
    shell: Set<string>,
    meta: Set<string>
}

export class Command {
    private buffer: HTMLInputElement
    // private wrapper: HTMLElement
    private channel: Channel
    private history: History = {
        path: new Set,
        shell: new Set,
        meta: new Set
    }
    constructor(channel: Channel) {
        this.channel = channel
        // document.querySelector<HTMLElement>(".widget-wrapper")!
        this.buffer = document.querySelector<HTMLInputElement>(".command-buffer")!

        this.buffer.addEventListener("keydown", (key) => {
            if (key.key === 'ArrowUp') {

            }

            if (key.key === 'ArrowDown') {

            }
            
            if (key.key === 'Enter') {
                let [cmd, ...rest] = this.buffer.value
                switch (cmd as Cmd) {
                    case "/":
                        this.history.path.delete(this.buffer.value)
                        this.history.path.add(this.buffer.value)
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "PATH", payload: rest.join("").trim()
                            }
                        })
                        break
                    case "$":
                        this.history.shell.delete(this.buffer.value)
                        this.history.shell.add(this.buffer.value)
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "SHELL", payload: rest.join("").trim()
                            }
                        })
                        break
                    case ":":
                        let save = () => {
                            this.history.meta.delete(this.buffer.value)
                            this.history.meta.add(this.buffer.value)
                        }
                        let [command, args] = rest.join("").trim().split(" ")
                        switch (command as Meta["action"]) {
                            case "pe":
                                save()
                                this.channel({
                                    tag: "LOCAL",
                                    payload: {
                                        action: "META", for: {
                                            action: "pe"
                                        }
                                    }
                                })
                                break
                            case "bc":
                                save()
                                this.channel({
                                    tag: "LOCAL",
                                    payload: {
                                        action: "META", for: {
                                            action: "bc"
                                        }
                                    }
                                })
                                break
                            case "to":
                                save()
                                this.channel({
                                    tag: "LOCAL",
                                    payload: {
                                        action: "META", for: {
                                            action: "to",
                                            arg: parseInt(args)
                                        }
                                    }
                                })
                                break
                            case "jm":
                                save()
                                this.channel({
                                    tag: "LOCAL",
                                    payload: {
                                        action: "META", for: {
                                            action: "jm",
                                            arg: parseInt(args)
                                        }
                                    }
                                })
                                break
                            case "wf":
                                break
                        }
                }
            }
        })
    }

    public focus() {
        this.buffer.focus()
    }

    getId(): string {
        return "scod.command"
    }

    getDomNode(): HTMLElement {
        return this.buffer
    }

    getPosition(): editor.IOverlayWidgetPosition | null {
        return {
            preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
        }
    }

}