export default defineBackground(() => {
  const FRAMES = [
    'icons/frames/frame000.png',
    'icons/frames/frame003.png',
    'icons/frames/frame006.png',
    'icons/frames/frame009.png',
    'icons/frames/frame012.png',
    'icons/frames/frame015.png',
    'icons/frames/frame018.png',
    'icons/frames/frame021.png',
    'icons/frames/frame024.png',
    'icons/frames/frame027.png',
    'icons/frames/frame030.png',
    'icons/frames/frame033.png',
    'icons/frames/frame036.png',
    'icons/frames/frame039.png',
    'icons/frames/frame042.png',
    'icons/frames/frame045.png',
    'icons/frames/frame048.png',
    'icons/frames/frame051.png',
    'icons/frames/frame054.png',
    'icons/frames/frame057.png',
    'icons/frames/frame060.png',
    'icons/frames/frame063.png',
    'icons/frames/frame066.png',
    'icons/frames/frame069.png',
  ];
  const FRAME_DELAY = 100;

  let animFrame = 0;
  let animTimer: ReturnType<typeof setInterval> | null = null;

  function startAnimation(): void {
    if (animTimer) return;
    animFrame = 0;
    animTimer = setInterval(() => {
      browser.action.setIcon({ path: FRAMES[animFrame] });
      animFrame = (animFrame + 1) % FRAMES.length;
    }, FRAME_DELAY);
  }

  function stopAnimation(): void {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
    browser.action.setIcon({
      path: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    });
  }

  browser.action.onClicked.addListener((tab) => {
    if (!tab.id) return;
    startAnimation();

    browser.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      })
      .finally(() => {
        stopAnimation();
      });
  });
});
