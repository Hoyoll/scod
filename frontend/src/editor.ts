import type { Buffer, Editor, Event, Message, Pane } from "./message_type";

interface Receiver<T> {
    channel: Channel
    receive(data: T): void;
}

type Channel = (message: Message) => void

class Scod implements Receiver<Message> {
    private json_handler = new HJson()
    private buffer_handler
    private pane_handler
    private editor_handler
    private event_handler
    constructor() {
        this.channel = (message: Message) => {
            this.receive(message)
        }
        this.buffer_handler = new HBuffer(this.channel)
        this.pane_handler = new HPane(this.channel)
        this.editor_handler = new HEditor(this.channel)
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
                this.editor_handler.receive(message.payload)
                break
            case "EVENT":
                this.event_handler.receive(message.payload)
                break
        }
    }
}

class HBuffer implements Receiver<Buffer> {
    channel: Channel
    constructor(channel: Channel) {
        this.channel = channel
    }
    receive(data: Buffer): void {
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
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