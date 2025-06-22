// 工具函数：获取 URL 参数
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDownloadCount(count) {
    if (!count) return '0';
    const num = parseInt(count);
    if (isNaN(num)) return '0';
    if (num >= 10000) {
        return (num / 10000).toFixed(2) + '万';
    }
    return num.toString();
}

function createAppCard(app, rank, showUpgradeMsg = false) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <div class="app-header">
            <img src="${app.icon}" alt="${app.name}" class="app-icon">
            <div class="app-info">
                <h2 class="app-name">${app.name}<span class="app-rank">#<span>${rank}</span></span></h2>
                <p class="app-description">${app.category || ''} | ${app.type || ''}</p>
            </div>
        </div>
        <div class="app-stats">
            <div class="stat-item">
                <span class="stat-label">下载量</span>
                <span class="stat-value">${formatDownloadCount(app.downCount)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">发布时间</span>
                <span class="stat-value">${formatDate(app.releaseDate)}</span>
            </div>
            ${showUpgradeMsg && app.upgradeMsg ? `
            <div class="stat-item upgrade-message-container">
                <span class="stat-label">更新内容</span>
                <span class="stat-value upgrade-message">${app.upgradeMsg}</span>
            </div>
            ` : ''}
        </div>
    `;
    card.dataset.rank = rank;
    return card;
}

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

function getSortComparator(sortBy) {
    return (a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name, 'zh-CN');
            case 'date':
                return new Date(b.releaseDate) - new Date(a.releaseDate);
            default:
                return b.downCount - a.downCount;
        }
    };
}

// 无限分页加载相关变量
const PAGE_SIZE = 15;
let appsData = [];
let currentSort = 'downloads';
let currentPage = 0;
let isLoading = false;
let allLoaded = false;

function renderAppsPage(apps, sortBy, page, showUpgradeMsg = false) {
    const appContainer = document.getElementById('appContainer');
    const comparator = getSortComparator(sortBy);
    const sortedApps = [...apps].sort(comparator);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageApps = sortedApps.slice(start, end);
    pageApps.forEach((app, idx) => {
        const card = createAppCard(app, start + idx + 1, showUpgradeMsg);
        appContainer.appendChild(card);
    });
    if (end >= sortedApps.length) {
        allLoaded = true;
    }
}

// 统计类型映射表
const statMap = {
    updatedYesterday: '昨日更新',
    updatedLast7Days: '近7天更新',
    updatedLast30Days: '近30天更新',
    notUpdatedTwoMonths: '超过2个月未更新',
    notUpdatedThreeMonths: '超过3个月未更新',
    notUpdatedFourMonths: '超过4个月未更新',
    notUpdatedFiveMonths: '超过5个月未更新',
    notUpdatedSixMonths: '超过6个月未更新',
    notUpdatedNineMonths: '超过9个月未更新',
    notUpdatedOneYear: '超过1年未更新'
};

document.addEventListener('DOMContentLoaded', async () => {
    const stat = getQueryParam('stat');
    const statTitleText = statMap[stat] || stat;
    document.getElementById('statTitle').textContent = `统计类型：${statTitleText}`;
    document.title = `AppGallery ${statTitleText}统计`;
    let showUpgradeMsg = stat === 'updatedYesterday';
    try {
        const res = await fetch(`data/statistics/${stat}.json`);
        const json = await res.json();
        appsData = Array.isArray(json.list) ? json.list : [];
        // 首次加载第一页
        renderAppsPage(appsData, currentSort, currentPage, showUpgradeMsg);
    } catch (e) {
        document.getElementById('appContainer').innerHTML = '加载统计数据失败';
        allLoaded = true;
    }

    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sortBy = btn.getAttribute('data-sort');
            currentSort = sortBy;
            currentPage = 0;
            allLoaded = false;
            document.getElementById('appContainer').innerHTML = '';
            renderAppsPage(appsData, currentSort, currentPage, showUpgradeMsg);
        });
    });
});

// 无限滚动加载
function tryLoadNextPage() {
    if (isLoading || allLoaded) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    const docHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
    );
    if (scrollTop + windowHeight >= docHeight - 200) {
        isLoading = true;
        currentPage++;
        const stat = getQueryParam('stat');
        const showUpgradeMsg = stat === 'updatedYesterday';
        renderAppsPage(appsData, currentSort, currentPage, showUpgradeMsg);
        isLoading = false;
    }
}

window.addEventListener('scroll', tryLoadNextPage);
document.addEventListener('scroll', tryLoadNextPage);
// 首次内容不足一屏时自动加载
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function checkAndLoad() {
        if (!allLoaded && (document.body.scrollHeight <= window.innerHeight + 10)) {
            currentPage++;
            renderAppsPage(appsData, currentSort, currentPage);
            setTimeout(checkAndLoad, 100); // 递归检查直到填满一屏或全部加载
        }
    }, 100);
});