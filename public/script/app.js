const sections = document.querySelectorAll('.page-section');
    const burgerBtn = document.getElementById('burgerBtn');
    const burgerMenu = document.getElementById('burgerMenu');

    function showSection(id) {
      sections.forEach(section => {
        if (section.classList.contains('fade-in')) {
          section.classList.remove('fade-in');
          section.classList.add('fade-out');
          setTimeout(() => {
            section.style.display = 'none';
            section.classList.remove('fade-out');
          }, 300);
        }
      });

      const target = document.getElementById(id);
      target.style.display = 'block';
      setTimeout(() => {
        target.classList.add('fade-in');
      }, 10);
    }

    function toggleBurger() {
      burgerMenu.classList.toggle('opacity-0');
      burgerMenu.classList.toggle('pointer-events-none');
      burgerMenu.classList.toggle('scale-95');
    }

    burgerBtn.addEventListener('click', toggleBurger);

    window.addEventListener('load', () => {
      const loader = document.getElementById('loader');
      const modal = document.getElementById('welcomeModal');
      const modalContent = document.getElementById('modalContent');

      loader.classList.add('opacity-0');
      setTimeout(() => {
        loader.style.display = 'none';
        modal.classList.remove('hidden');
        setTimeout(() => {
          modalContent.classList.remove('scale-90', 'opacity-0');
        }, 50);
      }, 500);
    });

    function closeModal() {
      const modal = document.getElementById('welcomeModal');
      modal.classList.add('hidden');
    }
  
  function typeWriter(text, target, delay = 30) {
  target.textContent = "";
  let i = 0;
  const interval = setInterval(() => {
    target.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(interval);
  }, delay);
}
  
  function runSimQuery() {
  const query = document.getElementById('simQuery').value.trim();
  const apikey = document.getElementById('simApiKey').value.trim();
  const output = document.getElementById('simOutput');
  const resultBox = document.getElementById('simResult');

  if (!query || !apikey) {
    output.textContent = "Please enter both a message and your API key.";
    resultBox.classList.remove('hidden');
    return;
  }

  resultBox.classList.remove('hidden');
  output.innerHTML = `<div class="flex items-center gap-2 text-yellow-300"><svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m0 14v1m8-8h1M4 12H3m15.364-6.364l.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l.707.707"/></svg> Thinking...</div>`;

  fetch(`/sim?query=${encodeURIComponent(query)}&apikey=${encodeURIComponent(apikey)}`)
    .then(res => {
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return res.json();
    })
    .then(data => {
      setTimeout(() => {
        typeWriter(JSON.stringify(data, null, 2), output);
      }, 300);
    })
    .catch(err => {
      output.textContent = `Request failed: ${err.message}`;
    });
}
  
  function activateNav(el, sectionId) {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('nav-tab-active');
  });
  el.classList.add('nav-tab-active');
  showSection(sectionId);
}
  
  function runTeach() {
  const ask = document.getElementById('teachAsk').value.trim();
  const ans = document.getElementById('teachAns').value.trim();
  const key = document.getElementById('teachKey').value.trim();
  const output = document.getElementById('teachOutput');
  const resultBox = document.getElementById('teachResult');

  if (!ask || !ans || !key) {
    output.textContent = "Please fill in ask, ans, and your API key.";
    resultBox.classList.remove('hidden');
    return;
  }

  output.textContent = "Submitting...";
  resultBox.classList.remove('hidden');

  fetch(`/teach?ask=${encodeURIComponent(ask)}&ans=${encodeURIComponent(ans)}&apikey=${encodeURIComponent(key)}`)
    .then(res => {
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return res.json();
    })
    .then(data => {
      output.textContent = JSON.stringify(data, null, 2);
    })
    .catch(err => {
      output.textContent = `Request failed: ${err.message}`;
    });
    }
  
  const footer = document.querySelector('footer');

// Track initial viewport height
let originalHeight = window.innerHeight;

if (window.visualViewport) {
  visualViewport.addEventListener('resize', () => {
    const vh = visualViewport.height;

    // If viewport height decreased significantly, assume keyboard is open
    if (vh < originalHeight - 100) {
      footer.classList.add('footer-hidden');
    } else {
      footer.classList.remove('footer-hidden');
    }
  });
}
  
function showTab(section, lang) {
  ['node', 'python', 'fetch'].forEach(type => {
    document.getElementById(`code-${section}-${type}`).classList.add('hidden');
  });
  document.getElementById(`code-${section}-${lang}`).classList.remove('hidden');
}

function copyCode(btn) {
  const code = btn.nextElementSibling.innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = "Copy", 1500);
  });
}

    async function loadDashboard() {
  const spinner = document.getElementById('refreshSpinner');
  spinner.classList.remove('hidden');

  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey) return;

  try {
    const res = await fetch('/api/userinfo', {
      headers: { 'x-api-key': apiKey }
    });
    const data = await res.json();

    document.getElementById('dash-username').textContent = data.username;
    document.getElementById('dash-apikey').textContent = data.apiKey;
    document.getElementById('dash-sim').textContent = `${data.usage.sim} / 50`;
    document.getElementById('dash-teach').textContent = `${data.usage.teach} / 50`;

    document.getElementById('sim-progress').style.width = `${(data.usage.sim / 50) * 100}%`;
    document.getElementById('teach-progress').style.width = `${(data.usage.teach / 50) * 100}%`;

    const minutes = Math.floor(data.resetIn / 60000);
    const seconds = Math.floor((data.resetIn % 60000) / 1000);
    document.getElementById('dash-reset').textContent = `${minutes}m ${seconds}s until reset`;
  } catch (err) {
    alert("Failed to refresh dashboard.");
  } finally {
    spinner.classList.add('hidden');
  }
}

function copyApiKey() {
  const apiKey = document.getElementById('dash-apikey').textContent;
  navigator.clipboard.writeText(apiKey);
  const btn = event.target;
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 1500);
}

function logout() {
  fetch('/api/logout', { method: 'POST' })
    .then(() => {
      localStorage.clear();
      window.location.href = '/login';
    });
}

window.addEventListener('DOMContentLoaded', loadDashboard);
  
  const token = localStorage.getItem('token');
  const apiKey = localStorage.getItem('apiKey');

  if (!token || !apiKey) {
    window.location.href = '/login';
  }

    function updateRankingUI(data) {
    document.getElementById('your-rank').textContent = `#${data.yourRank}`;
    document.getElementById('your-calls').textContent = data.totalRequestUser || 0;
    document.getElementById('total-users').textContent = data.totalUsers;
    document.getElementById('total-calls').textContent = data.totalApiCalls;

    const list = document.getElementById('top-users');
    list.innerHTML = '';

    data.topUsers.forEach((user, index) => {
      const li = document.createElement('li');
      const trophyClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
      const trophyIcon = index < 3
        ? `<i class='fa-solid fa-trophy trophy ${trophyClass} mr-2'></i>`
        : `<span class='text-yellow-400 font-bold mr-2'>#${index + 1}</span>`;

      li.className = `flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-yellow-500/10 ${user.username.toLowerCase() === 'you' ? 'highlight-user' : ''}`;
      li.innerHTML = `
        <div class='flex items-center'>${trophyIcon}<span class='text-green-400'>${user.username}</span></div>
        <span class='text-gray-400 font-mono'>${user.totalUsage || 0} calls</span>`;
      list.appendChild(li);
    });
  }

  function connectRankingSocket(retry = 0) {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    const socket = new WebSocket('wss://simsimi.ooguy.com'); // update this if hosted

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'ranking', apiKey }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ranking') {
          updateRankingUI(msg.data);
        }
      } catch (err) {
        console.error('Invalid JSON from WebSocket:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    socket.onclose = () => {
      const delay = Math.min(5000, 1000 * (retry + 1));
      console.warn(`WebSocket closed. Reconnecting in ${delay / 1000}s...`);
      setTimeout(() => connectRankingSocket(retry + 1), delay);
    };
  }

  async function loadRankingFallback() {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;

    try {
      const res = await fetch('/api/ranking', { headers: { 'x-api-key': apiKey } });
      const data = await res.json();
      updateRankingUI(data);
    } catch (err) {
      console.error('Fallback ranking fetch failed:', err);
      document.getElementById('top-users').innerHTML = '<li class="text-red-500">Failed to load ranking.</li>';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    connectRankingSocket();
    loadRankingFallback(); // Load once initially in case WebSocket is delayed or fails
  });
