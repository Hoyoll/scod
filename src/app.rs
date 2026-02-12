use serde::{Deserialize, Serialize};
use serde_json::{from_str, to_string};
use std::{
    borrow::Cow,
    ffi::{OsStr, OsString},
    fmt::Debug,
    fs::{self},
    io::{BufRead, BufReader, ErrorKind},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
};
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::{ActiveEventLoop, EventLoopProxy},
    window::{Window, WindowAttributes},
};
use wry::{
    WebView, WebViewBuilder,
    http::{Request, Response, StatusCode},
};

use crate::embed::{html, js};

const URL: &'static str = "scod://index.html";
const HEAD: &'static str = "scod";
fn protocol(_url: &str, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = req.uri();
    return match uri.path() {
        "/" | "/index.html" => Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "text/html")
            .body(Cow::Borrowed(html::embed().as_bytes()))
            .unwrap(),
        "/index.js" => Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "application/javascript")
            .body(Cow::Borrowed(js::embed().as_bytes()))
            .unwrap(),
        _ => Response::default(),
    };
    // Response::default()
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Window(Win),
    Input(Action),
    Output {
        id: u32,
        out: Error<String>,
    },
    Buffer(Buffer),
    #[serde(skip_serializing, skip_deserializing)]
    /// The String here IS a serialized Message!
    Eval(String),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Error<T> {
    Error(T),
    Ok(T),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", rename_all = "UPPERCASE")]
pub enum Win {
    Ready,
    Close,
    ZoomIn,
    ZoomOut,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Buffer {
    // Ok {
    //     buffer: String,
    //     /// The PATH LOOKS like THIS: "path/to/file.txt"!
    //     path: String,
    //     ext: String,
    // },
    New {
        buffer: String,
        /// The PATH LOOKS like THIS: "path/to/file.txt"!
        path: String,
        ext: String,
    },
    Edit {
        buffer: String,
        path: String,
    },
    Error {
        message: String,
        path: String,
    },
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE", untagged)]
pub enum Dir {
    In,
    Out,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE", tag = "tag", content = "payload")]
pub enum Action {
    Shell(String),
    /// The STRING LOOKS like THIS: "path/to/file.txt"!
    Path(String),
}

///
///
///
///
/// Command::new("sh")
///     .arg("-C echo hello")
///     .spawn()
///     .expect("ls command failed to start");

pub struct Context {
    pub window: Window,
    pub webview: WebView,
    pub scale: f64,
}

pub struct Meta {
    pub c_exe: PathBuf,
    pub c_dir: PathBuf,
}

pub struct App {
    pub context: Option<Context>,
    pub proxy: EventLoopProxy<Message>,
    pub attr: WindowAttributes,
    pub meta: Meta,
}

impl App {
    fn create_context(&mut self, event_loop: &ActiveEventLoop) {
        // let c = Command::new("echo").arg("arg").spawn()
        let mut attr = self.attr.clone();
        attr.visible = false;
        let proxy = self.proxy.clone();
        let webview_builder = WebViewBuilder::new().with_devtools(true).with_ipc_handler(
            move |m: wry::http::Request<String>| {
                if cfg!(debug_assertions) {
                    proxy.send_event(from_str(m.body()).unwrap());
                } else {
                    from_str(m.body()).map(|msg: Message| proxy.send_event(msg));
                }
                // proxy.send_event(from_str(m.body()).unwrap());
            },
        );

        let window = event_loop.create_window(attr).unwrap();
        // window.set_maximized(true);
        let webview = if cfg!(debug_assertions) {
            webview_builder
                .with_url("http://localhost:5173/")
                .build(&window)
                .unwrap()
        } else {
            webview_builder
                .with_url(URL)
                .with_custom_protocol(HEAD.into(), move |url, req| protocol(url, req))
                .build(&window)
                .unwrap()
        };
        self.context = Some(Context {
            window,
            webview,
            scale: 1.0,
        });
    }

    fn handle_message(&mut self, message: Message) {
        match message {
            Message::Window(win) => match win {
                Win::Ready => match &mut self.context {
                    Some(c) => {
                        c.window.set_visible(true);
                        c.webview.set_visible(true);
                        c.window.set_maximized(true);
                        c.window.focus_window();
                    }
                    None => (),
                },
                Win::Close => todo!(),
                Win::ZoomIn => {
                    if let Some(c) = &mut self.context {
                        c.scale += 0.1;
                        c.webview.zoom(c.scale);
                    }
                }
                Win::ZoomOut => {
                    if let Some(c) = &mut self.context {
                        c.scale -= 0.1;
                        c.webview.zoom(c.scale);
                    }
                }
            },
            Message::Input(action) => {
                let proxy = self.proxy.clone();
                match action {
                    Action::Path(p) => {
                        thread::spawn(move || {
                            // println!("{}", p);
                            let path = Path::new(&p);
                            let ext = match path.extension() {
                                Some(e) => e.to_string_lossy().to_string(),
                                None => "".to_string(),
                            };
                            let buffer = match fs::read_to_string(path) {
                                Ok(value) => Message::Buffer(Buffer::New {
                                    buffer: value,
                                    path: p,
                                    ext,
                                }),
                                Err(e) => match e.kind() {
                                    ErrorKind::NotFound => Message::Buffer(Buffer::New {
                                        buffer: String::new(),
                                        path: p,
                                        ext,
                                    }),
                                    _ => Message::Buffer(Buffer::Error {
                                        message: e.kind().to_string(),
                                        path: p,
                                    }),
                                },
                            };
                            to_string(&buffer).map(|json| proxy.send_event(Message::Eval(json)))
                        });
                    }
                    Action::Shell(command) => match shell_words::split(&command) {
                        Ok(cmd) => {
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
                                        let mut buf = BufReader::new(stdout);
                                        for line in buf.lines() {
                                            let msg = Message::Output {
                                                id,
                                                out: Error::Ok(line.unwrap()),
                                            };
                                            to_string(&msg)
                                                .map(|json| proxy.send_event(Message::Eval(json)));
                                        }
                                    }

                                    if let Some(stderr) = child.stderr.take() {
                                        let mut buf = BufReader::new(stderr);
                                        for line in buf.lines() {
                                            let msg = Message::Output {
                                                id,
                                                out: Error::Error(line.unwrap()),
                                            };

                                            to_string(&msg)
                                                .map(|json| proxy.send_event(Message::Eval(json)));
                                        }
                                    }
                                }
                                Err(e) => {
                                    let msg = Message::Output {
                                        id: 0,
                                        out: Error::Error(format!(
                                            "Error Occured for command: [{}] {}",
                                            command,
                                            e.to_string()
                                        )),
                                    };
                                    to_string(&msg)
                                        .map(|json| proxy.send_event(Message::Eval(json)));
                                }
                            });
                        }
                        Err(e) => {
                            let msg = Message::Output {
                                id: 0,
                                out: Error::Error(format!(
                                    "Invalid structure for: [{}] {}",
                                    command,
                                    e.to_string()
                                )),
                            };
                            to_string(&msg).map(|json| proxy.send_event(Message::Eval(json)));
                        }
                    },
                }
            }
            Message::Buffer(buffer) => {
                match buffer {
                    Buffer::Edit { buffer, path } => match fs::write(path, buffer) {
                        Ok(_) => {
                            println!("SAVED!")
                        }
                        Err(_) => {
                            println!("FILE PERMISSION ISSUE PROBABLY!")
                        }
                    },
                    _ => (),
                }
                // match buffer {
                // Buffer::Ok { buffer, path, ext } => {}
                // Buffer::New { path, ext } => todo!(),
                // Buffer::Error(_) => todo!(),

                // }
            }
            Message::Eval(s) => match &mut self.context {
                Some(c) => {
                    // println!("{}", s);
                    c.webview
                        .evaluate_script(&format!("window.Editor.receive({})", s));
                }
                None => (),
            },
            Message::Output { id, out } => todo!(),
        }
    }

    fn handle_window_event(&self, event: WindowEvent, event_loop: &ActiveEventLoop) {
        // self.handle_window(event, event_loop);
    }
}

impl ApplicationHandler<Message> for App {
    fn resumed(&mut self, event_loop: &winit::event_loop::ActiveEventLoop) {
        self.create_context(event_loop);
    }

    fn window_event(
        &mut self,
        event_loop: &winit::event_loop::ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: winit::event::WindowEvent,
    ) {
        self.handle_window_event(event, event_loop)
    }

    fn user_event(&mut self, _event_loop: &ActiveEventLoop, message: Message) {
        self.handle_message(message)
    }
}
