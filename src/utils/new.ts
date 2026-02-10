import ConfigAPI from './config';

async function encodeProxyUrl(url: string): Promise<string> {
  
  if (!url) return url;
  let result = '';
  for (let i = 0; i < url.length; i++) {
    result += i % 2 ? String.fromCharCode(url.charCodeAt(i) ^ 7) : url[i];
  }
  return '/v1/data/' + encodeURIComponent(result);
}

let isLoading = false;
let loadTimer: ReturnType<typeof setTimeout> | null = null;

function showLoader() {
  const bar = document.getElementById('loading-bar') as HTMLDivElement | null;
  if (!bar || isLoading) return;
  isLoading = true;
  bar.style.cssText = 'display:block;opacity:1;width:0%;transition:none';
  requestAnimationFrame(() => {
    if (!isLoading) return;
    bar.style.cssText =
      'display:block;opacity:1;width:80%;transition:width .5s cubic-bezier(.4,0,.2,1)';
  });
  loadTimer = setTimeout(() => {
    if (isLoading && bar) {
      bar.style.transition = 'width .3s cubic-bezier(.4,0,.2,1)';
      bar.style.width = '90%';
    }
  }, 1200);
}

function hideLoader() {
  const bar = document.getElementById('loading-bar') as HTMLDivElement | null;
  if (!bar || !isLoading) return;
  bar.style.cssText =
    'display:block;opacity:1;width:100%;transition:width .2s cubic-bezier(.4,0,.2,1)';
  setTimeout(() => {
    bar.style.cssText = 'display:none;opacity:0;width:0%';
    isLoading = false;
  }, 180);
}

function resetLoader() {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
  hideLoader();
}

document.addEventListener('DOMContentLoaded', () => {
  
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const ampmEl = document.getElementById('ampm');
  const serverEl = document.getElementById('sl');
  const refreshBtn = document.getElementById('refresh');


  const urlbar = document.getElementById('urlbar') as HTMLInputElement | null;

  let clockInterval: ReturnType<typeof setInterval> | null = null;
  let spinTimeout: ReturnType<typeof setTimeout> | null = null;

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    hoursEl && (hoursEl.textContent = hours.toString().padStart(2, '0'));
    minutesEl && (minutesEl.textContent = minutes.toString().padStart(2, '0'));
    secondsEl && (secondsEl.textContent = seconds.toString().padStart(2, '0'));
    ampmEl && (ampmEl.textContent = ampm);
  }

  async function pingServer(url: string) {
    const start = performance.now();
    try {
      await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      return { ok: true, latency: Math.round(performance.now() - start) };
    } catch {
      return { ok: false, latency: 0 };
    }
  }

  async function updatePing() {
    if (!serverEl) return;
    serverEl.textContent = 'Pinging...';
    const result = await pingServer(window.location.origin);
    if (result.ok) {
      const color =
        result.latency >= 300
          ? 'text-red-500'
          : result.latency >= 100
            ? 'text-yellow-400'
            : 'text-green-400';
      serverEl.innerHTML = `Server: <span class="${color} ml-1">${result.latency}ms</span>`;
    } else {
      serverEl.textContent = 'Offline';
    }
  }

  function handleRefreshClick() {
    if (!refreshBtn) return;
    refreshBtn.classList.add('animate-spin');
    updatePing().finally(() => {
      if (spinTimeout) clearTimeout(spinTimeout);
      spinTimeout = setTimeout(() => refreshBtn.classList.remove('animate-spin'), 800);
    });
  }

  
  urlbar?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = urlbar.value.trim();
      if (!input) return;

     
      showLoader();

    
      const internalRoutes: Record<string, string> = {
        'lunar://settings': '/st',
        'lunar://games': '/math',
        'lunar://apps': '/sci',
      };
      
      if (internalRoutes[input]) {
        window.location.href = internalRoutes[input];
        return;
      }
      
   
      let url = input;
      if (!input.includes('.') && !input.startsWith('http')) {
    
        const searchEngine = await ConfigAPI.get('engine') || 'https://duckduckgo.com/?q=';
        url = searchEngine + encodeURIComponent(input);
      } else if (!input.startsWith('http://') && !input.startsWith('https://')) {
   
        url = 'https://' + input;
      }
      
      try {
      
        const proxyUrl = await encodeProxyUrl(url);
        
        
        window.location.href = proxyUrl;
      } catch (error) {
        console.error('Error encoding URL:', error);
        resetLoader();
      }
    }
  });

  function cleanup() {
    if (clockInterval) clearInterval(clockInterval);
    if (spinTimeout) clearTimeout(spinTimeout);
    if (loadTimer) clearTimeout(loadTimer);
    refreshBtn?.removeEventListener('click', handleRefreshClick);
  }

  clockInterval = setInterval(updateClock, 1000);
  updateClock();

  refreshBtn?.addEventListener('click', handleRefreshClick);

  updatePing();

  window.addEventListener('unload', cleanup);
});