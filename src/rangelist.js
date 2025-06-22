// 工具函数：获取 URL 参数
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
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

function createAppCard(app, rank) {
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
                <span class="stat-label">增长量</span>
                <span class="stat-value">${formatDownloadCount(app.delta)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">下载量</span>
                <span class="stat-value">${formatDownloadCount(app.currentDownCount)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">发布时间</span>
                <span class="stat-value">${formatDate(app.releaseDate)}</span>
            </div>
        </div>
    `;
    card.dataset.rank = rank;
    return card;
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

function renderAppsPage(apps, sortBy, page) {
    const appContainer = document.getElementById('appContainer');
    const comparator = getSortComparator(sortBy);
    const sortedApps = [...apps].sort(comparator);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageApps = sortedApps.slice(start, end);
    pageApps.forEach((app, idx) => {
        const card = createAppCard(app, start + idx + 1);
        appContainer.appendChild(card);
    });
    if (end >= sortedApps.length) {
        allLoaded = true;
    }
}

const rangeMap = {
    range0: '增长量为0',
    range1_100: '增长量1-100',
    range101_200: '增长量101-200',
    range201_500: '增长量201-500',
    range501_1000: '增长量501-1000',
    range1001_2000: '增长量1001-2000',
    range2001_5000: '增长量2001-5000',
    range5001_10000: '增长量5001-10000',
    range10001_20000: '增长量10001-20000',
    range20001_50000: '增长量20001-50000',
    range50001_100000: '增长量50001-100000',
    range100000_plus: '增长量100000以上'
};

document.addEventListener('DOMContentLoaded', async () => {
    const range = getQueryParam('range');
    const rangeTitleText = rangeMap[range] || range;
    document.getElementById('rangeTitle').textContent = `增长量范围：${rangeTitleText}`;
    document.title = `AppGallery ${rangeTitleText}增长量统计`;
    try {
        const res = await fetch(`data/statistics/${range}.json`);
        const json = await res.json();
        appsData = Array.isArray(json.list) ? json.list : [];
        // 首次加载第一页
        renderAppsPage(appsData, currentSort, currentPage);
    } catch (e) {
        document.getElementById('appContainer').innerHTML = '加载数据失败';
        allLoaded = true;
    }

    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sortBy = btn.getAttribute('data-sort');
            currentSort = sortBy;
            currentPage = 0;
            allLoaded = false;
            document.getElementById('appContainer').innerHTML = '';
            renderAppsPage(appsData, currentSort, currentPage);
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
        renderAppsPage(appsData, currentSort, currentPage);
        isLoading = false;
    }
}

window.addEventListener('scroll', tryLoadNextPage);
document.addEventListener('scroll', tryLoadNextPage);
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function checkAndLoad() {
        if (!allLoaded && (document.body.scrollHeight <= window.innerHeight + 10)) {
            currentPage++;
            renderAppsPage(appsData, currentSort, currentPage);
            setTimeout(checkAndLoad, 100);
        }
    }, 100);
});