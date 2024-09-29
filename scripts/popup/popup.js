// popup.js

let activityChart = null;

const TOTAL_SITE_TO_DISPLAY_IN_CHART= 10;

document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const siteFilter = document.getElementById('siteFilter');
  const timeRange = document.getElementById('timeRange');
  const customDateRange = document.getElementById('customDateRange');
  const siteDataBody = document.querySelector('#siteData tbody');
  
  refreshBtn.addEventListener('click', updateData);
  clearBtn.addEventListener('click', clearData);
  siteFilter.addEventListener('input', updateTable);
  timeRange.addEventListener('change', handleTimeRangeChange);
  
  flatpickr(customDateRange, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    onClose: updateData
  });
  
  updateData();

  function clearData() {
    chrome.storage.local.clear();
    updateDashboard({});
    updateChart({});
    updateTable({});
  }

  function updateData() {
    chrome.storage.local.get(['trackedSites'], (result) => {
      const trackedSites = result.trackedSites || {};
      
      const filteredSites = getFilteredSites(trackedSites);
      updateDashboard(filteredSites);
      updateChart(filteredSites);
      updateTable(filteredSites);
    });
  }
  
  function getFilteredSites(trackedSites) {
    const filter = siteFilter.value.toLowerCase();
    const range = getDateRange();
    
    return Object.entries(trackedSites)
      .filter(([domain, data]) => {
        return domain.toLowerCase().includes(filter) &&
               new Date(data.lastVisit) >= range.start && 
               new Date(data.lastVisit) <= range.end;
      })
      .reduce((filtered, [domain, data]) => {
        filtered[domain] = data;
        return filtered;
      }, {});
  }

  
  function updateDashboard(trackedSites) {
    const timeSpent = document.querySelector('#timeSpent .value');
    const urlsVisited = document.querySelector('#urlsVisited .value');
    let topUrl = document.querySelector('#topUrl .value');

    let timeSpentCount = 0;
    let topUrlDomain = "";
    let maxTotal = -1;
    
    Object.keys(trackedSites).forEach(domain => {
      const site = trackedSites[domain];
      timeSpentCount+= site.totalTime;
      if (site.totalTime>maxTotal){
        maxTotal = site.totalTime;
        topUrlDomain=domain;
      }
    });

    timeSpent.textContent = formatTime(timeSpentCount);
    urlsVisited.textContent = Object.values(trackedSites).length;
    topUrl.textContent = topUrlDomain;
}

  function updateChart(trackedSites) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    const topSites = Object.entries(trackedSites)
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, TOTAL_SITE_TO_DISPLAY_IN_CHART);
  
    const labels = topSites.map(([domain, _]) => getDomainName(domain));
    const data = topSites.map(([_, site]) => site.totalTime / 60);
    
    if (activityChart) {
      activityChart.destroy();
    }
    
    activityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Time Spent (minutes)',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  function updateTable() {
    const filter = siteFilter.value.toLowerCase();
    const range = getDateRange();
    
    chrome.storage.local.get(['trackedSites'], (result) => {
      const trackedSites = result.trackedSites || {};
      siteDataBody.innerHTML = '';
      
      Object.entries(trackedSites)
        .filter(([domain, data]) => {
          return domain.toLowerCase().includes(filter) && 
                 new Date(data.lastVisit) >= range.start && 
                 new Date(data.lastVisit) <= range.end;
        }).sort((a, b) => b[1].lastVisit - a[1].lastVisit)
        .forEach(([domain, data]) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${getDomainName(domain)}</td>
            <td>${data.visits}</td>
            <td>${formatTime(data.totalTime)}</td>
            <td>${formatLastVisit(data.lastVisit)}</td>
            <td><button class="delete-btn" data-domain="${domain}">❌</button></td>
          `;
          siteDataBody.appendChild(row);
        });
      
      // Add event listeners for delete buttons
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
      });
    });
  }
  
  function handleTimeRangeChange() {
    customDateRange.style.display = timeRange.value === 'custom' ? 'inline-block' : 'none';
    updateData();
  }
  
  function getDateRange() {
    const now = new Date();
    let start, end;

    switch (timeRange.value) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        break;
      case 'week':
        const startOfWeek = new Date(now); 
        const dayOfWeek = startOfWeek.getDay(); 
        
        const daysSinceMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
        
        start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'custom':
        const dates = customDateRange.value.split(' to ');
        start = dates[0] ? new Date(dates[0]) : new Date(0);
        end = dates[1] ? new Date(dates[1]) : now;
        break;
    }
    
    return { start, end };
  }
  
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  
  function formatLastVisit(timestamp) {
    const now = new Date();
    const lastVisit = new Date(timestamp);
    const diffSeconds = Math.floor((now - lastVisit) / 1000);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} days ago`;
    return lastVisit.toLocaleDateString();
  }
  
  function handleDelete(event) {
    const domain = event.target.dataset.domain;
    const simpleDomain = getDomainName(domain);
    // if (confirm(`Are you sure you want to delete tracking data for ${simpleDomain} and add it to blocked sites?`)) {
    chrome.storage.local.get(['trackedSites', 'blockedSites'], (result) => {
      let trackedSites = result.trackedSites || {};
      let blockedSites = result.blockedSites || [];
      
      delete trackedSites[domain];
      if (!blockedSites.includes(simpleDomain)) {
        blockedSites.push(simpleDomain);
      }
      
      chrome.storage.local.set({ trackedSites, blockedSites }, () => {
        updateData();
      });
    });
  }
});