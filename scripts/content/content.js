let clickCount = 0;

document.addEventListener('click', () => {
  clickCount++;
  chrome?.runtime?.sendMessage?.({ action: 'updateClickCount', count: clickCount });
});