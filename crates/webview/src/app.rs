use scod_core::{
    alias::AList,
    client::Client,
    message::{Buffer, For, Message, Module, Pane, Win},
};
use serde_json::from_str;
use std::{
    borrow::Cow,
    collections::HashMap,
    env,
    fs::{self, read, read_to_string},
    io::{BufRead, BufReader, ErrorKind, Write},
    path::{Path, PathBuf},
    process::{ChildStdin, Command},
    thread,
};
use winit::{
    application::ApplicationHandler,
    event::{KeyEvent, WindowEvent},
    event_loop::{ActiveEventLoop, EventLoopProxy},
    window::{Window, WindowAttributes},
};
use wry::{
    WebView, WebViewBuilder,
    dpi::{LogicalPosition, LogicalSize, Size},
    http::{Request, Response, StatusCode},
};

const URL: &'static str = "scod://index.html";
const HEAD: &'static str = "scod";
fn protocol(_url: &str, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = req.uri();
    let exe = env::current_exe().unwrap();
    let mut path = PathBuf::from(exe.parent().unwrap());
    let res = match uri.path() {
        "/" => {
            path.push("index.html");
            match read(path) {
                Ok(html) => Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "text/html")
                    .body(Cow::Owned(html))
                    .unwrap(),
                Err(_) => Response::default(),
            }
        }
        _ => {
            uri.path().split("/").for_each(|s| {
                path.push(s);
            });
            match path.extension() {
                Some(ext) => {
                    let mime = mime_from_extension(ext.to_str().unwrap());
                    match read(path) {
                        Ok(b) => Response::builder()
                            .status(StatusCode::OK)
                            .header("Content-Type", mime)
                            .body(Cow::Owned(b))
                            .unwrap(),
                        Err(_) => Response::default(),
                    }
                }
                None => Response::default(),
            }
        }
    };
    res
}

struct Proc {
    pub root: PathBuf,
}

impl Proc {
    pub fn serve(&self, req: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
        let uri = req.uri();
        let mut path = self.root.clone();
        let res = match uri.path() {
            "/" => {
                path.push("index.html");
                match read(path) {
                    Ok(html) => Response::builder()
                        .status(StatusCode::OK)
                        .header("Content-Type", "text/html")
                        .body(Cow::Owned(html))
                        .unwrap(),
                    Err(_) => Response::default(),
                }
            }
            _ => {
                uri.path().split("/").for_each(|s| {
                    path.push(s);
                });
                match path.extension() {
                    Some(ext) => {
                        let mime = mime_from_extension(ext.to_str().unwrap());
                        match read(path) {
                            Ok(b) => Response::builder()
                                .status(StatusCode::OK)
                                .header("Content-Type", mime)
                                .body(Cow::Owned(b))
                                .unwrap(),
                            Err(_) => Response::default(),
                        }
                    }
                    None => Response::default(),
                }
            }
        };
        res
    }
}

fn mime_from_extension(ext: &str) -> &'static str {
    match ext {
        "html" => "text/html",
        "js" | "mjs" => "application/javascript",
        "css" => "text/css",
        "json" => "application/json",
        "wasm" => "application/wasm",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "ttf" => "font/ttf",
        "gif" => "image/gf",
        "ico" => "image/x-icon",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    }
}

pub struct Context {
    pub window: Window,
    pub webview: WebView,
    pub scale: f64,
}

pub struct App {
    pub context: Option<Context>,
    pub proxy: EventLoopProxy<Message>,
    pub attr: WindowAttributes,
    pub sub_context: HashMap<String, Context>,
    pub alist: AList,
    pub client: Client,
}

impl App {
    pub fn new(proxy: EventLoopProxy<Message>, attr: WindowAttributes) -> Self {
        Self {
            context: None,
            proxy,
            attr,
            sub_context: HashMap::new(),
            alist: AList::new(),
            client: Client::new(),
        }
    }
    fn create_context(&mut self, event_loop: &ActiveEventLoop) {
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
            },
        );

        let window = event_loop.create_window(attr).unwrap();
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

    fn send(&mut self, message: Message) {
        if let Some(context) = &mut self.context {
            if let Ok(json) = serde_json::to_string(&message) {
                context
                    .webview
                    .evaluate_script(&format!("window.Editor.receive({})", json));
            }
        }
    }

    fn handle_message(&mut self, message: Message, event_loop: &ActiveEventLoop) {
        match message {
            Message::Window { to, win } => {
                let c = match to {
                    For::Main => self.context.as_mut(),
                    For::Member(key) => self.sub_context.get_mut(&key),
                };
                if let Some(c) = c {
                    match win {
                        Win::Focus => {
                            c.window.set_visible(true);
                            c.webview.set_visible(true);
                            c.window.focus_window();
                        }
                        Win::Close => todo!(),
                        Win::ZoomIn => {
                            c.scale += 0.1;
                            c.webview.zoom(c.scale);
                        }
                        Win::ZoomOut => {
                            c.scale -= 0.1;
                            c.webview.zoom(c.scale);
                        }
                        Win::Resize { width, height } => {
                            c.window
                                .request_inner_size(Size::Logical(LogicalSize::new(width, height)));
                        }
                        Win::Hide => {
                            c.webview.set_visible(false);
                            c.window.set_visible(false);
                        }
                        Win::Maximize => {
                            c.window.set_maximized(true);
                            // c.window.set_outer_position(LogicalPosition::new(x, y));
                        }
                        Win::Reposition { x, y } => {
                            c.window.set_outer_position(LogicalPosition::new(x, y));
                        }
                    };
                }
            }
            Message::Buffer(buffer) => match buffer {
                Buffer::Write { buffer, path } => match fs::write(path, buffer) {
                    Ok(_) => {
                        println!("SAVED!")
                    }
                    Err(_) => {
                        println!("FILE PERMISSION ISSUE, PROBABLY!")
                    }
                },
                Buffer::Open(p) => {
                    let path = Path::new(&p);
                    let ext = match path.extension() {
                        Some(e) => e.to_string_lossy().to_string(),
                        None => "".to_string(),
                    };
                    let buffer = match read_to_string(&p) {
                        Ok(buff) => Message::Buffer(Buffer::New {
                            buffer: buff,
                            path: p,
                            ext,
                        }),
                        Err(err) => match err.kind() {
                            ErrorKind::NotFound => Message::Buffer(Buffer::New {
                                buffer: String::new(),
                                path: p,
                                ext,
                            }),
                            _ => Message::Buffer(Buffer::Status(Err(err.to_string()))),
                        },
                    };
                    self.send(buffer);
                }
                _ => {
                    self.send(Message::Buffer(buffer));
                }
            },
            Message::Module(m) => match m {
                Module::Load { key } => {
                    if let Some(mut child) = self.alist.remove(&key) {
                        child.kill();
                    }
                    self.client.mod_list.push(&key);
                    match Command::new(&self.client.mod_list).spawn() {
                        Ok(mut child) => {
                            let child_stdout = child.stdout.take().unwrap();
                            let proxy = self.proxy.clone();
                            thread::spawn(move || {
                                let buf = BufReader::new(child_stdout);
                                for line in buf.lines() {
                                    if let Ok(line) = line {
                                        from_str(&line).map(|msg: Message| {
                                            proxy.send_event(msg);
                                        });
                                    }
                                }
                            });
                            self.alist.insert(key, child);
                        }
                        Err(_) => {
                            // println!("")
                        }
                    }
                    self.client.mod_list.pop();
                }
                Module::Kill { key } => {
                    if let Some(mut child) = self.alist.remove(&key) {
                        child.kill().unwrap();
                    }
                }
                Module::Call { key, data } => match self.alist.get_mut(&key) {
                    Some(child) => {
                        if let Some(child_stdin) = &mut child.stdin {
                            writeln!(child_stdin, "{}", &data);
                        }
                    }
                    None => (),
                },
            },
            Message::Cursor(_) => {
                self.send(message);
            }
            Message::Pane(lane) => match lane {
                Pane::Open { key } => {
                    let mut attr = self.attr.clone();
                    attr.visible = false;
                    let proxy = self.proxy.clone();
                    let webview_builder = WebViewBuilder::new().with_ipc_handler(move |request| {
                        from_str(request.body()).map(|msg: Message| proxy.send_event(msg));
                    });
                    let window = event_loop.create_window(attr).unwrap();
                    let mut root = self.client.pane_list.clone();
                    root.push(&key);
                    let proc = Proc { root };
                    let webview = webview_builder
                        .with_url(format!("{}://index.html", key))
                        .with_custom_protocol(key.clone(), move |_url, request| proc.serve(request))
                        .build(&window)
                        .unwrap();
                    self.sub_context.insert(
                        key,
                        Context {
                            window,
                            webview,
                            scale: 1.0,
                        },
                    );
                }
                Pane::Wipe { key } => {
                    self.sub_context.remove(&key);
                }
                Pane::Send { key, data } => {
                    if let Some(context) = self.sub_context.get_mut(&key) {
                        context
                            .webview
                            .evaluate_script(&format!("window.receive({})", data));
                    }
                }
            },
        }
    }

    fn handle_window_event(&self, event: WindowEvent, event_loop: &ActiveEventLoop) {}
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

    fn user_event(&mut self, event_loop: &ActiveEventLoop, message: Message) {
        self.handle_message(message, event_loop)
    }
}
