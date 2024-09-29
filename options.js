// options.js
document.addEventListener('DOMContentLoaded', () => {
    const trackClicks = document.getElementById('trackClicks');
    const trackVisits = document.getElementById('trackVisits');
    const trackTime = document.getElementById('trackTime');
    const blockedSites = document.getElementById('blockedSites');
    const clearData = document.getElementById('clearData');
    const exportData = document.getElementById('exportData');
    const importData = document.getElementById('importData');
    const importDataBtn = document.getElementById('importDataBtn');
    const saveSettings = document.getElementById('saveSettings');
  
    // Load current settings
    chrome.storage.local.get(['trackingOptions', 'blockedSites'], (result) => {
      const trackingOptions = result.trackingOptions || {
        trackClicks: true,
        trackVisits: true,
        trackTime: true
      };
      const blockedSitesList = result.blockedSites || [];
  
      trackClicks.checked = trackingOptions.trackClicks;
      trackVisits.checked = trackingOptions.trackVisits;
      trackTime.checked = trackingOptions.trackTime;
      blockedSites.value = blockedSitesList.join('\n');
    });
  
    // Save settings
    saveSettings.addEventListener('click', () => {
      const trackingOptions = {
        trackClicks: trackClicks.checked,
        trackVisits: trackVisits.checked,
        trackTime: trackTime.checked
      };
      const blockedSitesList = blockedSites.value.split('\n').map(site => site.trim()).filter(Boolean);
  
      chrome.storage.local.set({
        trackingOptions: trackingOptions,
        blockedSites: blockedSitesList
      }, () => {
        alert('Settings saved successfully!');
      });
    });
  
    // Clear all tracking data
    clearData.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all tracking data? This action cannot be undone.')) {
        chrome.storage.local.remove(['trackedSites'], () => {
          alert('All tracking data has been cleared.');
        });
      }
    });
  
    // Export tracking data
    exportData.addEventListener('click', () => {
      chrome.storage.local.get(['trackedSites', 'trackingOptions', 'blockedSites'], (result) => {
        const data = JSON.stringify(result, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'web_activity_tracker_data.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  
    // Import tracking data
    importDataBtn.addEventListener('click', () => {
      importData.click();
    });
  
    importData.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            chrome.storage.local.set(importedData, () => {
              alert('Data imported successfully!');
              location.reload();
            });
          } catch (error) {
            alert('Error importing data. Please make sure the file is valid JSON.');
          }
        };
        reader.readAsText(file);
      }
    });
  });