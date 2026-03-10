use scod_webview::app::App;
use winit::{event_loop::EventLoop, window::WindowAttributes};

fn main() {
    let mut attr = WindowAttributes::default();
    attr = attr.with_decorations(false);
    let event_loop = EventLoop::with_user_event().build().unwrap();
    let mut app = App::new(event_loop.create_proxy(), attr);
    event_loop.run_app(&mut app);
}
