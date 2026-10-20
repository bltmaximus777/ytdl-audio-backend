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

    const videoSelect = document.getElementById('video-select');
    const audioSelect = document.getElementById('audio-select');
    const downloadVideoBtn = document.getElementById('download-video-btn');
    const downloadAudioBtn = document.getElementById('download-audio-btn');
    const directFastBtn = document.getElementById('direct-fast-btn');
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

    // Sidebar Toggle
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

    function isYouTubeUrl(url) {
        return /(?:youtube\.com\/(?:watch\?|shorts\/|embed\/)|youtu\.be\/)/i.test(url);
    }

    // Paste & Auto-extract
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    urlInput.value = text.trim();
                    if (isYouTubeUrl(text.trim())) {
                        handleExtract();
                    }
                }
            } catch {}
        });
    }

    urlInput.addEventListener('paste', () => {
        setTimeout(() => {
            const val = urlInput.value.trim();
            if (isYouTubeUrl(val)) {
                handleExtract();
            }
        }, 80);
    });

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

        const extractBtnText = document.getElementById('extract-btn-text');
        extractBtn.disabled = true;
        if (extractBtnText) extractBtnText.innerText = 'Đang phân tích...';
        else extractBtn.innerText = 'Đang phân tích...';

        try {
            const res = await fetch(`${API_URL}/api/audio?url=${encodeURIComponent(rawUrl)}`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.detail || data.error || 'Lỗi bóc tách');
            }

            renderResult(data.data);
            saveHistory(data.data);
        } catch (err) {
            showToast(err.message);
        } finally {
            extractBtn.disabled = false;
            if (extractBtnText) extractBtnText.innerText = 'Lấy Thông Tin';
            else extractBtn.innerText = 'Lấy Thông Tin';
        }
    }

    extractBtn.addEventListener('click', handleExtract);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleExtract();
    });

    // Populate Selectors and Controls
    function renderResult(item) {
        currentItem = item;
        thumbImg.src = item.thumbnail || '';
        videoTitle.innerText = item.title || 'YouTube Media';
        videoUploader.innerText = item.uploader || '';
        videoDuration.innerText = formatTime(item.duration);

        // 1. Populate Video Select (up to 4K)
        videoSelect.innerHTML = '';
        const videoList = item.videos || (item.video ? [item.video] : []);
        if (videoList.length > 0) {
            videoList.forEach((v, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                const sizeInfo = v.filesize_mb ? ` (~${v.filesize_mb})` : '';
                opt.innerText = `🎬 ${v.label} • ${v.format.toUpperCase()}${sizeInfo}`;
                videoSelect.appendChild(opt);
            });
            downloadVideoBtn.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            videoSelect.innerHTML = '<option>Không có luồng video</option>';
            downloadVideoBtn.classList.add('opacity-50', 'pointer-events-none');
        }

        // 2. Populate Audio Select
        audioSelect.innerHTML = '';
        const audioList = item.audios || (item.audio ? [item.audio] : []);
        if (audioList.length > 0) {
            audioList.forEach((a, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                const sizeInfo = a.filesize_mb ? ` (~${a.filesize_mb})` : '';
                opt.innerText = `🎵 ${a.label || a.format.toUpperCase()} ${sizeInfo}`;
                audioSelect.appendChild(opt);
            });
        }

        // 3. Dynamic Button Label Updates
        updateDownloadButtonLabels();

        // 4. Audio Player Load
        const defaultAudio = audioList[0] || item.audio;
        if (defaultAudio && defaultAudio.url) {
            audioPlayer.src = defaultAudio.url;
            audioPlayer.load();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            progressBar.value = 0;
        }

        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function updateDownloadButtonLabels() {
        if (!currentItem) return;
        const selectedVideo = currentItem.videos?.[videoSelect.value] || currentItem.video;
        if (selectedVideo) {
            const span = downloadVideoBtn.querySelector('span');
            if (span) span.innerText = `Tải Video (${selectedVideo.label})`;
        }
        const selectedAudio = currentItem.audios?.[audioSelect.value] || currentItem.audio;
        if (selectedAudio) {
            const span = downloadAudioBtn.querySelector('span');
            if (span) span.innerText = `Tải Audio (${selectedAudio.format.toUpperCase()} ${selectedAudio.quality})`;
        }
    }

    videoSelect.addEventListener('change', updateDownloadButtonLabels);
    audioSelect.addEventListener('change', updateDownloadButtonLabels);

    // Helper: Get Clean Filename
    function getCleanFilename(ext) {
        const title = (currentItem?.title || 'media').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 70);
        return `${title}.${ext}`;
    }

    // Download Video with Progress
    downloadVideoBtn.onclick = () => {
        if (!currentItem || !currentItem.videos) return;
        const selectedVideo = currentItem.videos[videoSelect.value] || currentItem.video;
        if (!selectedVideo || !selectedVideo.url) {
            showToast('Không tìm thấy link video!');
            return;
        }
        const filename = getCleanFilename(selectedVideo.format || 'mp4');
        downloadWithProgress(selectedVideo.url, filename, `Video ${selectedVideo.label}`);
    };

    // Download Audio with Progress
    downloadAudioBtn.onclick = () => {
        if (!currentItem) return;
        const selectedAudio = (currentItem.audios && currentItem.audios[audioSelect.value]) || currentItem.audio;
        if (!selectedAudio || !selectedAudio.url) {
            showToast('Không tìm thấy link audio!');
            return;
        }
        const filename = getCleanFilename(selectedAudio.format || 'm4a');
        downloadWithProgress(selectedAudio.url, filename, `Audio`);
    };

    // Direct Max-Speed Download (Băng thông tối đa mạng người dùng từ Google CDN)
    directFastBtn.onclick = () => {
        if (!currentItem) return;
        // Lấy video hoặc audio đang chọn
        const selectedVideo = (currentItem.videos && currentItem.videos[videoSelect.value]) || currentItem.video;
        const target = selectedVideo || currentItem.audio;
        if (!target || !target.url) {
            showToast('Không tìm thấy link tải!');
            return;
        }

        const cleanName = encodeURIComponent(getCleanFilename(target.format || 'mp4'));
        const directUrlWithTitle = target.url.includes('&title=') ? target.url : `${target.url}&title=${cleanName}`;

        const a = document.createElement('a');
        a.href = directUrlWithTitle;
        a.target = '_blank';
        a.download = getCleanFilename(target.format || 'mp4');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast('Đang tải tốc độ tối đa từ Google CDN!');
    };

    // Copy Current Stream URL
    copyUrlBtn.onclick = async () => {
        if (!currentItem) return;
        const selectedVideo = (currentItem.videos && currentItem.videos[videoSelect.value]) || currentItem.video;
        const urlToCopy = selectedVideo?.url || currentItem.audio?.url;
        if (urlToCopy) {
            await navigator.clipboard.writeText(urlToCopy);
            showToast('Đã copy stream URL!');
        }
    };

    // Download with Live Percentage Progress
    async function downloadWithProgress(streamUrl, filename, label) {
        if (isDownloading) {
            showToast('Đang có tiến trình tải, vui lòng chờ!');
            return;
        }

        isDownloading = true;
        progressContainer.classList.remove('hidden');
        progressBarEl.style.width = '0%';
        progressPercent.innerText = '0%';
        progressStatus.innerText = `Đang kết nối: ${label}...`;
        progressBytes.innerText = 'Bắt đầu luồng...';

        try {
            const proxyEndpoint = `${API_URL}/api/download?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(filename)}`;
            const response = await fetch(proxyEndpoint);

            if (!response.ok) throw new Error('Máy chủ không phản hồi stream');

            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

            const reader = response.body.getReader();
            const chunks = [];
            let receivedBytes = 0;
            let lastUpdate = Date.now();
            let lastBytes = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                // Cập nhật tốc độ & % mỗi 150ms
                const now = Date.now();
                if (now - lastUpdate > 150) {
                    const speed = ((receivedBytes - lastBytes) / (now - lastUpdate)) * 1000; // bytes/sec
                    const speedMb = (speed / (1024 * 1024)).toFixed(1);
                    document.getElementById('download-progress-speed').innerText = `${speedMb} MB/s`;

                    if (totalBytes > 0) {
                        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
                        progressBarEl.style.width = `${percent}%`;
                        progressPercent.innerText = `${percent}%`;
                        progressBytes.innerText = `${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}`;
                        progressStatus.innerText = `Đang tải: ${label} (${percent}%)`;
                    } else {
                        progressBytes.innerText = `${formatBytes(receivedBytes)}`;
                    }

                    lastUpdate = now;
                    lastBytes = receivedBytes;
                }
            }

            // Hoàn tất lưu file
            progressBarEl.style.width = '100%';
            progressPercent.innerText = '100%';
            progressStatus.innerText = 'Lưu file vào máy...';

            const blob = new Blob(chunks, { type: filename.endsWith('.mp4') ? 'video/mp4' : 'audio/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            progressStatus.innerText = 'Hoàn tất tải xuống!';
            showToast(`Tải ${label} thành công!`);

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
