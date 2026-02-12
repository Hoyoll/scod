pub fn embed() -> &'static str {
    r###"
    window.ipc.postMessage(JSON.stringify({type: "READY"}))
    "###
}
