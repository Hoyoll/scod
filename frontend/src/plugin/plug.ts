import type { MTable } from "../meta";

export function setup(meta: MTable) {
    meta["hw"] = {
        desc: "hello world!",
        proc: () => {
            return () => {
                console.log("Hello world!")
            }
        }
    }
}