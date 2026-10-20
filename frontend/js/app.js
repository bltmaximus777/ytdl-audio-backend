document.addEventListener('DOMContentLoaded', () => {
    // Mã hoá endpoint backend, giải mã runtime
    const _e = 'aHR0cHM6Ly95dGRsLWF1ZGlvLWJhY2tlbmQub25yZW5kZXIuY29t';
    const API_URL = atob(_e);

    // Elements
    const urlInput = document.getElementById('youtube-url');
    const extractBtn = document.getElementById('extract-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    const resultCard = document.getElementById('result-card');
    const thumbImg = document.getElementById('video-thumb');
    const videoTitle = document.getElementById('video-title');
    const videoUploader = document.getElementById('video-uploader');
    const videoDuration = document.getElementById('video-duration');

    const downloadAudioBtn = document.getElementById('download-audio-btn');
    const downloadVideoBtn = document.getElementById('download-video-btn');
    const audioQualityTag = document.getElementById('audio-quality-tag');
    const videoQualityTag = document.getElementById('video-quality-tag');
    const copyUrlBtn = document.getElementById('copy-url-btn');

    // Progress Elements
    const progressContainer = document.getElementById('download-progress-container');
    const progressPercent = document.getElementById('download-progress-percent');
    const progressBarEl = document.getElementById('download-progress-bar');
    const progressBytes = document.getElementById('download-progress-bytes');
    const progressStatus = document.getElementById('download-progress-status');

    // Audio Player
    const audioPlayer = document.getElementById('audio-element');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const volumeSlider = document.getElementById('volume-slider');

    // Sidebar
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');

    // History
    const historyContainer = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    let currentItem = null;
    let isDownloading = false;

    // Sidebar Toggle Logic
    let sidebarOpen = true;
    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        if (sidebarOpen) {
            sidebar.classList.remove('w-16');
            sidebar.classList.add('w-64');
            sidebarTexts.forEach(el => el.classList.remove('hidden'));
        } else {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-16');
            sidebarTexts.forEach(el => el.classList.add('hidden'));
        }
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Health check
    async function checkHealth() {
        try {
            const res = await fetch(`${API_URL}/`);
            if (res.ok) {
                statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
                statusText.innerText = 'Connected';
            } else {
                throw new Error();
            }
        } catch {
            statusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
            statusText.innerText = 'Starting...';
        }
    }
    checkHealth();

    // Paste
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) urlInput.value = text.trim();
            } catch {}
        });
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function formatBytes(bytes) {
        if (!bytes || isNaN(bytes)) return '0 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    }

    // Extract Info
    async function handleExtract() {
        const rawUrl = urlInput.value.trim();
        if (!rawUrl) return;

        extractBtn.disabled = true;
        extractBtn.innerText = 'Đang xử lý...';

        try {
            const res = await fetch(`${API_URL}/api/audio?url=${encodeURIComponent(rawUrl)}`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.detail || data.error || 'Lỗi bóc tách audio');
            }

            renderResult(data.data);
            saveHistory(data.data);
        } catch (err) {
            showToast(err.message);
        } finally {
            extractBtn.disabled = false;
            extractBtn.innerText = 'Tải Audio';
        }
    }

    extractBtn.addEventListener('click', handleExtract);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleExtract();
    });

    // Render Video / Audio Details
    function renderResult(item) {
        currentItem = item;
        const audioData = item.audio || { url: item.audio_stream_url, format: 'm4a', quality: '128k' };
        const videoData = item.video;

        thumbImg.src = item.thumbnail || '';
        videoTitle.innerText = item.title || 'YouTube Media';
        videoUploader.innerText = item.uploader || '';
        videoDuration.innerText = formatTime(item.duration);

        // Tags
        audioQualityTag.innerText = (audioData.format || 'm4a').toUpperCase();
        if (videoData) {
            videoQualityTag.innerText = `${videoData.resolution || '720p'} MP4`;
            downloadVideoBtn.classList.remove('hidden');
        } else {
            downloadVideoBtn.classList.add('hidden');
        }

        // Load Audio Player
        audioPlayer.src = audioData.url;
        audioPlayer.load();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        progressBar.value = 0;

        // Clean filename
        const safeTitle = (item.title || 'media').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80);

        // Download Audio Action
        downloadAudioBtn.onclick = () => {
            const ext = audioData.format || 'm4a';
            downloadWithProgress(audioData.url, `${safeTitle}.${ext}`, 'Audio');
        };

        // Download Video Action
        if (videoData) {
            downloadVideoBtn.onclick = () => {
                downloadWithProgress(videoData.url, `${safeTitle}.mp4`, 'Video');
            };
        }

        // Copy Stream URL
        copyUrlBtn.onclick = async () => {
            await navigator.clipboard.writeText(audioData.url);
            showToast('Đã copy stream URL!');
        };

        resultCard.classList.remove('hidden');
    }

    // Download with live progress percentage
    async function downloadWithProgress(streamUrl, filename, type) {
        if (isDownloading) {
            showToast('Đang có file đang tải, vui lòng chờ!');
            return;
        }

        isDownloading = true;
        progressContainer.classList.remove('hidden');
        progressBarEl.style.width = '0%';
        progressPercent.innerText = '0%';
        progressStatus.innerText = `Đang tải ${type}...`;
        progressBytes.innerText = 'Đang kết nối...';

        try {
            const proxyEndpoint = `${API_URL}/api/download?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(filename)}`;
            const response = await fetch(proxyEndpoint);

            if (!response.ok) throw new Error('Không thể tải file từ máy chủ stream');

            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

            const reader = response.body.getReader();
            const chunks = [];
            let receivedBytes = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                if (totalBytes > 0) {
                    const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
                    progressBarEl.style.width = `${percent}%`;
                    progressPercent.innerText = `${percent}%`;
                    progressBytes.innerText = `${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}`;
                } else {
                    progressBytes.innerText = `${formatBytes(receivedBytes)}`;
                }
            }

            // Save file as Blob
            progressBarEl.style.width = '100%';
            progressPercent.innerText = '100%';
            progressStatus.innerText = 'Đang lưu file vào thiết bị...';

            const blob = new Blob(chunks, { type: type === 'Video' ? 'video/mp4' : 'audio/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            progressStatus.innerText = 'Hoàn tất tải xuống!';
            showToast(`Tải ${type} thành công!`);

            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 3000);
        } catch (err) {
            progressStatus.innerText = 'Lỗi tải xuống';
            showToast(err.message);
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 3500);
        } finally {
            isDownloading = false;
        }
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
        if (audioPlayer.duration) {
            progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            currentTimeEl.innerText = formatTime(audioPlayer.currentTime);
            totalTimeEl.innerText = formatTime(audioPlayer.duration);
        }
    });

    progressBar.addEventListener('input', () => {
        if (audioPlayer.duration) {
            audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
        }
    });

    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value;
    });

    function showToast(msg) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-message').innerText = msg;
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
    }

    // History
    const KEY = 'yt_history_simple';
    function getHistory() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
    }
    function saveHistory(item) {
        let h = getHistory().filter(x => x.id !== item.id);
        h.unshift(item);
        if (h.length > 6) h.pop();
        localStorage.setItem(KEY, JSON.stringify(h));
        renderHistory();
    }
    function renderHistory() {
        const h = getHistory();
        historyContainer.innerHTML = '';
        if (h.length === 0) {
            historyContainer.innerHTML = '<div class="text-xs text-gray-500 py-2">Trống</div>';
            return;
        }
        h.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs';
            div.innerHTML = `
                <div class="flex items-center space-x-2 truncate">
                    <img src="${item.thumbnail}" class="w-8 h-8 rounded object-cover flex-shrink-0">
                    <span class="truncate text-gray-300">${item.title}</span>
                </div>
                <span class="text-gray-500 flex-shrink-0 ml-2">${formatTime(item.duration)}</span>
            `;
            div.onclick = () => renderResult(item);
            historyContainer.appendChild(div);
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = () => {
            localStorage.removeItem(KEY);
            renderHistory();
        };
    }
    renderHistory();
});
