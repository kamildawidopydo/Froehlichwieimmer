/** Block right-click / long-press save on site images (public assets). */
export const preventImageContextMenu = (event) => {
  event.preventDefault();
};

export const protectedImageStyle = {
  WebkitTouchCallout: 'none',
};

const PUBLIC_ASSET_PATH = /\/assets\//;

function elementHasPublicBackgroundImage(element) {
  if (!(element instanceof Element)) return false;
  const { backgroundImage } = window.getComputedStyle(element);
  if (!backgroundImage || backgroundImage === 'none') return false;
  return PUBLIC_ASSET_PATH.test(backgroundImage);
}

function shouldBlockImageContextMenu(target) {
  if (!(target instanceof Element)) return false;

  if (target.closest('img')) return true;

  let node = target;
  while (node && node !== document.documentElement) {
    if (elementHasPublicBackgroundImage(node)) return true;
    node = node.parentElement;
  }

  return false;
}

function handleContextMenu(event) {
  if (shouldBlockImageContextMenu(event.target)) {
    event.preventDefault();
  }
}

function handleDragStart(event) {
  const img =
    event.target instanceof HTMLImageElement ? event.target : event.target.closest?.('img');
  if (img) event.preventDefault();
}

/** Site-wide protection for <img> tags and /assets/ background images. */
export function installSiteImageProtection() {
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('dragstart', handleDragStart);

  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('dragstart', handleDragStart);
  };
}
