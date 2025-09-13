type TimelineEvent = {
  year: number;
  title: string;
  description: string;
  category: string;
  date: string; // e.g. "JAN 01 2004"
};

const timelineEvents: TimelineEvent[] = [
  { year: 2004, title: '誕生', description: '我來到這個世界，故事開始。', category: '學業', date: 'JAN 01 2004' },
  { year: 2023, title: '北上台北', description: '離鄉背井，踏上新大地，開啟挑戰。', category: '工作經歷', date: 'SEP 01 2023' },
  { year: 2025, title: '暑期實習', description: '加入 CAE 專案，探索永續校園與數位雙生。', category: '技術/學習', date: 'JUL 01 2025' },
];

function createTimelineEventHTML(event: TimelineEvent): string {
  const [mon, day, year] = event.date.split(' ');
  return `
    <div class="timeline-event">
      <div class="event-header">
        <div>
          <div class="timeline-year">${event.year}</div>
          <div class="timeline-title">${event.title}</div>
        </div>
      </div>
      <div class="timeline-description">${event.description}</div>
      <div class="event-date">
        <div class="day">${day}</div>
        <div>${mon} ${year}</div>
      </div>
      <div class="event-category">${event.category}</div>
    </div>
  `;
}

function renderTimeline(): void {
  const container = document.getElementById('timeline-events');
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...timelineEvents].sort((a, b) => a.year - b.year);
  sorted.forEach((ev) => container.insertAdjacentHTML('beforeend', createTimelineEventHTML(ev)));
  updateFilterCounts();
}

function updateFilterCounts(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
  const counts = timelineEvents.reduce<Record<string, number>>((acc, ev) => {
    acc.all = (acc.all || 0) + 1;
    acc[ev.category] = (acc[ev.category] || 0) + 1;
    return acc;
  }, { all: 0 });

  buttons.forEach((btn) => {
    const category = btn.getAttribute('data-category') || 'all';
    const span = btn.querySelector('.count');
    if (!span) return;
    span.textContent = String(category === 'all' ? counts.all : (counts[category] || 0));
  });
}

export function initTimeline(): void {
  renderTimeline();
}

