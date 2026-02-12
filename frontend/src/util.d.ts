import type { Message } from "./message_type";

interface Ipc {
    postMessage(message: string): void
}

interface Editor {
    receive(message: Message): void
}

declare global {
    interface Window {
        ipc: Ipc,
        Editor: Editor
    }
}


export { };

