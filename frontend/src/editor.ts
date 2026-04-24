import { editor } from "monaco-editor";
import { ABuffer } from "./buffer";
import { Config } from "./config";
import type { Buffer, Editor, Event, Message, Pane } from "./message_type";

interface Receiver<T> {
    channel: Channel
    receive(data: T): void;
}

type Channel = (message: Message) => void
type LChannel = () => void

class Scod implements Receiver<Message> {
    private json_handler = new HJson()
    private buffer_handler
    private pane_handler
    // private editor_handler
    private event_handler
    constructor() {
        this.channel = (message: Message) => {
            this.receive(message)
        }
        this.buffer_handler = new HBuffer(this.channel)
        this.pane_handler = new HPane(this.channel)
        // this.editor_handler = new HEditor(this.channel)
        this.event_handler = new HEvent(this.channel)

    }
    channel: Channel;
    public receive(message: Message) {
        switch (message.tag) {
            case "JSON":
                this.json_handler.receive(message.payload)
                break
            case "PANE":
                this.pane_handler.receive(message.payload)
                break
            case "BUFFER":
                this.buffer_handler.receive(message.payload)
                break
            case "EDITOR":
                switch (message.payload) {
                    case "FOCUS":
                        this.buffer_handler.focus()
                        break
                    case "MAXIMIZE":
                    case "FULLSCREEN":
                }
                // this.editor_handler.receive(message.payload)
                break
            case "EVENT":
                this.event_handler.receive(message.payload)
                break
        }
    }

    local_channel() {
    	
    }
}

class HBuffer implements Receiver<Buffer> {
    channel: Channel
    private buffer = new ABuffer()
    private editor: editor.IStandaloneCodeEditor
    constructor(channel: Channel) {
        this.channel = channel
        let doc = document.querySelector<HTMLDivElement>('#app')!
        this.editor = editor.create(doc, Config.monaco_config())
    }
    public focus() {
        this.editor.focus()
    }

    receive(data: Buffer): void {
        switch (data.tag) {
            case "DIG":
                let ext = data.payload.path.split(".").pop() || "";
                switch (data.payload.buffer.tag) {
                    case "EMPTY":
                        this.buffer.find(data.payload.path, {
                            ok: (m) => {
                                let model = this.editor.getModel()
                                if (!model) {
                                    return
                                }
                                let [_, ...rest] = model.uri.path
                                this.buffer.set_vs(rest.join(""), this.editor.saveViewState())
                                this.editor.setModel(m.model)
                                this.editor.restoreViewState(m.view_state)
                                this.channel({
                                    tag: "JSON", payload: {
                                        tag: "EVENT", payload: {
                                            tag: "BUFFERCREATED", payload: data.payload.path
                                        }
                                    }
                                })
                            },
                            err: () => {
                                this.buffer.register(data.payload.path, "", ext)
                                this.receive(data)
                            }
                        })
                        break
                    case "FILE":
                        this.buffer.register(data.payload.path, data.payload.buffer.payload, ext)
                        this.receive({
                            tag: "DIG", payload: {
                                path: data.payload.path, buffer: { tag: "EMPTY" }
                            }
                        })
                        break
                    case "APPEND":
                        let text = data.payload.buffer.payload
                        this.buffer.find(data.payload.path, {
                            ok: (model) => {
                                let line = model.model.getLineCount();
                                let column = model.model.getLineMaxColumn(line)
                                model.model.pushEditOperations(null, [{
                                    range: {
                                        startLineNumber: line,
                                        endLineNumber: line,
                                        startColumn: column,
                                        endColumn: column,
                                    },
                                    text: text
                                }], () => null)
                            },
                            err: () => { }
                        })
                        break
                }
                break
            case "ERROR":
        }
    }
}

class HJson {
    receive(data: Message): void {
        window.ipc.postMessage(data)
    }
}

class HEditor implements Receiver<Editor> {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel
    }
    receive(data: Editor): void {
        throw new Error("Method not implemented.");
    }

}

class HEvent implements Receiver<Event> {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel
    }
    receive(data: Event): void {
        // throw new Error("Method not implemented.");
    }

}

class HPane implements Receiver<Pane> {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel
    }
    receive(data: Pane): void {
        throw new Error("Method not implemented.");
    }

}
