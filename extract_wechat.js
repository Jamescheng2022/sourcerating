(async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Scroll to bottom to ensure all images/lazy-loaded content is there (though we only need text)
  let lastScrollTop = -1;
  while (true) {
    window.scrollBy(0, 1000);
    await sleep(500);
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop === lastScrollTop) break;
    lastScrollTop = scrollTop;
    // Safety break if it's extremely long
    if (scrollTop > 50000) break;
  }

  const title = document.querySelector('#activity-name')?.innerText.trim() || '';
  const author = document.querySelector('#js_name')?.innerText.trim() || '';
  const publishTime = document.querySelector('#publish_time')?.innerText.trim() || '';
  const content = document.querySelector('#js_content')?.innerText.trim() || '';

  return {
    title,
    author,
    publishTime,
    content
  };
})()
