// Frontend Logic for YouTube Audio Streamer
document.addEventListener('DOMContentLoaded', () => {
    // Config & Elements
    const API_BASE_URL_KEY = 'yt_audio_api_base_url';
    const DEFAULT_API_URL = 'https://ytdl-audio-backend.onrender.com';
    let currentApiUrl = localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_URL;

    const urlInput = document.getElementById('youtube-url');
    const extractBtn = document.getElementById('extract-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');

    const resultCard = document.getElementById('result-card');
    const thumbImg = document.getElementById('video-thumb');
    const videoTitle = document.getElementById('video-title');
    const videoUploader = document.getElementById('video-uploader');
    const videoDuration = document.getElementById('video-duration');
    const downloadBtn = document.getElementById('download-btn');
    const copyUrlBtn = document.getElementById('copy-url-btn');

    // Audio Player Elements
    const audioPlayer = document.getElementById('audio-element');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const volumeSlider = document.getElementById('volume-slider');

    // History & Settings
    const historyContainer = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const apiInput = document.getElementById('custom-api-input');
    const saveApiBtn = document.getElementById('save-api-btn');

    let currentStreamUrl = '';

    // Initialize API input
    if (apiInput) apiInput.value = currentApiUrl;

    // Check Backend Status
    async function checkBackendHealth() {
        try {
            const res = await fetch(`${currentApiUrl}/`, { method: 'GET' });
            if (res.ok) {
                statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
                statusText.innerText = 'Backend Online (24/7)';
                statusText.className = 'text-xs font-medium text-emerald-400';
            } else {
                throw new Error();
            }
        } catch {
            statusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
            statusText.innerText = 'Backend Đang Khởi Động';
            statusText.className = 'text-xs font-medium text-amber-400';
        }
    }

    checkBackendHealth();
    setInterval(checkBackendHealth, 30000); // Check every 30s

    // Save custom API URL
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', () => {
            const val = apiInput.value.trim().replace(/\/$/, '');
            if (val) {
                currentApiUrl = val;
                localStorage.setItem(API_BASE_URL_KEY, currentApiUrl);
                showToast('Đã lưu cấu hình API!');
                checkBackendHealth();
            }
        });
    }

    // Paste from clipboard
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    urlInput.value = text.trim();
                    showToast('Đã dán link từ clipboard!');
                }
            } catch (err) {
                showToast('Không thể đọc clipboard, vui lòng tự dán.', 'error');
            }
        });
    }

    // Format Duration (seconds to mm:ss)
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === null) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Extract Audio Handler
    async function handleExtract() {
        const rawUrl = urlInput.value.trim();
        if (!rawUrl) {
            showToast('Vui lòng nhập đường dẫn YouTube!', 'error');
            return;
        }

        if (!rawUrl.includes('youtube.com') && !rawUrl.includes('youtu.be')) {
            showToast('Đường dẫn không hợp lệ! Hãy dùng link YouTube.', 'error');
            return;
        }

        setLoading(true);

        try {
            const endpoint = `${currentApiUrl}/api/audio?url=${encodeURIComponent(rawUrl)}`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.detail || data.error || 'Không thể bóc tách audio từ video này.');
            }

            renderResult(data.data);
            saveToHistory(data.data);
            showToast('Đã lấy link stream thành công!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    extractBtn.addEventListener('click', handleExtract);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleExtract();
    });

    // Render Audio Result
    function renderResult(item) {
        currentStreamUrl = item.audio_stream_url;
        thumbImg.src = item.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';
        videoTitle.innerText = item.title || 'YouTube Audio';
        videoUploader.innerText = item.uploader || 'YouTube Channel';
        videoDuration.innerText = formatTime(item.duration);

        // Load Audio into player
        audioPlayer.src = currentStreamUrl;
        audioPlayer.load();
        resetPlayerControls();

        // Download link
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = currentStreamUrl;
            a.download = `${(item.title || 'audio').replace(/[/\\?%*:|"<>]/g, '_')}.m4a`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        // Copy stream URL
        copyUrlBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(currentStreamUrl);
                showToast('Đã copy link stream audio!');
            } catch {
                showToast('Không thể copy link!', 'error');
            }
        };

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Audio Player Controls
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            audioPlayer.pause();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!isNaN(audioPlayer.duration)) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.value = progress || 0;
            currentTimeEl.innerText = formatTime(audioPlayer.currentTime);
            totalTimeEl.innerText = formatTime(audioPlayer.duration);
        }
    });

    progressBar.addEventListener('input', () => {
        if (!isNaN(audioPlayer.duration)) {
            const seekTime = (progressBar.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
        }
    });

    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value;
    });

    audioPlayer.addEventListener('ended', () => {
        resetPlayerControls();
    });

    function resetPlayerControls() {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        progressBar.value = 0;
        currentTimeEl.innerText = '00:00';
    }

    // Set Loading State
    function setLoading(isLoading) {
        if (isLoading) {
            extractBtn.disabled = true;
            extractBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang bóc tách...</span>
            `;
            extractBtn.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            extractBtn.disabled = false;
            extractBtn.innerHTML = `
                <svg class="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                <span>Lấy Audio</span>
            `;
            extractBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    // Toast Notification
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-message');
        const toastIcon = document.getElementById('toast-icon');

        toastMsg.innerText = message;
        if (type === 'error') {
            toast.className = 'fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform bg-red-500/90 text-white border border-red-400 backdrop-blur-md';
            toastIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
        } else {
            toast.className = 'fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform bg-emerald-600/90 text-white border border-emerald-400 backdrop-blur-md';
            toastIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`;
        }

        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3500);
    }

    // History Management
    const HISTORY_KEY = 'yt_audio_history';
    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveToHistory(item) {
        let history = getHistory();
        history = history.filter(h => h.id !== item.id);
        history.unshift({
            id: item.id,
            title: item.title,
            uploader: item.uploader,
            thumbnail: item.thumbnail,
            duration: item.duration,
            audio_stream_url: item.audio_stream_url,
            savedAt: new Date().toISOString()
        });
        if (history.length > 8) history.pop();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        if (history.length === 0) {
            historyContainer.innerHTML = `<div class="text-sm text-gray-500 py-4 text-center">Chưa có bài hát nào được tải gần đây.</div>`;
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 rounded-xl glass-input hover:border-indigo-500/50 transition cursor-pointer group';
            div.innerHTML = `
                <div class="flex items-center space-x-3 overflow-hidden">
                    <img src="${item.thumbnail}" class="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div class="overflow-hidden">
                        <div class="text-sm font-semibold text-gray-200 truncate group-hover:text-indigo-400">${item.title}</div>
                        <div class="text-xs text-gray-400 truncate">${item.uploader} • ${formatTime(item.duration)}</div>
                    </div>
                </div>
                <button class="p-2 text-gray-400 hover:text-white flex-shrink-0" title="Phát lại">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                </button>
            `;
            div.addEventListener('click', () => {
                renderResult(item);
            });
            historyContainer.appendChild(div);
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem(HISTORY_KEY);
            renderHistory();
            showToast('Đã xoá lịch sử!');
        });
    }

    renderHistory();
});
