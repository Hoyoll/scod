// import { html } from "lit-html";

import { editor } from "monaco-editor";
import type { Channel, Meta } from "./message_type";

type Cmd = "/" | "$" | ":"

type History = {
    path: string[],
    shell: string[],
    meta: string[]
}

export class Command {
    private buffer: HTMLInputElement
    // private wrapper: HTMLElement
    private channel: Channel
    private history: History = {
        path: [],
        shell: [],
        meta: []
    }
    constructor(channel: Channel) {
        this.channel = channel
        // document.querySelector<HTMLElement>(".widget-wrapper")!
        this.buffer = document.querySelector<HTMLInputElement>(".command-buffer")!

        this.buffer.addEventListener("keydown", (key) => {
            
            if (key.key === 'Enter') {
                let [cmd, ...rest] = this.buffer.value
                switch (cmd as Cmd) {
                    case "/":
                        this.history.path.push(this.buffer.value)
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "PATH", payload: rest.join("").trim()
                            }
                        })
                        break
                    case "$":
                        this.history.shell.push(this.buffer.value)
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "SHELL", payload: rest.join("").trim()
                            }
                        })
                        break
                    case ":":
                        let save = () => {
                            this.history.meta.push(this.buffer.value)
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