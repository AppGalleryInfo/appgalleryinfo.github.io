// 工具函数：获取 URL 参数
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// 工具函数：将字节数转换为人类可读的文件大小格式
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 工具函数：将时间戳转换为本地化的日期时间字符串
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 工具函数：格式化下载数量，超过10000显示为"万"单位
function formatDownloadCount(count) {
    if (!count) return '0';
    const num = parseInt(count);
    if (isNaN(num)) return '0';
    if (num >= 10000) {
        return (num / 10000).toFixed(2) + '万';
    }
    return num.toString();
}

// 创建应用信息卡片DOM元素（复用 script.js 逻辑）
function createAppCard(app, rank) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <div class="app-header">
            <img src="${app.icon}" alt="${app.name}" class="app-icon">
            <div class="app-info">
                <h2 class="app-name">${app.name}<span class="app-rank">#<span>${rank}</span></span></h2>
                <p class="app-description">${app.editorDescLans && app.editorDescLans[0] ? app.editorDescLans[0].editorDesc : ''}</p>
                <p class="app-version">版本 ${app.version}</p>
            </div>
        </div>
        <div class="app-stats">
            <div class="stat-item">
                <span class="stat-label">大小</span>
                <span class="stat-value">${formatFileSize(app.size)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">下载量</span>
                <span class="stat-value">${formatDownloadCount(app.downCount)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">发布时间</span>
                <span class="stat-value">${formatDate(app.releaseDate)}</span>
            </div>
        </div>
        <div class="chart-container">
            <canvas id="chart-${app.pkgName}"></canvas>
        </div>
    `;
    card.dataset.pkgName = app.pkgName;
    return card;
}

// 创建应用历史图表（仅展示下载量变化，假设只有一条数据则为静态点）
function createChart(canvasId, app) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: [formatDate(app.releaseDate)],
            datasets: [{
                label: '下载量',
                data: [app.downCount],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                pointBackgroundColor: '#3b82f6',
                pointRadius: 5,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            return `下载量: ${context.formattedValue}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value >= 10000 ? (value / 10000).toFixed(1) + '万' : value;
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 4,
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
}

// 排序函数
function getSortComparator(sortBy) {
    return (a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name, 'zh-CN');
            case 'size':
                return b.size - a.size;
            case 'date':
                return new Date(b.releaseDate) - new Date(a.releaseDate);
            default: // downloads
                return b.downCount - a.downCount;
        }
    };
}

// 渲染应用卡片
function renderApps(apps, sortBy) {
    const appContainer = document.getElementById('appContainer');
    appContainer.innerHTML = '';
    const comparator = getSortComparator(sortBy);
    const sortedApps = [...apps].sort(comparator);
    sortedApps.forEach((app, idx) => {
        const card = createAppCard(app, idx + 1);
        appContainer.appendChild(card);
        setTimeout(() => {
            createChart(`chart-${app.pkgName}`, app);
        }, 0);
    });
}

// 主流程
let appsData = [];
let currentSort = 'downloads';

document.addEventListener('DOMContentLoaded', async () => {
    const category = getQueryParam('category');
    document.getElementById('categoryTitle').textContent = `分类：${category}`;
    try {
        // 加载分类下的应用列表
        const res = await fetch(`data/categories/${category}.json`);
        appsData = await res.json();
        renderApps(appsData, currentSort);
    } catch (e) {
        document.getElementById('appContainer').innerHTML = '加载分类数据失败';
    }

    // 排序按钮事件
    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sortBy = btn.getAttribute('data-sort');
            currentSort = sortBy;
            renderApps(appsData, currentSort);
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}); 