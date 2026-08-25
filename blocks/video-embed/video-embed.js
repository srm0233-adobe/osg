/*
 * Video Embed Block — "Featured Video" widget
 * Compound widget: label (h2) + 16:9 video frame + title (h3) + CTA link.
 *
 * The source player iframe is lazy-loaded with no resolvable src, so the block
 * renders a correctly-proportioned 16:9 frame. When a real video URL is present
 * (YouTube / Vimeo / mp4), it is embedded lazily on view; otherwise the frame
 * stands in as a placeholder so the layout is correct regardless.
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function isVideoUrl(href) {
  if (!href) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)|\.webm(\?|$)/i.test(href);
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
  iframe.setAttribute('title', 'Featured video');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function embedVimeo(url) {
  const [, video] = url.pathname.split('/');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `https://player.vimeo.com/video/${video}`);
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('title', 'Featured video');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function buildEmbed(frame, href) {
  if (frame.dataset.embedLoaded === 'true') return;
  frame.dataset.embedLoaded = 'true';
  const url = new URL(href, window.location.href);
  if (/youtube\.com|youtu\.be/i.test(href)) {
    frame.append(embedYoutube(url));
  } else if (/vimeo\.com/i.test(href)) {
    frame.append(embedVimeo(url));
  } else {
    const video = document.createElement('video');
    video.setAttribute('controls', '');
    const sourceEl = document.createElement('source');
    sourceEl.setAttribute('src', href);
    sourceEl.setAttribute('type', `video/${href.split('.').pop().split('?')[0]}`);
    video.append(sourceEl);
    frame.append(video);
  }
}

export default async function decorate(block) {
  // Gather content from the single-cell layout.
  const cell = block.querySelector(':scope > div > div') || block;

  const label = cell.querySelector('h2');
  const title = cell.querySelector('h3');
  const picture = cell.querySelector('picture');

  // Classify links: a video URL feeds the player; everything else is the CTA.
  const links = [...cell.querySelectorAll('a')];
  const videoLink = links.find((a) => isVideoUrl(a.href));
  // CTA = a link that is NOT inside the title heading and is not the video link.
  const cta = links.find((a) => a !== videoLink && (!title || !title.contains(a)));

  // Build the 16:9 frame.
  const frame = document.createElement('div');
  frame.className = 'frame-video';
  frame.dataset.embedLoaded = 'false';
  if (picture) {
    picture.classList.add('video-embed-poster');
    frame.append(picture);
  }

  // Assemble the block in canonical order: label, frame, title, CTA.
  block.textContent = '';
  if (label) block.append(label);
  block.append(frame);
  if (title) block.append(title);
  if (cta) {
    cta.classList.add('btn', 'full-gray');
    const container = document.createElement('p');
    container.className = 'video-embed-cta';
    container.append(cta);
    block.append(container);
  }

  // Lazily embed a real video when a resolvable source exists.
  if (videoLink) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        if (!prefersReducedMotion.matches || true) buildEmbed(frame, videoLink.href);
      }
    });
    observer.observe(frame);
  }
}
