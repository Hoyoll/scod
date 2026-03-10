use libloading::{Library, Symbol};
use scod_core::{
    alias::{Alias, Mouth},
    message::{Buffer, Message, Win},
};
use serde_json::{from_str, to_string};
use std::{
    borrow::Cow,
    collections::HashMap,
    env,
    fs::{self, read},
    io::ErrorKind,
    path::{Path, PathBuf},
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

// pub struct Alias {}

struct Plugin {
    pub library: Option<Library>,
    pub alias: Box<dyn Alias>,
}

pub struct App {
    pub context: Option<Context>,
    pub proxy: EventLoopProxy<Message>,
    pub attr: WindowAttributes,
    pub alias: HashMap<String, Plugin>,
}

impl App {
    pub fn new(proxy: EventLoopProxy<Message>, attr: WindowAttributes) -> Self {
        let mut alias = HashMap::new();
        let loader = scod_alias::build(proxy.clone());
        alias.insert(
            loader.key(),
            Plugin {
                library: None,
                alias: loader,
            },
        );
        let shell = scod_shell::build(proxy.clone());
        alias.insert(
            shell.key(),
            Plugin {
                library: None,
                alias: shell,
            },
        );
        Self {
            context: None,
            proxy,
            attr,
            alias,
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
            Message::Buffer(buffer) => match buffer {
                Buffer::Write { buffer, path } => match fs::write(path, buffer) {
                    Ok(_) => {
                        println!("SAVED!")
                    }
                    Err(_) => {
                        println!("FILE PERMISSION ISSUE PROBABLY!")
                    }
                },
                Buffer::Open(p) => {
                    let proxy = self.proxy.clone();
                    thread::spawn(move || {
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
                                _ => Message::Buffer(Buffer::Status(Err(e.to_string()))),
                            },
                        };
                        to_string(&buffer).map(|json| proxy.send_event(Message::Eval(json)))
                    });
                }
                _ => (),
            },
            Message::Eval(s) => match &mut self.context {
                Some(c) => {
                    c.webview
                        .evaluate_script(&format!("window.Editor.receive({})", s));
                }
                None => (),
            },
            Message::Module { key, data } => match self.alias.get_mut(&key) {
                Some(alias) => {
                    alias.alias.call(data);
                }
                None => (),
            },
            Message::Alias(path) => unsafe {
                match Library::new(&path) {
                    Ok(lib) => {
                        let symbol: Result<Symbol<Mouth>, libloading::Error> = lib.get(b"build");
                        match symbol {
                            Ok(func) => {
                                let alias = func(self.proxy.clone());
                                self.alias.insert(
                                    alias.key(),
                                    Plugin {
                                        library: Some(lib),
                                        alias,
                                    },
                                );
                            }
                            Err(_) => {
                                println!(
                                    "symbol: build does not exist! we only want that symbol buddy!"
                                )
                            }
                        }
                    }
                    Err(_) => {
                        println!("dll: {} does not exist!", path.display())
                    }
                }
            },
            Message::Port { .. } => (),
            Message::Command(_) => todo!(),
            Message::Cursor(_) => todo!(),
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

    fn user_event(&mut self, _event_loop: &ActiveEventLoop, message: Message) {
        self.handle_message(message)
    }
}
