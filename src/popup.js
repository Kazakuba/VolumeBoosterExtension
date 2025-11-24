document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const resetButton = document.getElementById("resetButton");
  const tabsContainer = document.getElementById("audioTabsContainer");

  let currentTabId = null;
  const tabVolumeMap = {};

  function updateUIForTab(tabId) {
    const key = tabId.toString();

    slider.value = 1;
    volumeValue.textContent = "100%";
    tabVolumeMap[tabId] = 1;

    chrome.storage.local.get([key], result => {
      const gain = result[key] || 1;
      tabVolumeMap[tabId] = gain;

      slider.value = gain;
      volumeValue.textContent = `${Math.round(gain * 100)}%`;

      updateTabListUI();
    });
  }

  function boostTabAudio(tabId, gain) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (gainValue) => {
        (async () => {
          const vid = document.querySelector("video");
          if (!vid) return;
          if (!vid._audioBoosted) {
            const stream = vid.captureStream();
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const gain = ctx.createGain();
            gain.gain.value = gainValue;
            src.connect(gain).connect(ctx.destination);

            vid._audioBoosted = true;
            vid._gainNode = gain;
            vid._audioCtx = ctx;
          } else {
            vid._gainNode.gain.value = gainValue;
          }
        })();
      },
      args: [gain]
    });
  }

  function updateTabListUI() {
    tabsContainer.innerHTML = '';

    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs.length === 0) {
        tabsContainer.innerHTML = '<em>No audible tabs detected</em>';
        clearStaleVolumes([]);
        return;
      }

      const audibleTabIds = tabs.map(tab => tab.id.toString());

      chrome.storage.local.get(audibleTabIds, (result) => {
        audibleTabIds.forEach(id => {
          tabVolumeMap[id] = result[id] || 1;
        });

        clearStaleVolumes(new Set(audibleTabIds.map(id => parseInt(id))));

        tabs.forEach(tab => {
          const gain = tabVolumeMap[tab.id] || 1;

          const div = document.createElement("div");
          div.className = "tab-entry";
          
          // Note: Added logic to handle missing favicons gracefully
          const favIcon = tab.favIconUrl ? `<img class="favicon" src="${tab.favIconUrl}" />` : '';
          
          div.innerHTML = `
            ${favIcon}
            <span class="title">${tab.title}</span>
            <span class="volume-percent">${Math.round(gain * 100)}%</span>
          `;
          tabsContainer.appendChild(div);
        });
      });
    });
  }

  function clearStaleVolumes(audibleTabIds) {
    for (const tabId in tabVolumeMap) {
      if (Array.isArray(audibleTabIds) ? !audibleTabIds.includes(parseInt(tabId)) : !audibleTabIds.has(parseInt(tabId))) {
        delete tabVolumeMap[tabId];
        chrome.storage.local.remove(tabId);
      }
    }
  }

  slider.addEventListener("input", () => {
    const gain = parseFloat(slider.value);
    volumeValue.textContent = `${Math.round(gain * 100)}%`;

    if (currentTabId !== null) {
      boostTabAudio(currentTabId, gain);
      tabVolumeMap[currentTabId] = gain;
      updateTabListUI();

      chrome.storage.local.set({ [currentTabId.toString()]: gain });
    }
  });

  resetButton.addEventListener("click", () => {
    slider.value = 1;
    volumeValue.textContent = "100%";

    if (currentTabId !== null) {
      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => {
          const vid = document.querySelector('video');
          if (vid && vid._audioBoosted) {
            vid._gainNode.disconnect();
            vid._audioCtx.close();
            delete vid._gainNode;
            delete vid._audioCtx;
            delete vid._audioBoosted;
            console.log("Booster disabled, volume reset.");
          }
        }
      });

      delete tabVolumeMap[currentTabId];
      chrome.storage.local.remove(currentTabId.toString());
      updateTabListUI();
    }
  });

  function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        currentTabId = tabs[0].id;
        updateUIForTab(currentTabId);
      }
    });
  }

  chrome.tabs.onActivated.addListener(activeInfo => {
    currentTabId = activeInfo.tabId;
    updateUIForTab(currentTabId);
  });

  init();
});