let trackedTabs = {};
let activeTabId = null;
let lastActiveTime = Date.now();
let isBrowserFocused = true;
let isSystemActive = true;

const getDomainName = (url) => {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch (e) {
    return url;
  }
}

function updateTrackedData(domain, timeSpent, isNewVisit = false) {
  chrome.storage.local.get(['trackedSites', 'blockedSites'], (result) => {
    let trackedSites = result.trackedSites || {};
    const blockedSites = result.blockedSites || [];
    
    if (domain && !blockedSites.includes(domain)) {
      const today = new Date().toDateString();
      if (!trackedSites[domain]) {
        trackedSites[domain] = {
          visits: 0,
          totalTime: {},
          lastVisit: Date.now()
        };
      }
      if (isNewVisit) {
        trackedSites[domain].visits++;
      }
      trackedSites[domain].lastVisit = Date.now();
      trackedSites[domain].totalTime[today] = (trackedSites[domain].totalTime[today] || 0) + timeSpent;
      chrome.storage.local.set({ trackedSites });
    }
  });
}



function updateActiveTabTime() {
  if ((isBrowserFocused || isSystemActive) && activeTabId && trackedTabs[activeTabId]) {
    const currentTime = Date.now();
    const timeSpent = (currentTime - lastActiveTime) / 1000;
    updateTrackedData(trackedTabs[activeTabId].domain, timeSpent);
    lastActiveTime = currentTime;
  }
}

function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainName(tab.url);
    const isNewVisit = !trackedTabs[tabId] || trackedTabs[tabId].domain !== domain;
    
    updateActiveTabTime();  // Update time for the previously active tab
    
    if (isNewVisit) {
      updateTrackedData(domain, 0, true);
    }
    
    trackedTabs[tabId] = { domain: domain };
    
    if (tabId === activeTabId) {
      lastActiveTime = Date.now();
    }
  }
}

function handleTabActivated(activeInfo) {
  updateActiveTabTime();  // Update time for the previously active tab
  activeTabId = activeInfo.tabId;
  lastActiveTime = Date.now();
  
  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const domain = getDomainName(tab.url);
    trackedTabs[activeTabId] = { domain: domain };
  });
}

function handleTabRemoved(tabId) {
  if (tabId === activeTabId) {
    updateActiveTabTime();
  }
  delete trackedTabs[tabId];
  if (tabId === activeTabId) {
    activeTabId = null;
  }
}

function handleWindowFocusChanged(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    isBrowserFocused = false;
    updateActiveTabTime();
    activeTabId = null;
  } else {
    isBrowserFocused = true;
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        lastActiveTime = Date.now();
        const domain = getDomainName(tabs[0].url);
        trackedTabs[activeTabId] = { domain };
      }
    });
  }
}

function setupIdleDetection() {
  chrome.idle.setDetectionInterval(15); // Set idle detection to 15 seconds
  chrome.idle.onStateChanged.addListener((state) => {
    isSystemActive = state === 'active';
    if (!isSystemActive) {
      updateActiveTabTime(); 
    } else {
      lastActiveTime = Date.now(); 
    }
  });
}




function setupListeners() {
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onRemoved.addListener(handleTabRemoved);
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);
  setupIdleDetection();
  setInterval(updateActiveTabTime, 30* 1000);  // Update every 30 seconds when conditions are met
}

function cleanupListeners() {
  chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  chrome.tabs.onActivated.removeListener(handleTabActivated);
  chrome.tabs.onRemoved.removeListener(handleTabRemoved);
  chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged);
}

setupListeners();
chrome.runtime.onSuspend.addListener(cleanupListeners);