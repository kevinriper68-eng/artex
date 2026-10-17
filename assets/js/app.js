const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.main-nav');
if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}
const search = document.querySelector('#productSearch');
const collection = document.querySelector('#collectionFilter');
const cards = [...document.querySelectorAll('#productGrid .product-card')];
function filterProducts() {
  const query = (search?.value || '').trim().toLowerCase();
  const category = collection?.value || '';
  let visible = 0;
  cards.forEach(card => {
    const show = card.dataset.search.includes(query) && (!category || card.dataset.collection === category);
    card.hidden = !show;
    if (show) visible++;
  });
  const empty = document.querySelector('#noProducts');
  if (empty) empty.hidden = visible !== 0;
}
search?.addEventListener('input', filterProducts);
collection?.addEventListener('change', filterProducts);
const storyPlayers = [...document.querySelectorAll('.story-player')];
const storyVideos = storyPlayers.map(player => player.querySelector('video'));
storyPlayers.forEach(storyPlayer => {
  const video = storyPlayer.querySelector('video');
  const frame = storyPlayer.querySelector('.story-player-frame');
  const centerButton = storyPlayer.querySelector('.story-player-center');
  const toggleButton = storyPlayer.querySelector('.story-toggle');
  const muteButton = storyPlayer.querySelector('.story-mute');
  const fullScreenButton = storyPlayer.querySelector('.story-fullscreen');
  const progress = storyPlayer.querySelector('.story-progress');
  const time = storyPlayer.querySelector('.story-time');
  const segments = (video.dataset.segments || '').split('|').filter(Boolean);
  const firstDuration = Number(video.dataset.firstDuration || 0);
  const totalDuration = Number(video.dataset.totalDuration || 0);
  let segmentIndex = 0;
  video.controls = false;
  storyPlayer.classList.add('is-enhanced');

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '0:00';
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  const updatePlayer = () => {
    const playing = !video.paused && !video.ended;
    const duration = segments.length ? totalDuration : (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Number(video.dataset.duration || 0));
    const currentTime = (segments.length && segmentIndex === 1 ? firstDuration : 0) + video.currentTime;
    storyPlayer.classList.toggle('is-playing', playing);
    storyPlayer.classList.toggle('is-muted', video.muted);
    centerButton.setAttribute('aria-hidden', playing ? 'true' : 'false');
    centerButton.tabIndex = playing ? -1 : 0;
    toggleButton.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    muteButton.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Mute video');
    progress.value = duration ? String((currentTime / duration) * 100) : '0';
    progress.style.setProperty('--video-progress', `${progress.value}%`);
    time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  };
  const loadSegment = (nextIndex, position, resume) => {
    segmentIndex = nextIndex;
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(position, Math.max(0, video.duration - 0.2));
      if (resume) video.play().catch(() => updatePlayer());
      updatePlayer();
    }, { once: true });
    video.src = segments[nextIndex];
    video.load();
  };
  const togglePlayback = () => {
    if (video.paused) video.play().catch(() => updatePlayer());
    else video.pause();
  };
  centerButton.addEventListener('click', togglePlayback);
  toggleButton.addEventListener('click', togglePlayback);
  video.addEventListener('click', togglePlayback);
  muteButton.addEventListener('click', () => { video.muted = !video.muted; updatePlayer(); });
  progress.addEventListener('input', () => {
    if (segments.length) {
      const target = (Number(progress.value) / 100) * totalDuration;
      const nextIndex = target < firstDuration ? 0 : 1;
      const position = nextIndex === 0 ? target : target - firstDuration;
      if (nextIndex !== segmentIndex) loadSegment(nextIndex, position, !video.paused);
      else video.currentTime = position;
    } else if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = (Number(progress.value) / 100) * video.duration;
    }
    updatePlayer();
  });
  fullScreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (frame.requestFullscreen) Promise.resolve(frame.requestFullscreen()).catch(() => {});
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
  if (!frame.requestFullscreen && !video.webkitEnterFullscreen) fullScreenButton.hidden = true;
  video.addEventListener('play', () => storyVideos.forEach(other => { if (other !== video) other.pause(); }));
  video.addEventListener('ended', () => {
    if (segments.length && segmentIndex === 0) loadSegment(1, 0, true);
  });
  ['play', 'pause', 'timeupdate', 'loadedmetadata', 'volumechange', 'ended'].forEach(event => video.addEventListener(event, updatePlayer));
  video.addEventListener('error', () => {
    storyPlayer.classList.add('is-error');
    const title = storyPlayer.querySelector('.story-player-caption strong, .film-stage-label strong');
    if (title) title.textContent = 'Video temporarily unavailable.';
  });
  updatePlayer();
});

const notifications = [...document.querySelectorAll('.flash:not(.flash-persistent)')];
if (notifications.length) {
  const stack = document.createElement('div');
  stack.className = 'toast-stack';
  stack.setAttribute('aria-label', 'Notifications');
  document.body.append(stack);
  notifications.forEach(notification => {
    const isError = notification.classList.contains('flash-error');
    notification.classList.add('toast');
    notification.setAttribute('role', isError ? 'alert' : 'status');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    notification.append(close);
    stack.append(notification);
    let remaining = isError ? 7000 : 3800;
    let started = Date.now();
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      notification.classList.add('is-leaving');
      window.setTimeout(() => notification.remove(), 220);
    };
    const resume = () => {
      started = Date.now();
      timer = window.setTimeout(dismiss, remaining);
    };
    const pause = () => {
      clearTimeout(timer);
      remaining = Math.max(500, remaining - (Date.now() - started));
    };
    close.addEventListener('click', dismiss);
    notification.addEventListener('mouseenter', pause);
    notification.addEventListener('mouseleave', resume);
    notification.addEventListener('focusin', pause);
    notification.addEventListener('focusout', event => { if (!notification.contains(event.relatedTarget)) resume(); });
    resume();
  });
}
