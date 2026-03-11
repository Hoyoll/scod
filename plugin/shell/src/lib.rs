use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    thread,
};

use scod_core::{
    alias::{Alias, to_string},
    message::Message,
};
use serde::{Deserialize, Serialize};
use winit::event_loop::EventLoopProxy;

struct Shell {
    pub proxy: EventLoopProxy<Message>,
}

const PORT: &str = "scod::SHELL";

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
enum IType {
    Command(String),
    Stdout(String),
}

impl Alias for Shell {
    fn key(&self) -> String {
        "scod::SHELL".to_string()
    }

    fn call(&self, data: String) {
        match shell_words::split(&data) {
            Ok(cmd) => {
                if cmd.is_empty() {
                    let msg = Message::Port {
                        key: PORT.to_string(),
                        data: serde_json::to_value(&IType::Stdout(
                            "Error: Empty command!".to_string(),
                        ))
                        .unwrap(),
                    };
                    to_string(&msg).map(|json| self.proxy.send_event(Message::Eval(json)));
                    return;
                }
                let mut c = Command::new(&cmd[0]);
                for arg in &cmd[1..] {
                    c.arg(arg);
                }
                c.stdout(Stdio::piped());
                c.stderr(Stdio::piped());
                let proxy = self.proxy.clone();
                thread::spawn(move || match c.spawn() {
                    Ok(mut child) => {
                        let id = child.id();
                        if let Some(stdout) = child.stdout.take() {
                            let buf = BufReader::new(stdout);
                            for line in buf.lines() {
                                let msg = Message::Port {
                                    key: PORT.to_string(),
                                    data: serde_json::to_value(&IType::Stdout(format!(
                                        "[PID: {}][OK]: {}",
                                        id,
                                        line.unwrap()
                                    )))
                                    .unwrap(),
                                };
                                to_string(&msg).map(|json| proxy.send_event(Message::Eval(json)));
                            }
                        }

                        if let Some(stderr) = child.stderr.take() {
                            let buf = BufReader::new(stderr);
                            for line in buf.lines() {
                                let msg = Message::Port {
                                    key: PORT.to_string(),
                                    data: serde_json::to_value(&IType::Stdout(format!(
                                        "[PID: {}][ERROR]: {}",
                                        id,
                                        line.unwrap()
                                    )))
                                    .unwrap(),
                                };
                                to_string(&msg).map(|json| proxy.send_event(Message::Eval(json)));
                            }
                        }
                    }
                    Err(e) => {
                        let msg = Message::Port {
                            key: PORT.to_string(),
                            data: serde_json::to_value(&IType::Stdout(format!(
                                "Error Occured for command: [{}] {}",
                                data,
                                e.to_string()
                            )))
                            .unwrap(),
                        };
                        to_string(&msg).map(|json| proxy.send_event(Message::Eval(json)));
                    }
                });
            }
            Err(_) => (),
        }
    }
}

#[unsafe(no_mangle)]
pub fn build(proxy: EventLoopProxy<Message>) -> Box<dyn Alias> {
    Box::new(Shell { proxy })
}
