// columns-media — media + text two-column promo.
// The media column can hold an image OR a video: if a column contains a link to
// a video file (mp4/webm) or a YouTube/Vimeo URL, it is turned into a playable
// 16:9 video frame (lazily embedded on view). Otherwise images render as before.

function isVideoUrl(href) {
  if (!href) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)|\.webm(\?|$)|video_iframe|\/embed\//i.test(href);
}

function embedYoutube(url) {
  const usp = new URLSearchParams(url.search);
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `https://www.youtube.com${vid ? `/embed/${vid}?rel=0` : embed}`);
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Video');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function embedVimeo(url) {
  const [, video] = url.pathname.split('/');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `https://player.vimeo.com/video/${video}`);
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Video');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function embedIframe(href) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', href);
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Video');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function buildEmbed(frame, href, poster) {
  if (frame.dataset.embedLoaded === 'true') return;
  frame.dataset.embedLoaded = 'true';
  const url = new URL(href, window.location.href);
  if (/youtube\.com|youtu\.be/i.test(href)) {
    frame.append(embedYoutube(url));
  } else if (/vimeo\.com/i.test(href)) {
    frame.append(embedVimeo(url));
  } else if (/\.mp4(\?|$)|\.webm(\?|$)/i.test(href)) {
    // Direct video file → native player.
    const video = document.createElement('video');
    video.setAttribute('controls', '');
    video.setAttribute('playsinline', '');
    if (poster) video.setAttribute('poster', poster);
    const sourceEl = document.createElement('source');
    sourceEl.setAttribute('src', href);
    sourceEl.setAttribute('type', `video/${href.split('.').pop().split('?')[0]}`);
    video.append(sourceEl);
    frame.append(video);
  } else {
    // Any other player URL (e.g. a hosted iframe player) → embed as an iframe.
    frame.append(embedIframe(href));
  }
}

// Turn a media column containing a video link into a 16:9 player frame.
function setupVideoCol(col) {
  const videoLink = [...col.querySelectorAll('a')].find((a) => isVideoUrl(a.href));
  if (!videoLink) return false;

  const { href } = videoLink;
  // Use an image already in the column (if any) as the poster.
  const posterImg = col.querySelector('img');
  const poster = posterImg ? (posterImg.currentSrc || posterImg.src) : '';

  const frame = document.createElement('div');
  frame.className = 'columns-media-video';
  frame.dataset.embedLoaded = 'false';

  col.textContent = '';
  col.classList.add('columns-media-video-col');
  col.append(frame);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      buildEmbed(frame, href, poster);
    }
  });
  observer.observe(frame);
  return true;
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-media-${cols.length}-cols`);

  // setup image / video columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      // Video takes priority: a link to a video file/URL becomes a player.
      if (setupVideoCol(col)) return;

      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-media-img-col');
        }
      }
    });
  });
}
